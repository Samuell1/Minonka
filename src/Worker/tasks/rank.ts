import { AssetType, getAsset } from '$/lib/Assets';
import { background, center, column, div, img, row, text, textOutline } from '$/lib/Imaging/html';
import { Color } from '$/lib/Imaging/html/types';
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
        ranks.map((rank) => getAsset(AssetType.RANK, 'Rank=' + deCapitalize(rank.tier) + '.png'))
    );

    // Build the element tree
    const element = background(
        backgroundAsset!,
        { width: WIDTH, height: HEIGHT },
        // Profile section (left side)
        column(
            {
                width: PROFILE_WIDTH,
                height: HEIGHT,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10
            },
            // Region
            text(
                {
                    fontSize: 40,
                    color: Color.WHITE,
                    fontWeight: 700,
                    marginTop: 20
                },
                lang.regions[data.region]
            ),
            // Level badge container
            div(
                {
                    position: 'relative',
                    width: 100,
                    height: 100,
                    justifyContent: 'center',
                    alignItems: 'center'
                },
                img(levelAsset!, { width: 100, height: 100 }),
                div(
                    {
                        position: 'absolute',
                        width: 100,
                        height: 100,
                        justifyContent: 'center',
                        alignItems: 'center'
                    },
                    text(
                        {
                            fontSize: 40,
                            color: Color.WHITE,
                            fontWeight: 700
                        },
                        data.level.toString()
                    )
                )
            ),
            // Profile picture
            img(profileAsset!, {
                width: 360,
                height: 360,
                borderRadius: 180
            }),
            // Name
            text(
                {
                    fontSize: 50,
                    color: Color.WHITE,
                    fontWeight: 700,
                    marginTop: 20
                },
                data.gameName + '#' + data.tagLine
            )
        ),
        // Ranks section (right side)
        row(
            {
                width: WIDTH - PROFILE_WIDTH,
                height: HEIGHT,
                marginLeft: PROFILE_WIDTH,
                position: 'absolute',
                top: 0,
                left: 0
            },
            ...ranks.map((rank, i) => {
                const width = (WIDTH - PROFILE_WIDTH) / ranks.length;
                const wr = (rank.wins / (rank.wins + rank.losses)) * 100;

                return column(
                    {
                        width,
                        height: HEIGHT,
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        paddingTop: 40
                    },
                    // Queue type
                    text(
                        {
                            fontSize: 50,
                            color: Color.WHITE,
                            fontWeight: 700
                        },
                        lang.rank.queues[rank.queueType as keyof typeof lang.rank.queues]
                    ),
                    // Rank name
                    text(
                        {
                            fontSize: 50,
                            color: Color[rank.tier],
                            fontWeight: 700,
                            marginTop: 20
                        },
                        new Rank(rank).toString(lang)
                    ),
                    // Rank icon
                    img(rankIcons[i]!, {
                        width: 256,
                        height: 256,
                        marginTop: 20
                    }),
                    // LP
                    text(
                        {
                            fontSize: 50,
                            color: Color.WHITE,
                            fontWeight: 700,
                            marginTop: 10
                        },
                        rank.leaguePoints + ' LP'
                    ),
                    // Win rate
                    text(
                        {
                            fontSize: 50,
                            color: wr >= 50 ? Color.GREEN : Color.RED,
                            fontWeight: 700,
                            marginTop: 20
                        },
                        'WR: ' + wr.toFixed(2) + '%'
                    ),
                    // Wins
                    text(
                        {
                            fontSize: 50,
                            color: Color.GREEN,
                            fontWeight: 700,
                            marginTop: 20
                        },
                        lang.rank.wins + ' - ' + rank.wins
                    ),
                    // Losses
                    text(
                        {
                            fontSize: 50,
                            color: Color.RED,
                            fontWeight: 700
                        },
                        lang.rank.losses + ' - ' + rank.losses
                    )
                );
            })
        )
    );

    return saveHtml(element, { width: WIDTH, height: HEIGHT });
};
