import {
    AssetType,
    getAsset,
    getRiotLanguageFromDiscordLocale,
    getRunesReforged,
    getSummonerSpells
} from '$/lib/Assets';
import { RegularMatchSchema } from '$/lib/Riot/schemes';
import { Region } from '$/lib/Riot/types';
import { Locale } from 'discord.js';
import { z } from 'zod';
import {
    fixChampName,
    getPersistant,
    getRune,
    getRuneTree,
    persistantExists,
    savePersistantHtml,
    toMMSS
} from '../utilities';
import { background, column, div, img, row, text, textOutline } from '$/lib/Imaging/html';
import { Color } from '$/lib/Imaging/html/types';
import { getLocale } from '$/lib/langs';
import { getMatchStatus, MatchStatus } from '$/lib/Riot/utilities';
import { conn } from '$/types/connection';
import api from '$/lib/Riot/api';
import { updateLpForUser } from '$/crons/lp';
import { getChampionsMap } from '$/lib/utilities';

export type MatchData = {
    region: Region;
    locale: Locale;
    myPuuid: string;
} & z.infer<typeof RegularMatchSchema>;

const WIDTH = 1600;
const HEIGHT = 750;

export default async (data: MatchData) => {
    const imageName = `${data.metadata.matchId}_${data.myPuuid}_${data.locale}.png`;

    if (await persistantExists(imageName)) {
        return getPersistant(imageName);
    }

    const lang = getLocale(data.locale);
    const riotLocale = getRiotLanguageFromDiscordLocale(data.locale);

    // Load assets
    const [
        backgroundAsset,
        banXAsset,
        itemBackgroundAsset,
        minionAsset,
        swordAsset,
        coinsAsset,
        runesReforged,
        summoners,
        champions
    ] = await Promise.all([
        getAsset(AssetType.OTHER, 'background.png'),
        getAsset(AssetType.OTHER, 'ban-x.png'),
        getAsset(AssetType.OTHER, 'itemBackground.png'),
        getAsset(AssetType.OTHER, 'minion.png'),
        getAsset(AssetType.OTHER, 'sword.png'),
        getAsset(AssetType.OTHER, 'coins.png'),
        getRunesReforged(riotLocale),
        getSummonerSpells(riotLocale),
        getChampionsMap(riotLocale)
    ]);

    const matchStatus = getMatchStatus(data, data.myPuuid);

    // Calculate LP gain for ranked matches
    let lpGain: number | null = null;
    if (data.info.queueId === 420 || data.info.queueId === 440) {
        const lp = await conn
            .selectFrom('match_lp')
            .innerJoin('account', 'account.id', 'match_lp.accountId')
            .selectAll()
            .where((eb) =>
                eb.and([
                    eb('matchId', '=', data.metadata.matchId),
                    eb('account.puuid', '=', data.myPuuid)
                ])
            )
            .executeTakeFirst();

        if (lp) {
            lpGain = lp.gain;
        } else {
            const lastMatch = await api[data.region].match.ids(
                data.info.participants.find((p) => p.puuid === data.myPuuid)!.puuid,
                { start: 0, count: 1, queue: data.info.queueId.toString() }
            );

            if (lastMatch.status && lastMatch.data[0] === data.metadata.matchId) {
                const userData = await conn
                    .selectFrom('account')
                    .selectAll()
                    .where('puuid', '=', data.myPuuid)
                    .executeTakeFirst();
                if (userData) {
                    await updateLpForUser({
                        id: userData.id,
                        region: userData.region,
                        puuid: userData.puuid,
                        gameName: userData.gameName,
                        tagLine: userData.tagLine
                    });

                    const lpAfter = await conn
                        .selectFrom('match_lp')
                        .selectAll()
                        .where((eb) =>
                            eb.and([
                                eb('matchId', '=', data.metadata.matchId),
                                eb('accountId', '=', userData.id)
                            ])
                        )
                        .executeTakeFirst();
                    if (lpAfter) {
                        lpGain = lpAfter.gain;
                    }
                }
            }
        }
    }

    // Load bans for each team
    const team1 = data.info.teams.find((t) => t.teamId === 100)!;
    const team2 = data.info.teams.find((t) => t.teamId === 200)!;

    const loadBanAssets = async (bans: typeof team1.bans) => {
        return Promise.all(
            bans.map(async (ban) => {
                const champion = champions!.get(ban.championId!);
                return champion
                    ? getAsset(
                          AssetType.DDRAGON_CHAMPION,
                          fixChampName(champion.id) + '.png'
                      )
                    : getAsset(AssetType.DDRAGON_PROFILEICON, '29.png');
            })
        );
    };

    const [team1Bans, team2Bans] = await Promise.all([
        loadBanAssets(team1.bans),
        loadBanAssets(team2.bans)
    ]);

    // Load player assets
    const team1Players = data.info.participants.filter((p) => p.teamId === 100);
    const team2Players = data.info.participants.filter((p) => p.teamId === 200);

    const loadPlayerAssets = async (player: (typeof data.info.participants)[number]) => {
        const tree = getRuneTree(runesReforged!, player, 0);
        const mainRune = getRune(tree, player, 0, 0);
        const secondaryTree = getRuneTree(runesReforged!, player, 1);

        const spell1 = Object.values(summoners!.data).find(
            (s) => s.key === player.summoner1Id
        )!;
        const spell2 = Object.values(summoners!.data).find(
            (s) => s.key === player.summoner2Id
        )!;

        const [
            championImg,
            primaryRuneImg,
            secondaryRuneImg,
            spell1Img,
            spell2Img,
            ...itemImgs
        ] = await Promise.all([
            getAsset(
                AssetType.DDRAGON_CHAMPION,
                fixChampName(player.championName) + '.png'
            ),
            getAsset(AssetType.DDRAGON_IMG, mainRune.icon),
            getAsset(AssetType.DDRAGON_IMG, secondaryTree.icon),
            getAsset(AssetType.DDRAGON_SPELL, spell1.image.full),
            getAsset(AssetType.DDRAGON_SPELL, spell2.image.full),
            ...([0, 1, 2, 3, 4, 5, 6] as const).map((i) =>
                player[`item${i}`] === 0
                    ? null
                    : getAsset(AssetType.DDRAGON_ITEM, player[`item${i}`] + '.png')
            )
        ]);

        return {
            player,
            championImg,
            primaryRuneImg,
            secondaryRuneImg,
            spell1Img,
            spell2Img,
            itemImgs
        };
    };

    const [team1Assets, team2Assets] = await Promise.all([
        Promise.all(team1Players.map(loadPlayerAssets)),
        Promise.all(team2Players.map(loadPlayerAssets))
    ]);

    const ITEM_SIZE = 55;
    const ITEM_GAP = 4;
    const intl = new Intl.NumberFormat('cs-cz');

    // Render items row
    const renderItems = (
        itemImgs: (Buffer | null)[],
        visionScore: number,
        reverse: boolean
    ) => {
        return row(
            {
                gap: ITEM_GAP,
                flexDirection: reverse ? 'row-reverse' : 'row'
            },
            ...itemImgs.map((itemImg, i) =>
                div(
                    {
                        position: 'relative',
                        width: ITEM_SIZE,
                        height: ITEM_SIZE
                    },
                    img(itemBackgroundAsset!, { width: ITEM_SIZE, height: ITEM_SIZE }),
                    itemImg
                        ? div(
                              { position: 'absolute', top: 3, left: 3 },
                              img(itemImg, {
                                  width: ITEM_SIZE - 6,
                                  height: ITEM_SIZE - 6
                              })
                          )
                        : null,
                    // Vision score on ward slot
                    i === 6 && itemImg
                        ? div(
                              {
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: ITEM_SIZE,
                                  height: ITEM_SIZE,
                                  justifyContent: 'center',
                                  alignItems: 'center'
                              },
                              text(
                                  {
                                      fontSize: 22,
                                      color: Color.WHITE,
                                      fontWeight: 700,
                                      ...textOutline()
                                  },
                                  visionScore
                              )
                          )
                        : null
                )
            )
        );
    };

    // Render player row
    const renderPlayer = (
        assets: Awaited<ReturnType<typeof loadPlayerAssets>>,
        isRightTeam: boolean,
        isHighlighted: boolean
    ) => {
        const {
            player,
            championImg,
            primaryRuneImg,
            secondaryRuneImg,
            spell1Img,
            spell2Img
        } = assets;
        const nameColor = isHighlighted ? Color.YELLOW : Color.WHITE;

        return row(
            {
                alignItems: 'center',
                flexDirection: isRightTeam ? 'row-reverse' : 'row',
                gap: 8,
                height: 95
            },
            // Champion + Level
            div(
                { position: 'relative', width: 70, height: 90 },
                img(championImg!, { width: 70, height: 70, borderRadius: 8 }),
                div(
                    {
                        position: 'absolute',
                        bottom: 0,
                        width: 70,
                        justifyContent: 'center'
                    },
                    text(
                        {
                            fontSize: 20,
                            color: Color.WHITE,
                            fontWeight: 700,
                            ...textOutline()
                        },
                        player.champLevel
                    )
                )
            ),
            // Name + KDA
            column(
                {
                    width: 160,
                    alignItems: isRightTeam ? 'flex-end' : 'flex-start'
                },
                text(
                    { fontSize: 22, color: nameColor, fontWeight: 700 },
                    player.riotIdGameName.toLowerCase()
                ),
                text(
                    { fontSize: 14, color: nameColor, fontWeight: 400 },
                    '#' + player.riotIdTagline
                ),
                text(
                    { fontSize: 22, color: Color.WHITE, fontWeight: 700 },
                    `${player.kills}/${player.deaths}/${player.assists}`
                )
            ),
            // Runes + Summs
            column(
                { gap: 3 },
                row(
                    { gap: 3 },
                    img(primaryRuneImg!, { width: 40, height: 40 }),
                    img(spell1Img!, { width: 35, height: 35 })
                ),
                row(
                    { gap: 3 },
                    img(secondaryRuneImg!, { width: 30, height: 30 }),
                    img(spell2Img!, { width: 35, height: 35 })
                )
            ),
            // Items + Stats
            column(
                { gap: 3, flex: 1 },
                renderItems(assets.itemImgs, player.visionScore, isRightTeam),
                row(
                    {
                        gap: 15,
                        flexDirection: isRightTeam ? 'row-reverse' : 'row'
                    },
                    row(
                        { gap: 3, alignItems: 'center' },
                        img(minionAsset!, { width: 24, height: 24 }),
                        text(
                            { fontSize: 18, color: Color.WHITE, fontWeight: 700 },
                            player.totalMinionsKilled
                        )
                    ),
                    row(
                        { gap: 3, alignItems: 'center' },
                        img(swordAsset!, { width: 24, height: 24 }),
                        text(
                            { fontSize: 18, color: Color.WHITE, fontWeight: 700 },
                            intl.format(player.totalDamageDealt)
                        )
                    ),
                    row(
                        { gap: 3, alignItems: 'center' },
                        img(coinsAsset!, { width: 24, height: 24 }),
                        text(
                            { fontSize: 18, color: Color.WHITE, fontWeight: 700 },
                            intl.format(player.goldEarned)
                        )
                    )
                )
            )
        );
    };

    // Render bans
    const renderBans = (banAssets: (Buffer | null)[], reverse: boolean) => {
        return row(
            {
                gap: 8,
                flexDirection: reverse ? 'row-reverse' : 'row'
            },
            ...banAssets.map((banImg) =>
                div(
                    { position: 'relative', width: 55, height: 55 },
                    banImg
                        ? img(banImg, { width: 55, height: 55, borderRadius: 8 })
                        : null,
                    img(banXAsset!, {
                        width: 55,
                        height: 55,
                        position: 'absolute',
                        top: 0
                    })
                )
            )
        );
    };

    // Layout constants
    const PADDING = 30;
    const HEADER_HEIGHT = 180;
    const FOOTER_HEIGHT = 50;
    const TEAMS_HEIGHT = HEIGHT - PADDING * 2 - HEADER_HEIGHT - FOOTER_HEIGHT;

    // Build element
    const element = background(
        backgroundAsset!,
        { width: WIDTH, height: HEIGHT },
        column(
            {
                width: WIDTH,
                height: HEIGHT,
                padding: PADDING
            },
            // Header: Bans - Stats - Bans
            row(
                {
                    width: WIDTH - PADDING * 2,
                    height: HEADER_HEIGHT,
                    justifyContent: 'space-between',
                    alignItems: 'center'
                },
                // Team 1 bans (reversed to show from right)
                renderBans(team1Bans, true),
                // Stats
                column(
                    {
                        alignItems: 'center',
                        gap: 5
                    },
                    text(
                        {
                            fontSize: 70,
                            color:
                                matchStatus === MatchStatus.Win
                                    ? Color.GREEN
                                    : matchStatus === MatchStatus.Loss
                                      ? Color.RED
                                      : Color.GRAY,
                            fontWeight: 700
                        },
                        lang.match.results[matchStatus]
                    ),
                    text(
                        { fontSize: 35, color: Color.WHITE, fontWeight: 700 },
                        lang.queues[data.info.queueId]
                    ),
                    text(
                        { fontSize: 35, color: Color.WHITE, fontWeight: 700 },
                        toMMSS(data.info.gameDuration)
                    ),
                    lpGain !== null
                        ? text(
                              {
                                  fontSize: 35,
                                  color: lpGain > 0 ? Color.GREEN : Color.RED,
                                  fontWeight: 700
                              },
                              `${lpGain} LP`
                          )
                        : null
                ),
                // Team 2 bans
                renderBans(team2Bans, false)
            ),
            // Teams
            row(
                {
                    width: WIDTH - PADDING * 2,
                    height: TEAMS_HEIGHT,
                    gap: 30
                },
                // Team 1
                column(
                    {
                        width: (WIDTH - PADDING * 2 - 30) / 2,
                        height: TEAMS_HEIGHT,
                        justifyContent: 'space-between'
                    },
                    ...team1Assets.map((assets) =>
                        renderPlayer(assets, false, assets.player.puuid === data.myPuuid)
                    )
                ),
                // Team 2
                column(
                    {
                        width: (WIDTH - PADDING * 2 - 30) / 2,
                        height: TEAMS_HEIGHT,
                        justifyContent: 'space-between'
                    },
                    ...team2Assets.map((assets) =>
                        renderPlayer(assets, true, assets.player.puuid === data.myPuuid)
                    )
                )
            ),
            // Date footer
            div(
                {
                    width: WIDTH - PADDING * 2,
                    height: FOOTER_HEIGHT,
                    justifyContent: 'center',
                    alignItems: 'center'
                },
                text(
                    { fontSize: 28, color: Color.WHITE, fontWeight: 400 },
                    new Date(data.info.gameEndTimestamp).toLocaleString()
                )
            )
        )
    );

    return savePersistantHtml(element, { width: WIDTH, height: HEIGHT }, imageName);
};
