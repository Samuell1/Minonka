import { AssetType, getAsset } from '$/lib/Assets';
import { Background, Column, Box, Img, Row, Text } from '$/lib/Imaging/html';
import { Color, ElementNode } from '$/lib/Imaging/html/types';
import { _Tier, _Rank, deCapitalize, Rank } from '$/lib/Riot/types';
import { getLocale } from '$/lib/langs';
import { saveHtml } from '../utilities';
import { DefaultParameters } from '../types';

export type RankData = {
    ranks: {
        queueType: string;
        wins: number;
        losses: number;
        tier: _Tier;
        rank: _Rank;
        leaguePoints: number;
    }[];
} & DefaultParameters;

const Sort = {
    RANKED_SOLO_5x5: 0,
    RANKED_FLEX_SR: 1
};

// Image dimensions
const WIDTH = 1600;
const HEIGHT = 750;
const PROFILE_WIDTH = 800;

export default async (data: RankData) => {
    const lang = getLocale(data.locale);

    // Load assets
    const [backgroundAsset, levelAsset, profileAsset] = await Promise.all([
        getAsset(AssetType.OTHER, 'background.png'),
        getAsset(AssetType.OTHER, 'level.png'),
        getAsset(AssetType.DDRAGON_PROFILEICON, data.profileIconId + '.png')
    ]);

    // Sort ranks
    const ranks = data.ranks.sort((a, b) => {
        return (
            Sort[a.queueType as keyof typeof Sort] -
            Sort[b.queueType as keyof typeof Sort]
        );
    });

    // Load rank icons
    const rankIcons = await Promise.all(
        ranks.map((rank) =>
            getAsset(AssetType.RANK, 'Rank=' + deCapitalize(rank.tier) + '.png')
        )
    );

    // Build the element tree
    const element = (
        <Background src={backgroundAsset!} width={WIDTH} height={HEIGHT}>
            {/* Profile section (left side) */}
            <Column
                style={{
                    width: PROFILE_WIDTH,
                    height: HEIGHT,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10
                }}
            >
                {/* Region */}
                <Text
                    style={{
                        fontSize: 40,
                        color: Color.WHITE,
                        fontWeight: 700,
                        marginTop: 20
                    }}
                >
                    {lang.regions[data.region]}
                </Text>
                {/* Level badge container */}
                <Box
                    style={{
                        position: 'relative',
                        width: 100,
                        height: 100,
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <Img src={levelAsset!} width={100} height={100} />
                    <Box
                        style={{
                            position: 'absolute',
                            width: 100,
                            height: 100,
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 40,
                                color: Color.WHITE,
                                fontWeight: 700
                            }}
                        >
                            {data.level.toString()}
                        </Text>
                    </Box>
                </Box>
                {/* Profile picture */}
                <Img
                    src={profileAsset!}
                    width={360}
                    height={360}
                    style={{ borderRadius: 180 }}
                />
                {/* Name */}
                <Text
                    style={{
                        fontSize: 50,
                        color: Color.WHITE,
                        fontWeight: 700,
                        marginTop: 20
                    }}
                >
                    {data.gameName + '#' + data.tagLine}
                </Text>
            </Column>
            {/* Ranks section (right side) */}
            <Row
                style={{
                    width: WIDTH - PROFILE_WIDTH,
                    height: HEIGHT,
                    marginLeft: PROFILE_WIDTH,
                    position: 'absolute',
                    top: 0,
                    left: 0
                }}
            >
                {ranks.map((rank, i) => {
                    const width = (WIDTH - PROFILE_WIDTH) / ranks.length;
                    const wr = (rank.wins / (rank.wins + rank.losses)) * 100;

                    return (
                        <Column
                            style={{
                                width,
                                height: HEIGHT,
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                paddingTop: 40
                            }}
                        >
                            {/* Queue type */}
                            <Text
                                style={{
                                    fontSize: 50,
                                    color: Color.WHITE,
                                    fontWeight: 700
                                }}
                            >
                                {
                                    lang.rank.queues[
                                        rank.queueType as keyof typeof lang.rank.queues
                                    ]
                                }
                            </Text>
                            {/* Rank name */}
                            <Text
                                style={{
                                    fontSize: 50,
                                    color: Color[rank.tier],
                                    fontWeight: 700,
                                    marginTop: 20
                                }}
                            >
                                {new Rank(rank).toString(lang)}
                            </Text>
                            {/* Rank icon */}
                            <Img
                                src={rankIcons[i]!}
                                width={256}
                                height={256}
                                style={{ marginTop: 20 }}
                            />
                            {/* LP */}
                            <Text
                                style={{
                                    fontSize: 50,
                                    color: Color.WHITE,
                                    fontWeight: 700,
                                    marginTop: 10
                                }}
                            >
                                {rank.leaguePoints + ' LP'}
                            </Text>
                            {/* Win rate */}
                            <Text
                                style={{
                                    fontSize: 50,
                                    color: wr >= 50 ? Color.GREEN : Color.RED,
                                    fontWeight: 700,
                                    marginTop: 20
                                }}
                            >
                                {'WR: ' + wr.toFixed(2) + '%'}
                            </Text>
                            {/* Wins */}
                            <Text
                                style={{
                                    fontSize: 50,
                                    color: Color.GREEN,
                                    fontWeight: 700,
                                    marginTop: 20
                                }}
                            >
                                {lang.rank.wins + ' - ' + rank.wins}
                            </Text>
                            {/* Losses */}
                            <Text
                                style={{
                                    fontSize: 50,
                                    color: Color.RED,
                                    fontWeight: 700
                                }}
                            >
                                {lang.rank.losses + ' - ' + rank.losses}
                            </Text>
                        </Column>
                    );
                })}
            </Row>
        </Background>
    ) as ElementNode;

    return saveHtml(element, { width: WIDTH, height: HEIGHT });
};
