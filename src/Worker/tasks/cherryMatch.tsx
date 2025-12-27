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
import { Background, Column, Box, Img, Row, Text, textOutline } from '$/lib/Imaging/html';
import { Color, ElementNode } from '$/lib/Imaging/html/types';
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
    const [
        backgroundAsset,
        itemBackgroundAsset,
        swordAsset,
        coinsAsset,
        augmentsData,
        summoners
    ] = await Promise.all([
        getAsset(AssetType.OTHER, 'background.png'),
        getAsset(AssetType.OTHER, 'itemBackground.png'),
        getAsset(AssetType.OTHER, 'sword.png'),
        getAsset(AssetType.OTHER, 'coins.png'),
        getAugments(riotLocale),
        getSummonerSpells(riotLocale)
    ]);

    const teamPosition = getArenaSubTeamPosition(data, data.myPuuid);

    // Organize players into teams
    const teams: CherryMatchData['info']['participants'][] = Array.from({
        length: 8
    }).map(() => []);
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
    const loadPlayerAssets = async (
        player: CherryMatchData['info']['participants'][number]
    ) => {
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
            getAsset(
                AssetType.DDRAGON_CHAMPION,
                fixChampName(player.championName) + '.png'
            ),
            getAsset(AssetType.DDRAGON_SPELL, spell1.image.full),
            getAsset(AssetType.DDRAGON_SPELL, spell2.image.full),
            ...augmentIds.map(async (augId) => {
                const augmentData = augmentsData!.augments.find(
                    (aug) => aug.id === augId
                );
                if (!augmentData) return null;
                return getAsset(
                    AssetType.COMMUNITY_DDRAGON,
                    `game/${augmentData.iconLarge}`
                );
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
    const TEAM_ROW_WIDTH = (WIDTH - 300) / 2;
    const TEAM_ICON_WIDTH = 100;
    const TEAM_GAP = 10;
    const PLAYERS_COLUMN_WIDTH = TEAM_ROW_WIDTH - TEAM_ICON_WIDTH - TEAM_GAP;
    const PLAYER_GAP = 6;
    const CHAMPION_WIDTH = 55;
    const NAME_WIDTH = 120;
    const AUGS_SUMMS_WIDTH = AUG_SIZE * 3 + 4 + 4 + 32; // augments + gap + summs
    const ITEMS_COLUMN_WIDTH =
        PLAYERS_COLUMN_WIDTH -
        CHAMPION_WIDTH -
        NAME_WIDTH -
        AUGS_SUMMS_WIDTH -
        PLAYER_GAP * 3;

    // Render a player row
    const renderPlayer = (
        assets: Awaited<ReturnType<typeof loadPlayerAssets>>,
        isRightSide: boolean,
        isHighlighted: boolean
    ): ElementNode => {
        const { player, championImg, spell1Img, spell2Img, augmentImgs, itemImgs } =
            assets;
        const nameColor = isHighlighted ? Color.YELLOW : Color.WHITE;

        return (
            <Row
                style={{
                    width: PLAYERS_COLUMN_WIDTH,
                    alignItems: 'center',
                    flexDirection: isRightSide ? 'row-reverse' : 'row',
                    gap: PLAYER_GAP,
                    height: 70
                }}
            >
                {/* Champion + Level */}
                <Box style={{ position: 'relative', width: CHAMPION_WIDTH, height: 65 }}>
                    <Img
                        src={championImg!}
                        width={CHAMPION_WIDTH}
                        height={CHAMPION_WIDTH}
                        style={{ borderRadius: 6 }}
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
                                fontSize: 16,
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
                        alignItems: isRightSide ? 'flex-end' : 'flex-start'
                    }}
                >
                    <Text style={{ fontSize: 16, color: nameColor, fontWeight: 700 }}>
                        {player.riotIdGameName.toLowerCase()}
                    </Text>
                    <Text style={{ fontSize: 12, color: nameColor, fontWeight: 400 }}>
                        {'#' + player.riotIdTagline}
                    </Text>
                    <Text style={{ fontSize: 16, color: Color.WHITE, fontWeight: 700 }}>
                        {`${player.kills}/${player.deaths}/${player.assists}`}
                    </Text>
                </Column>
                {/* Augments (3x2 grid) + Summs */}
                <Row
                    style={{
                        width: AUGS_SUMMS_WIDTH,
                        gap: 4,
                        flexDirection: isRightSide ? 'row-reverse' : 'row'
                    }}
                >
                    {/* Augments */}
                    <Box
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            width: AUG_SIZE * 3 + 4,
                            gap: 2
                        }}
                    >
                        {augmentImgs.map((augImg) => (
                            <Box
                                style={{
                                    position: 'relative',
                                    width: AUG_SIZE,
                                    height: AUG_SIZE
                                }}
                            >
                                <Img
                                    src={itemBackgroundAsset!}
                                    width={AUG_SIZE}
                                    height={AUG_SIZE}
                                />
                                {augImg && (
                                    <Box
                                        style={{ position: 'absolute', top: 2, left: 2 }}
                                    >
                                        <Img
                                            src={augImg}
                                            width={AUG_SIZE - 4}
                                            height={AUG_SIZE - 4}
                                        />
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </Box>
                    {/* Summoner spells */}
                    <Column style={{ gap: 2 }}>
                        <Img src={spell1Img!} width={32} height={32} />
                        <Img src={spell2Img!} width={32} height={32} />
                    </Column>
                </Row>
                {/* Items + Stats */}
                <Column style={{ width: ITEMS_COLUMN_WIDTH, gap: 2 }}>
                    {/* Items */}
                    <Row
                        style={{
                            gap: 2,
                            flexDirection: isRightSide ? 'row-reverse' : 'row'
                        }}
                    >
                        {itemImgs.map((itemImg, i) => (
                            <Box
                                style={{
                                    position: 'relative',
                                    width: ITEM_SIZE,
                                    height: ITEM_SIZE
                                }}
                            >
                                <Img
                                    src={itemBackgroundAsset!}
                                    width={ITEM_SIZE}
                                    height={ITEM_SIZE}
                                />
                                {itemImg && (
                                    <Box
                                        style={{ position: 'absolute', top: 2, left: 2 }}
                                    >
                                        <Img
                                            src={itemImg}
                                            width={ITEM_SIZE - 4}
                                            height={ITEM_SIZE - 4}
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
                                                fontSize: 14,
                                                color: Color.WHITE,
                                                fontWeight: 700,
                                                ...textOutline()
                                            }}
                                        >
                                            {player.visionScore}
                                        </Text>
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </Row>
                    {/* Stats */}
                    <Row
                        style={{
                            gap: 10,
                            flexDirection: isRightSide ? 'row-reverse' : 'row'
                        }}
                    >
                        <Row style={{ gap: 3, alignItems: 'center' }}>
                            <Img src={swordAsset!} width={18} height={18} />
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: Color.WHITE,
                                    fontWeight: 700
                                }}
                            >
                                {intl.format(player.totalDamageDealt)}
                            </Text>
                        </Row>
                        <Row style={{ gap: 3, alignItems: 'center' }}>
                            <Img src={coinsAsset!} width={18} height={18} />
                            <Text
                                style={{
                                    fontSize: 14,
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

    // Render a team block
    const renderTeam = (
        teamIdx: number,
        teamIcon: Buffer | null,
        assets: Awaited<ReturnType<typeof loadPlayerAssets>>[],
        isRightSide: boolean
    ): ElementNode | null => {
        if (assets.length === 0 || !teamIcon) return null;

        const team = teams[teamIdx];
        const teamType = TeamIdToName(team[0].playerSubteamId);
        const teamId = MapSubTeamToName(teamType);
        const isMyTeam = team.some((p) => p.puuid === data.myPuuid);
        const teamColor = isMyTeam ? Color.YELLOW : Color.WHITE;

        return (
            <Row
                style={{
                    width: TEAM_ROW_WIDTH,
                    padding: 10,
                    gap: TEAM_GAP,
                    flexDirection: isRightSide ? 'row-reverse' : 'row'
                }}
            >
                {/* Team icon and info */}
                <Column
                    style={{
                        width: TEAM_ICON_WIDTH,
                        alignItems: 'center',
                        gap: 3
                    }}
                >
                    <Img src={teamIcon} width={60} height={60} />
                    <Text
                        style={{
                            fontSize: 20,
                            color: teamColor,
                            fontWeight: 700,
                            ...textOutline()
                        }}
                    >
                        {`${teamIdx + 1}.`}
                    </Text>
                    <Text
                        style={{
                            fontSize: 16,
                            color: teamColor,
                            fontWeight: 700,
                            ...textOutline()
                        }}
                    >
                        {lang.match.team}
                    </Text>
                    <Text
                        style={{
                            fontSize: 14,
                            color: teamColor,
                            fontWeight: 700,
                            ...textOutline()
                        }}
                    >
                        {lang.match.subTeam[teamId]}
                    </Text>
                </Column>
                {/* Players */}
                <Column style={{ width: PLAYERS_COLUMN_WIDTH, gap: 5 }}>
                    {assets.map((asset) =>
                        renderPlayer(
                            asset,
                            isRightSide,
                            asset.player.puuid === data.myPuuid
                        )
                    )}
                </Column>
            </Row>
        );
    };

    // Layout constants
    const PADDING = 20;
    const HEADER_HEIGHT = 130;
    const FOOTER_HEIGHT = 40;
    const TEAMS_HEIGHT = HEIGHT - PADDING * 2 - HEADER_HEIGHT - FOOTER_HEIGHT;

    // Build element
    const element = (
        <Background src={backgroundAsset!} width={WIDTH} height={HEIGHT}>
            <Column
                style={{
                    width: WIDTH,
                    height: HEIGHT,
                    padding: PADDING
                }}
            >
                {/* Center stats */}
                <Row
                    style={{
                        width: WIDTH - PADDING * 2,
                        height: HEADER_HEIGHT,
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 30
                    }}
                >
                    <Column style={{ alignItems: 'center', gap: 5 }}>
                        <Text
                            style={{
                                fontSize: 60,
                                color: teamPosition < 5 ? Color.GREEN : Color.RED,
                                fontWeight: 700
                            }}
                        >
                            {`${teamPosition}. ${lang.match.place}`}
                        </Text>
                        <Text
                            style={{ fontSize: 30, color: Color.WHITE, fontWeight: 700 }}
                        >
                            {lang.queues[data.info.queueId]}
                        </Text>
                        <Text
                            style={{ fontSize: 30, color: Color.WHITE, fontWeight: 700 }}
                        >
                            {toMMSS(data.info.gameDuration)}
                        </Text>
                    </Column>
                </Row>
                {/* Teams layout: 4 on left, 4 on right */}
                <Row
                    style={{
                        width: WIDTH - PADDING * 2,
                        height: TEAMS_HEIGHT
                    }}
                >
                    {/* Left 4 teams */}
                    <Column
                        style={{
                            width: (WIDTH - PADDING * 2) / 2,
                            height: TEAMS_HEIGHT,
                            gap: 5
                        }}
                    >
                        {teams
                            .slice(0, 4)
                            .map((_, i) =>
                                renderTeam(i, teamIcons[i], teamAssets[i], false)
                            )}
                    </Column>
                    {/* Right 4 teams */}
                    <Column
                        style={{
                            width: (WIDTH - PADDING * 2) / 2,
                            height: TEAMS_HEIGHT,
                            gap: 5
                        }}
                    >
                        {teams
                            .slice(4, 8)
                            .map((_, i) =>
                                renderTeam(
                                    i + 4,
                                    teamIcons[i + 4],
                                    teamAssets[i + 4],
                                    true
                                )
                            )}
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
                    <Text style={{ fontSize: 24, color: Color.WHITE, fontWeight: 400 }}>
                        {new Date(data.info.gameEndTimestamp).toLocaleString()}
                    </Text>
                </Box>
            </Column>
        </Background>
    );

    return savePersistantHtml(element, { width: WIDTH, height: HEIGHT }, imageName);
};
