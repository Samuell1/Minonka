import {
    AssetType,
    getAsset,
    getAssetPath,
    getChallenges,
    getRiotLanguageFromDiscordLocale
} from '$/lib/Assets';
import { background, center, column, div, img, row, text } from '$/lib/Imaging/html';
import { Color } from '$/lib/Imaging/html/types';
import { getLocale, replacePlaceholders } from '$/lib/langs';
import { Rank } from '$/lib/Riot/types';
import { ChallengeData } from '$/lib/Riot/schemes';
import { getHighestRank } from '$/lib/utilities';
import { saveHtml } from '../utilities';
import { DefaultParameters } from '../types';
import fs from 'node:fs/promises';
import sharp from 'sharp';

export type SummonerData = {
    titleId?: string;
    crest: number;
    prestigeCrest: number;
    banner: number;
    challenges: number[];
    userChallenges: ChallengeData['challenges'];
} & DefaultParameters;

export default async (data: SummonerData) => {
    const banners = await fs.readdir(await getAssetPath(AssetType.BANNER, ''));
    const lang = getLocale(data.locale);

    let highestRank;
    if (
        data.crest === 2 ||
        (data.crest == 1 && data.prestigeCrest == 0) ||
        data.banner === 2
    ) {
        highestRank = new Rank(await getHighestRank(data.puuid, data.region, lang));
    }

    // Load banner
    let bannerAsset: Buffer<ArrayBufferLike>;
    if (data.banner == 2) {
        const asset = await getAsset(
            AssetType.BANNER,
            highestRank!.getTier().toLowerCase() + '_banner.png'
        );
        bannerAsset = asset ?? (await getAsset(AssetType.BANNER, '1_unranked_banner.png'))!;
    } else {
        const bannerName = banners.find((b) => b.split('_')[0] === data.banner.toString())!;
        bannerAsset = bannerName
            ? (await getAsset(AssetType.BANNER, bannerName))!
            : (await getAsset(AssetType.BANNER, '1_unranked_banner.png'))!;
    }

    // Get banner dimensions
    const bannerMeta = await sharp(bannerAsset).metadata();
    const WIDTH = bannerMeta.width ?? 272;
    const HEIGHT = bannerMeta.height ?? 528;

    // Load other assets
    const [levelAsset, profileAsset] = await Promise.all([
        getAsset(AssetType.OTHER, 'level.png'),
        getAsset(AssetType.DDRAGON_PROFILEICON, data.profileIconId + '.png')
    ]);

    // Load crest
    let crestAsset: Buffer | null = null;
    let showDivision = false;
    if (data.crest === 2 || (data.crest == 1 && data.prestigeCrest == 0)) {
        crestAsset = await getAsset(
            AssetType.CREST,
            `${highestRank!.getTier().toLowerCase()}_base.png`
        );
        showDivision = highestRank!.isTiered();
    } else {
        crestAsset = await getAsset(
            AssetType.CREST,
            `prestige_crest_lvl_${data.prestigeCrest.toString().padStart(3, '0')}.png`
        );
    }

    // Load title
    let titleText: string | null = null;
    if (data.titleId !== undefined && !isNaN(parseInt(data.titleId))) {
        const lolLang = getRiotLanguageFromDiscordLocale(data.locale);
        const challenges = await getChallenges(lolLang);

        if (!challenges) {
            throw new Error(replacePlaceholders(lang.assets.error, lang.assets.challenges));
        }

        const challengeId = parseInt(data.titleId.substring(0, 6));
        const challenge = challenges.find((c) => c.id === challengeId);
        if (challenge && challenge.thresholds !== undefined) {
            const reward = Object.values(challenge.thresholds)
                .find((t) => t.rewards)
                ?.rewards?.find(
                    (reward) => reward.category === 'TITLE' && reward.title !== undefined
                );
            if (reward) {
                titleText = reward.title!;
            }
        }
    }

    // Load challenge images
    const challengeData = data.challenges
        .map((challengeId) => {
            const challenge = data.userChallenges.find((c) => c.challengeId === challengeId);
            if (!challenge) return null;
            return { id: challengeId, level: challenge.level };
        })
        .filter((ch) => ch !== null);

    const challengeAssets = await Promise.all(
        challengeData.map((ch) =>
            getAsset(AssetType.DDRAGON_CHALLENGES, `${ch.id}-${ch.level}.png`)
        )
    );

    // Build element
    const element = background(
        bannerAsset,
        { width: WIDTH, height: HEIGHT },
        // Main container
        column(
            {
                width: WIDTH,
                height: HEIGHT,
                alignItems: 'center',
                position: 'relative'
            },
            // Region
            text(
                {
                    fontSize: 15,
                    color: Color.WHITE,
                    fontWeight: 700,
                    marginTop: 10
                },
                lang.regions[data.region]
            ),
            // Level badge
            div(
                {
                    position: 'relative',
                    width: 40,
                    height: 40,
                    marginTop: 10,
                    justifyContent: 'center',
                    alignItems: 'center'
                },
                img(levelAsset!, { width: 40, height: 40 }),
                div(
                    {
                        position: 'absolute',
                        width: 40,
                        height: 40,
                        justifyContent: 'center',
                        alignItems: 'center'
                    },
                    text(
                        { fontSize: 18, color: Color.WHITE, fontWeight: 700 },
                        data.level.toString()
                    )
                )
            ),
            // Profile with crest container
            div(
                {
                    position: 'relative',
                    width: 200,
                    height: 200,
                    marginTop: 20,
                    justifyContent: 'center',
                    alignItems: 'center'
                },
                // Crest (background)
                crestAsset
                    ? div(
                          {
                              position: 'absolute',
                              justifyContent: 'center',
                              alignItems: 'center'
                          },
                          img(crestAsset, {
                              width:
                                  data.crest === 2 ||
                                  (data.crest == 1 && data.prestigeCrest == 0)
                                      ? 200
                                      : 160,
                              height:
                                  data.crest === 2 ||
                                  (data.crest == 1 && data.prestigeCrest == 0)
                                      ? 200
                                      : 160
                          })
                      )
                    : null,
                // Profile icon
                img(profileAsset!, {
                    width: 100,
                    height: 100,
                    borderRadius: 50
                }),
                // Division text (for ranked crests)
                showDivision && highestRank
                    ? div(
                          {
                              position: 'absolute',
                              bottom: 20,
                              justifyContent: 'center',
                              alignItems: 'center'
                          },
                          text(
                              { fontSize: 15, color: Color.WHITE, fontWeight: 700 },
                              highestRank.getRank()
                          )
                      )
                    : null
            ),
            // Name
            text(
                {
                    fontSize: 20,
                    color: Color.WHITE,
                    fontWeight: 700,
                    marginTop: 10
                },
                data.gameName + '#' + data.tagLine
            ),
            // Title
            titleText
                ? text(
                      {
                          fontSize: 18,
                          color: Color.GRAY,
                          fontWeight: 400,
                          marginTop: 10
                      },
                      titleText
                  )
                : null,
            // Challenges
            challengeAssets.length > 0
                ? row(
                      {
                          gap: 10,
                          marginTop: 20
                      },
                      ...challengeAssets
                          .filter((asset): asset is Buffer => asset !== null)
                          .map((asset) => img(asset, { width: 50, height: 50 }))
                  )
                : null
        )
    );

    return saveHtml(element, { width: WIDTH, height: HEIGHT });
};
