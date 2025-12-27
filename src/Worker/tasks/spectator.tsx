import { z } from 'zod';
import { DefaultParameters } from '../types';
import { SpectatorSchema } from '$/lib/Riot/schemes';
import { getLocale } from '$/lib/langs';
import {
    AssetType,
    getAsset,
    getMaps,
    getRiotLanguageFromDiscordLocale,
    getRunesReforged,
    getSummonerSpells
} from '$/lib/Assets';
import {
    fixChampName,
    getRune,
    getRuneTree,
    spectatorPerksNormalize,
    toMMSS,
    saveHtml
} from '../utilities';
import { Background, Column, Img, Row, Text, textOutline } from '$/lib/Imaging/html';
import { Color, ElementNode } from '$/lib/Imaging/html/types';
import { getChampionsMap } from '$/lib/utilities';

export type SpectatorData = {
    queueId: number;
    gameLength: number;
    mapId: number;
    participants: z.infer<typeof SpectatorSchema>['participants'];
} & DefaultParameters;

const WIDTH = 1600;
const HEIGHT = 750;

export default async (data: SpectatorData) => {
    const lang = getLocale(data.locale);
    const riotLocale = getRiotLanguageFromDiscordLocale(data.locale);

    // Load assets
    const [backgroundAsset, maps, runesReforged, summoners, champions] =
        await Promise.all([
            getAsset(AssetType.OTHER, 'background.png'),
            getMaps(riotLocale),
            getRunesReforged(riotLocale),
            getSummonerSpells(riotLocale),
            getChampionsMap(riotLocale)
        ]);

    const map = maps!.data[data.mapId.toString()];

    // Separate players by team
    const team1 = data.participants.filter((p) => p.teamId === 100);
    const team2 = data.participants.filter((p) => p.teamId === 200);

    // Load all assets for players
    const loadPlayerAssets = async (player: SpectatorData['participants'][number]) => {
        const normalized = spectatorPerksNormalize(player.perks);
        const perkPlayer = { perks: normalized };
        const tree = getRuneTree(runesReforged!, perkPlayer, 0);
        const mainRune = getRune(tree, perkPlayer, 0, 0);
        const secondaryTree = getRuneTree(runesReforged!, perkPlayer, 1);

        const [championImg, primaryRuneImg, secondaryRuneImg, spell1Img, spell2Img] =
            await Promise.all([
                getAsset(
                    AssetType.DDRAGON_CHAMPION,
                    fixChampName(champions!.get(player.championId)!.id) + '.png'
                ),
                getAsset(AssetType.DDRAGON_IMG, mainRune.icon),
                getAsset(AssetType.DDRAGON_IMG, secondaryTree.icon),
                getAsset(
                    AssetType.DDRAGON_SPELL,
                    Object.values(summoners!.data).find((s) => s.key === player.spell1Id)!
                        .image.full
                ),
                getAsset(
                    AssetType.DDRAGON_SPELL,
                    Object.values(summoners!.data).find((s) => s.key === player.spell2Id)!
                        .image.full
                )
            ]);

        return {
            player,
            championImg,
            primaryRuneImg,
            secondaryRuneImg,
            spell1Img,
            spell2Img
        };
    };

    const [team1Assets, team2Assets] = await Promise.all([
        Promise.all(team1.map(loadPlayerAssets)),
        Promise.all(team2.map(loadPlayerAssets))
    ]);

    const PLAYER_HEIGHT = 100;
    const ICON_SIZE = 80;
    const RUNE_SIZE = 45;
    const SPELL_SIZE = 40;
    const PLAYER_ROW_WIDTH = WIDTH / 2 - 60;
    const PLAYER_GAP = 10;
    const RUNES_COLUMN_WIDTH = RUNE_SIZE + 5 + SPELL_SIZE; // 90
    const NAME_COLUMN_WIDTH =
        PLAYER_ROW_WIDTH - ICON_SIZE - RUNES_COLUMN_WIDTH - PLAYER_GAP * 2;

    // Render a player row
    const renderPlayer = (
        assets: Awaited<ReturnType<typeof loadPlayerAssets>>,
        isRightTeam: boolean,
        isHighlighted: boolean
    ): ElementNode => {
        const {
            player,
            championImg,
            primaryRuneImg,
            secondaryRuneImg,
            spell1Img,
            spell2Img
        } = assets;
        const [riotIdGameName, riotIdTagline] = player.riotId.split('#');

        const nameColor = isHighlighted ? Color.YELLOW : Color.WHITE;

        return (
            <Row
                style={{
                    width: PLAYER_ROW_WIDTH,
                    height: PLAYER_HEIGHT,
                    alignItems: 'center',
                    flexDirection: isRightTeam ? 'row-reverse' : 'row',
                    gap: PLAYER_GAP
                }}
            >
                {/* Champion icon */}
                <Img
                    src={championImg!}
                    width={ICON_SIZE}
                    height={ICON_SIZE}
                    style={{ borderRadius: 10 }}
                />
                {/* Runes and Summs */}
                <Column style={{ width: RUNES_COLUMN_WIDTH, gap: 5 }}>
                    <Row style={{ gap: 5 }}>
                        <Img src={primaryRuneImg!} width={RUNE_SIZE} height={RUNE_SIZE} />
                        <Img src={spell1Img!} width={SPELL_SIZE} height={SPELL_SIZE} />
                    </Row>
                    <Row style={{ gap: 5 }}>
                        <Img
                            src={secondaryRuneImg!}
                            width={RUNE_SIZE - 10}
                            height={RUNE_SIZE - 10}
                        />
                        <Img src={spell2Img!} width={SPELL_SIZE} height={SPELL_SIZE} />
                    </Row>
                </Column>
                {/* Player name */}
                <Column
                    style={{
                        width: NAME_COLUMN_WIDTH,
                        alignItems: isRightTeam ? 'flex-end' : 'flex-start'
                    }}
                >
                    <Text
                        style={{
                            fontSize: 28,
                            color: nameColor,
                            fontWeight: 700,
                            ...textOutline()
                        }}
                    >
                        {riotIdGameName.toLowerCase()}
                    </Text>
                    <Text
                        style={{
                            fontSize: 18,
                            color: nameColor,
                            fontWeight: 400,
                            ...textOutline()
                        }}
                    >
                        {'#' + riotIdTagline}
                    </Text>
                </Column>
            </Row>
        );
    };

    // Layout constants
    const PADDING = 40;
    const HEADER_HEIGHT = 100;
    const TEAMS_HEIGHT = HEIGHT - PADDING * 2 - HEADER_HEIGHT;

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
                {/* Header */}
                <Row
                    style={{
                        width: WIDTH - PADDING * 2,
                        height: HEADER_HEIGHT,
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    {/* Queue name (left) */}
                    <Text
                        style={{
                            fontSize: 50,
                            color: Color.WHITE,
                            fontWeight: 700,
                            ...textOutline()
                        }}
                    >
                        {lang.queues[data.queueId as keyof typeof lang.queues]}
                    </Text>
                    {/* Time (center) */}
                    <Text
                        style={{
                            fontSize: 70,
                            color: Color.WHITE,
                            fontWeight: 700,
                            ...textOutline()
                        }}
                    >
                        {toMMSS(data.gameLength)}
                    </Text>
                    {/* Map name (right) */}
                    <Text
                        style={{
                            fontSize: 50,
                            color: Color.WHITE,
                            fontWeight: 700,
                            ...textOutline()
                        }}
                    >
                        {map.MapName}
                    </Text>
                </Row>
                {/* Teams */}
                <Row
                    style={{
                        width: WIDTH - PADDING * 2,
                        height: TEAMS_HEIGHT,
                        gap: 40
                    }}
                >
                    {/* Team 1 (Blue) */}
                    <Column
                        style={{
                            width: (WIDTH - PADDING * 2 - 40) / 2,
                            height: TEAMS_HEIGHT,
                            justifyContent: 'space-between'
                        }}
                    >
                        {team1Assets.map((assets) =>
                            renderPlayer(
                                assets,
                                false,
                                assets.player.puuid === data.puuid
                            )
                        )}
                    </Column>
                    {/* Team 2 (Red) */}
                    <Column
                        style={{
                            width: (WIDTH - PADDING * 2 - 40) / 2,
                            height: TEAMS_HEIGHT,
                            justifyContent: 'space-between'
                        }}
                    >
                        {team2Assets.map((assets) =>
                            renderPlayer(assets, true, assets.player.puuid === data.puuid)
                        )}
                    </Column>
                </Row>
            </Column>
        </Background>
    );

    return saveHtml(element, { width: WIDTH, height: HEIGHT });
};
