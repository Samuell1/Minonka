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
import { Background, Column, Row, Box, Text, Img, textOutline } from '$/lib/Imaging/html';
import { Color, type ElementNode } from '$/lib/Imaging/html/types';
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

// Layout constants
const PADDING = 30;
const HEADER_HEIGHT = 180;
const FOOTER_HEIGHT = 50;
const TEAMS_HEIGHT = HEIGHT - PADDING * 2 - HEADER_HEIGHT - FOOTER_HEIGHT;
const TEAM_WIDTH = (WIDTH - PADDING * 2 - 30) / 2;
const PLAYER_ROW_GAP = 8;
const CHAMPION_WIDTH = 70;
const NAME_WIDTH = 160;
const RUNES_WIDTH = 78;
const ITEMS_WIDTH =
    TEAM_WIDTH - PLAYER_ROW_GAP * 3 - CHAMPION_WIDTH - NAME_WIDTH - RUNES_WIDTH;
const ITEM_SIZE = 55;
const ITEM_GAP = 4;

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

    const intl = new Intl.NumberFormat('cs-cz');

    // JSX Component: Items Row
    const ItemsRow = ({
        itemImgs,
        visionScore,
        reverse
    }: {
        itemImgs: (Buffer | null)[];
        visionScore: number;
        reverse: boolean;
    }): ElementNode => (
        <Row style={{ gap: ITEM_GAP, flexDirection: reverse ? 'row-reverse' : 'row' }}>
            {itemImgs.map((itemImg, i) => (
                <Box
                    style={{ position: 'relative', width: ITEM_SIZE, height: ITEM_SIZE }}
                >
                    <Img
                        src={itemBackgroundAsset!}
                        width={ITEM_SIZE}
                        height={ITEM_SIZE}
                    />
                    {itemImg && (
                        <Box style={{ position: 'absolute', top: 3, left: 3 }}>
                            <Img
                                src={itemImg}
                                width={ITEM_SIZE - 6}
                                height={ITEM_SIZE - 6}
                            />
                        </Box>
                    )}
                    {i === 6 && itemImg && (
                        <Box
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: ITEM_SIZE,
                                height: ITEM_SIZE,
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 22,
                                    color: Color.WHITE,
                                    fontWeight: 700,
                                    ...textOutline()
                                }}
                            >
                                {visionScore}
                            </Text>
                        </Box>
                    )}
                </Box>
            ))}
        </Row>
    );

    // JSX Component: Player Row
    const PlayerRow = ({
        assets,
        isRightTeam,
        isHighlighted
    }: {
        assets: Awaited<ReturnType<typeof loadPlayerAssets>>;
        isRightTeam: boolean;
        isHighlighted: boolean;
    }): ElementNode => {
        const {
            player,
            championImg,
            primaryRuneImg,
            secondaryRuneImg,
            spell1Img,
            spell2Img
        } = assets;
        const nameColor = isHighlighted ? Color.YELLOW : Color.WHITE;

        return (
            <Row
                style={{
                    width: TEAM_WIDTH,
                    alignItems: 'center',
                    flexDirection: isRightTeam ? 'row-reverse' : 'row',
                    gap: PLAYER_ROW_GAP,
                    height: 95
                }}
            >
                {/* Champion + Level */}
                <Box style={{ position: 'relative', width: CHAMPION_WIDTH, height: 90 }}>
                    <Img
                        src={championImg!}
                        width={CHAMPION_WIDTH}
                        height={CHAMPION_WIDTH}
                        style={{ borderRadius: 8 }}
                    />
                    <Box
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            width: CHAMPION_WIDTH,
                            justifyContent: 'center'
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 20,
                                color: Color.WHITE,
                                fontWeight: 700,
                                ...textOutline()
                            }}
                        >
                            {player.champLevel}
                        </Text>
                    </Box>
                </Box>

                {/* Name + KDA */}
                <Column
                    style={{
                        width: NAME_WIDTH,
                        alignItems: isRightTeam ? 'flex-end' : 'flex-start'
                    }}
                >
                    <Text style={{ fontSize: 22, color: nameColor, fontWeight: 700 }}>
                        {player.riotIdGameName.toLowerCase()}
                    </Text>
                    <Text style={{ fontSize: 14, color: nameColor, fontWeight: 400 }}>
                        #{player.riotIdTagline}
                    </Text>
                    <Text style={{ fontSize: 22, color: Color.WHITE, fontWeight: 700 }}>
                        {player.kills}/{player.deaths}/{player.assists}
                    </Text>
                </Column>

                {/* Runes + Summs */}
                <Column style={{ width: RUNES_WIDTH, gap: 3 }}>
                    <Row style={{ gap: 3 }}>
                        <Img src={primaryRuneImg!} width={40} height={40} />
                        <Img src={spell1Img!} width={35} height={35} />
                    </Row>
                    <Row style={{ gap: 3 }}>
                        <Img src={secondaryRuneImg!} width={30} height={30} />
                        <Img src={spell2Img!} width={35} height={35} />
                    </Row>
                </Column>

                {/* Items + Stats */}
                <Column style={{ width: ITEMS_WIDTH, gap: 3 }}>
                    <ItemsRow
                        itemImgs={assets.itemImgs}
                        visionScore={player.visionScore}
                        reverse={isRightTeam}
                    />
                    <Row
                        style={{
                            gap: 15,
                            flexDirection: isRightTeam ? 'row-reverse' : 'row'
                        }}
                    >
                        <Row style={{ gap: 3, alignItems: 'center' }}>
                            <Img src={minionAsset!} width={24} height={24} />
                            <Text
                                style={{
                                    fontSize: 18,
                                    color: Color.WHITE,
                                    fontWeight: 700
                                }}
                            >
                                {player.totalMinionsKilled}
                            </Text>
                        </Row>
                        <Row style={{ gap: 3, alignItems: 'center' }}>
                            <Img src={swordAsset!} width={24} height={24} />
                            <Text
                                style={{
                                    fontSize: 18,
                                    color: Color.WHITE,
                                    fontWeight: 700
                                }}
                            >
                                {intl.format(player.totalDamageDealt)}
                            </Text>
                        </Row>
                        <Row style={{ gap: 3, alignItems: 'center' }}>
                            <Img src={coinsAsset!} width={24} height={24} />
                            <Text
                                style={{
                                    fontSize: 18,
                                    color: Color.WHITE,
                                    fontWeight: 700
                                }}
                            >
                                {intl.format(player.goldEarned)}
                            </Text>
                        </Row>
                    </Row>
                </Column>
            </Row>
        );
    };

    // JSX Component: Bans Row
    const BansRow = ({
        banAssets,
        reverse
    }: {
        banAssets: (Buffer | null)[];
        reverse: boolean;
    }): ElementNode => (
        <Row style={{ gap: 8, flexDirection: reverse ? 'row-reverse' : 'row' }}>
            {banAssets.map((banImg) => (
                <Box style={{ position: 'relative', width: 55, height: 55 }}>
                    {banImg && (
                        <Img
                            src={banImg}
                            width={55}
                            height={55}
                            style={{ borderRadius: 8 }}
                        />
                    )}
                    <Img
                        src={banXAsset!}
                        width={55}
                        height={55}
                        style={{ position: 'absolute', top: 0 }}
                    />
                </Box>
            ))}
        </Row>
    );

    // Build main element using JSX
    const element = (
        <Background src={backgroundAsset!} width={WIDTH} height={HEIGHT}>
            <Column style={{ width: WIDTH, height: HEIGHT, padding: PADDING }}>
                {/* Header: Bans - Stats - Bans */}
                <Row
                    style={{
                        width: WIDTH - PADDING * 2,
                        height: HEADER_HEIGHT,
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <BansRow banAssets={team1Bans} reverse={true} />

                    {/* Stats */}
                    <Column style={{ alignItems: 'center', gap: 5 }}>
                        <Text
                            style={{
                                fontSize: 70,
                                color:
                                    matchStatus === MatchStatus.Win
                                        ? Color.GREEN
                                        : matchStatus === MatchStatus.Loss
                                          ? Color.RED
                                          : Color.GRAY,
                                fontWeight: 700
                            }}
                        >
                            {lang.match.results[matchStatus]}
                        </Text>
                        <Text
                            style={{ fontSize: 35, color: Color.WHITE, fontWeight: 700 }}
                        >
                            {lang.queues[data.info.queueId]}
                        </Text>
                        <Text
                            style={{ fontSize: 35, color: Color.WHITE, fontWeight: 700 }}
                        >
                            {toMMSS(data.info.gameDuration)}
                        </Text>
                        {lpGain !== null && (
                            <Text
                                style={{
                                    fontSize: 35,
                                    color: lpGain > 0 ? Color.GREEN : Color.RED,
                                    fontWeight: 700
                                }}
                            >
                                {lpGain} LP
                            </Text>
                        )}
                    </Column>

                    <BansRow banAssets={team2Bans} reverse={false} />
                </Row>

                {/* Teams */}
                <Row
                    style={{ width: WIDTH - PADDING * 2, height: TEAMS_HEIGHT, gap: 30 }}
                >
                    {/* Team 1 */}
                    <Column
                        style={{
                            width: TEAM_WIDTH,
                            height: TEAMS_HEIGHT,
                            justifyContent: 'space-between'
                        }}
                    >
                        {team1Assets.map((assets) => (
                            <PlayerRow
                                assets={assets}
                                isRightTeam={false}
                                isHighlighted={assets.player.puuid === data.myPuuid}
                            />
                        ))}
                    </Column>

                    {/* Team 2 */}
                    <Column
                        style={{
                            width: TEAM_WIDTH,
                            height: TEAMS_HEIGHT,
                            justifyContent: 'space-between'
                        }}
                    >
                        {team2Assets.map((assets) => (
                            <PlayerRow
                                assets={assets}
                                isRightTeam={true}
                                isHighlighted={assets.player.puuid === data.myPuuid}
                            />
                        ))}
                    </Column>
                </Row>

                {/* Date footer */}
                <Box
                    style={{
                        width: WIDTH - PADDING * 2,
                        height: FOOTER_HEIGHT,
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <Text style={{ fontSize: 28, color: Color.WHITE, fontWeight: 400 }}>
                        {new Date(data.info.gameEndTimestamp).toLocaleString()}
                    </Text>
                </Box>
            </Column>
        </Background>
    );

    return savePersistantHtml(element, { width: WIDTH, height: HEIGHT }, imageName);
};
