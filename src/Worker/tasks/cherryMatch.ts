import {
    AssetType,
    getAsset,
    getAugments,
    getRiotLanguageFromDiscordLocale,
    getSummonerSpells
} from '$/lib/Assets';
import { CherryMatchSchema } from '$/lib/Riot/schemes';
import { Region } from '$/lib/Riot/types';
import { Locale } from 'discord.js';
import { z } from 'zod';
import {
    fixChampName,
    getPersistant,
    persistantExists,
    savePersistantHtml,
    toMMSS
} from '../utilities';
import { background, column, div, img, row, text, textOutline } from '$/lib/Imaging/html';
import { Color } from '$/lib/Imaging/html/types';
import { getLocale } from '$/lib/langs';
import { getArenaSubTeamPosition } from '$/lib/Riot/utilities';

export type CherryMatchData = {
    region: Region;
    locale: Locale;
    myPuuid: string;
} & z.infer<typeof CherryMatchSchema>;

export enum SubTeam {
    Poro,
    Minion,
    Scuttle,
    Krug,
    Raptor,
    Sentinel,
    Wolf,
    Gromp
}

const TeamIdToName = (id: number) => {
    switch (id) {
        case 1:
            return SubTeam.Poro;
        case 2:
            return SubTeam.Minion;
        case 3:
            return SubTeam.Scuttle;
        case 4:
            return SubTeam.Krug;
        case 5:
            return SubTeam.Raptor;
        case 6:
            return SubTeam.Sentinel;
        case 7:
            return SubTeam.Wolf;
        case 8:
            return SubTeam.Gromp;
    }

    return SubTeam.Poro;
};

export const subTeamMap = {
    [SubTeam.Poro]: 'poros',
    [SubTeam.Minion]: 'minions',
    [SubTeam.Scuttle]: 'scuttles',
    [SubTeam.Krug]: 'krugs',
    [SubTeam.Raptor]: 'raptors',
    [SubTeam.Sentinel]: 'sentinel',
    [SubTeam.Wolf]: 'wolves',
    [SubTeam.Gromp]: 'gromp'
} as const;

const MapSubTeamToName = (subteam: SubTeam) => {
    return subTeamMap[subteam];
};

const WIDTH = 1600;
const HEIGHT = 750;

export default async (data: CherryMatchData) => {
    const imageName = `${data.metadata.matchId}_${data.myPuuid}_${data.locale}.png`;

    if (await persistantExists(imageName)) {
        return getPersistant(imageName);
    }

    const lang = getLocale(data.locale);
    const riotLocale = getRiotLanguageFromDiscordLocale(data.locale);

    // Load assets
    const [backgroundAsset, itemBackgroundAsset, swordAsset, coinsAsset, augmentsData, summoners] =
        await Promise.all([
            getAsset(AssetType.OTHER, 'background.png'),
            getAsset(AssetType.OTHER, 'itemBackground.png'),
            getAsset(AssetType.OTHER, 'sword.png'),
            getAsset(AssetType.OTHER, 'coins.png'),
            getAugments(riotLocale),
            getSummonerSpells(riotLocale)
        ]);

    const teamPosition = getArenaSubTeamPosition(data, data.myPuuid);

    // Organize players into teams
    const teams: CherryMatchData['info']['participants'][] = Array.from({ length: 8 }).map(
        () => []
    );
    for (const participant of data.info.participants) {
        teams[participant.playerSubteamId - 1].push(participant);
    }

    // Sort teams by placement
    teams.sort((a, b) => {
        if (a.length === 0) return 1;
        if (b.length === 0) return -1;
        return a[0].subteamPlacement - b[0].subteamPlacement;
    });

    // Load team icons
    const teamIcons = await Promise.all(
        teams.map(async (team) => {
            if (team.length === 0) return null;
            const teamType = TeamIdToName(team[0].playerSubteamId);
            const teamId = MapSubTeamToName(teamType);
            return getAsset(
                AssetType.COMMUNITY_DDRAGON,
                `game/assets/ux/cherry/teamicons/team${teamId}.png`
            );
        })
    );

    // Load player assets for all teams
    const loadPlayerAssets = async (player: CherryMatchData['info']['participants'][number]) => {
        const spell1 = Object.values(summoners!.data).find(
            (s) => s.key === player.summoner1Id
        )!;
        const spell2 = Object.values(summoners!.data).find(
            (s) => s.key === player.summoner2Id
        )!;

        const augmentIds = [
            player.playerAugment1,
            player.playerAugment2,
            player.playerAugment3,
            player.playerAugment4,
            player.playerAugment5,
            player.playerAugment6
        ];

        const [championImg, spell1Img, spell2Img, ...augmentImgs] = await Promise.all([
            getAsset(AssetType.DDRAGON_CHAMPION, fixChampName(player.championName) + '.png'),
            getAsset(AssetType.DDRAGON_SPELL, spell1.image.full),
            getAsset(AssetType.DDRAGON_SPELL, spell2.image.full),
            ...augmentIds.map(async (augId) => {
                const augmentData = augmentsData!.augments.find((aug) => aug.id === augId);
                if (!augmentData) return null;
                return getAsset(AssetType.COMMUNITY_DDRAGON, `game/${augmentData.iconLarge}`);
            })
        ]);

        const itemImgs = await Promise.all(
            ([0, 1, 2, 3, 4, 5, 6] as const).map((i) =>
                player[`item${i}`] === 0
                    ? null
                    : getAsset(AssetType.DDRAGON_ITEM, player[`item${i}`] + '.png')
            )
        );

        return {
            player,
            championImg,
            spell1Img,
            spell2Img,
            augmentImgs,
            itemImgs
        };
    };

    const teamAssets = await Promise.all(
        teams.map((team) => Promise.all(team.map(loadPlayerAssets)))
    );

    const intl = new Intl.NumberFormat('cs-cz');
    const ITEM_SIZE = 38;
    const AUG_SIZE = 32;

    // Render a player row
    const renderPlayer = (
        assets: Awaited<ReturnType<typeof loadPlayerAssets>>,
        isRightSide: boolean,
        isHighlighted: boolean
    ) => {
        const { player, championImg, spell1Img, spell2Img, augmentImgs, itemImgs } = assets;
        const nameColor = isHighlighted ? Color.YELLOW : Color.WHITE;

        return row(
            {
                alignItems: 'center',
                flexDirection: isRightSide ? 'row-reverse' : 'row',
                gap: 6,
                height: 70
            },
            // Champion + Level
            div(
                { position: 'relative', width: 55, height: 65 },
                img(championImg!, { width: 55, height: 55, borderRadius: 6 }),
                div(
                    {
                        position: 'absolute',
                        bottom: 0,
                        width: 55,
                        justifyContent: 'center'
                    },
                    text(
                        {
                            fontSize: 16,
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
                    width: 120,
                    alignItems: isRightSide ? 'flex-end' : 'flex-start'
                },
                text(
                    { fontSize: 16, color: nameColor, fontWeight: 700 },
                    player.riotIdGameName.toLowerCase()
                ),
                text(
                    { fontSize: 12, color: nameColor, fontWeight: 400 },
                    '#' + player.riotIdTagline
                ),
                text(
                    { fontSize: 16, color: Color.WHITE, fontWeight: 700 },
                    `${player.kills}/${player.deaths}/${player.assists}`
                )
            ),
            // Augments (3x2 grid) + Summs
            row(
                { gap: 4, flexDirection: isRightSide ? 'row-reverse' : 'row' },
                // Augments
                div(
                    {
                        display: 'flex',
                        flexWrap: 'wrap',
                        width: AUG_SIZE * 3 + 4,
                        gap: 2
                    },
                    ...augmentImgs.map((augImg) =>
                        div(
                            { position: 'relative', width: AUG_SIZE, height: AUG_SIZE },
                            img(itemBackgroundAsset!, { width: AUG_SIZE, height: AUG_SIZE }),
                            augImg
                                ? div(
                                      { position: 'absolute', top: 2, left: 2 },
                                      img(augImg, {
                                          width: AUG_SIZE - 4,
                                          height: AUG_SIZE - 4
                                      })
                                  )
                                : null
                        )
                    )
                ),
                // Summoner spells
                column(
                    { gap: 2 },
                    img(spell1Img!, { width: 32, height: 32 }),
                    img(spell2Img!, { width: 32, height: 32 })
                )
            ),
            // Items + Stats
            column(
                { gap: 2, flex: 1 },
                // Items
                row(
                    { gap: 2, flexDirection: isRightSide ? 'row-reverse' : 'row' },
                    ...itemImgs.map((itemImg, i) =>
                        div(
                            { position: 'relative', width: ITEM_SIZE, height: ITEM_SIZE },
                            img(itemBackgroundAsset!, { width: ITEM_SIZE, height: ITEM_SIZE }),
                            itemImg
                                ? div(
                                      { position: 'absolute', top: 2, left: 2 },
                                      img(itemImg, {
                                          width: ITEM_SIZE - 4,
                                          height: ITEM_SIZE - 4
                                      })
                                  )
                                : null,
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
                                              fontSize: 14,
                                              color: Color.WHITE,
                                              fontWeight: 700,
                                              ...textOutline()
                                          },
                                          player.visionScore
                                      )
                                  )
                                : null
                        )
                    )
                ),
                // Stats
                row(
                    { gap: 10, flexDirection: isRightSide ? 'row-reverse' : 'row' },
                    row(
                        { gap: 3, alignItems: 'center' },
                        img(swordAsset!, { width: 18, height: 18 }),
                        text(
                            { fontSize: 14, color: Color.WHITE, fontWeight: 700 },
                            intl.format(player.totalDamageDealt)
                        )
                    ),
                    row(
                        { gap: 3, alignItems: 'center' },
                        img(coinsAsset!, { width: 18, height: 18 }),
                        text(
                            { fontSize: 14, color: Color.WHITE, fontWeight: 700 },
                            intl.format(player.goldEarned)
                        )
                    )
                )
            )
        );
    };

    // Render a team block
    const renderTeam = (
        teamIdx: number,
        teamIcon: Buffer | null,
        assets: Awaited<ReturnType<typeof loadPlayerAssets>>[],
        isRightSide: boolean
    ) => {
        if (assets.length === 0 || !teamIcon) return null;

        const team = teams[teamIdx];
        const teamType = TeamIdToName(team[0].playerSubteamId);
        const teamId = MapSubTeamToName(teamType);
        const isMyTeam = team.some((p) => p.puuid === data.myPuuid);
        const teamColor = isMyTeam ? Color.YELLOW : Color.WHITE;

        return row(
            {
                width: (WIDTH - 300) / 2,
                padding: 10,
                gap: 10,
                flexDirection: isRightSide ? 'row-reverse' : 'row'
            },
            // Team icon and info
            column(
                {
                    width: 100,
                    alignItems: 'center',
                    gap: 3
                },
                img(teamIcon, { width: 60, height: 60 }),
                text(
                    {
                        fontSize: 20,
                        color: teamColor,
                        fontWeight: 700,
                        ...textOutline()
                    },
                    `${teamIdx + 1}.`
                ),
                text(
                    { fontSize: 16, color: teamColor, fontWeight: 700, ...textOutline() },
                    lang.match.team
                ),
                text(
                    { fontSize: 14, color: teamColor, fontWeight: 700, ...textOutline() },
                    lang.match.subTeam[teamId]
                )
            ),
            // Players
            column(
                { flex: 1, gap: 5 },
                ...assets.map((asset) =>
                    renderPlayer(asset, isRightSide, asset.player.puuid === data.myPuuid)
                )
            )
        );
    };

    // Build element
    const element = background(
        backgroundAsset!,
        { width: WIDTH, height: HEIGHT },
        column(
            {
                width: WIDTH,
                height: HEIGHT,
                padding: 20
            },
            // Center stats
            row(
                {
                    width: WIDTH - 40,
                    justifyContent: 'center',
                    gap: 30
                },
                column(
                    { alignItems: 'center', gap: 5 },
                    text(
                        {
                            fontSize: 60,
                            color: teamPosition < 5 ? Color.GREEN : Color.RED,
                            fontWeight: 700
                        },
                        `${teamPosition}. ${lang.match.place}`
                    ),
                    text(
                        { fontSize: 30, color: Color.WHITE, fontWeight: 700 },
                        lang.queues[data.info.queueId]
                    ),
                    text(
                        { fontSize: 30, color: Color.WHITE, fontWeight: 700 },
                        toMMSS(data.info.gameDuration)
                    )
                )
            ),
            // Teams layout: 4 on left, 4 on right
            row(
                {
                    width: WIDTH - 40,
                    flex: 1,
                    marginTop: 10
                },
                // Left 4 teams
                column(
                    { width: (WIDTH - 40) / 2, gap: 5 },
                    ...teams
                        .slice(0, 4)
                        .map((_, i) => renderTeam(i, teamIcons[i], teamAssets[i], false))
                ),
                // Right 4 teams
                column(
                    { width: (WIDTH - 40) / 2, gap: 5 },
                    ...teams
                        .slice(4, 8)
                        .map((_, i) => renderTeam(i + 4, teamIcons[i + 4], teamAssets[i + 4], true))
                )
            ),
            // Date footer
            div(
                {
                    width: WIDTH - 40,
                    justifyContent: 'center',
                    marginTop: 5
                },
                text(
                    { fontSize: 24, color: Color.WHITE, fontWeight: 400 },
                    new Date(data.info.gameEndTimestamp).toLocaleString()
                )
            )
        )
    );

    return savePersistantHtml(element, { width: WIDTH, height: HEIGHT }, imageName);
};
