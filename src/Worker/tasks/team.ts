import { AssetType, getAsset, getRiotLanguageFromDiscordLocale } from '$/lib/Assets';
import { background, center, column, div, img, row, text, textOutline } from '$/lib/Imaging/html';
import { Color } from '$/lib/Imaging/html/types';
import { ElementNode } from '$/lib/Imaging/html';
import { getLocale } from '$/lib/langs';
import { MasterySchema } from '$/lib/Riot/schemes';
import { Rank } from '$/lib/Riot/types';
import { formatNumbersWithSuffix, getChampionsMap } from '$/lib/utilities';
import { Locale } from 'discord.js';
import { z } from 'zod';
import { fixChampName, saveHtml } from '../utilities';
import { RankData } from './rank';

export type TeamData = {
    abbreviation: string;
    name: string;
    iconId: number;
    tier: number;
    captain: string;
    players: {
        puuid: string;
        position:
            | 'UNSELECTED'
            | 'FILL'
            | 'TOP'
            | 'JUNGLE'
            | 'MIDDLE'
            | 'BOTTOM'
            | 'UTILITY';
        role: 'CAPTAIN' | 'MEMBER';
        profileIconId: number;
        level: number;
        highestRank: RankData['ranks'][number] | null;
        gameName: string;
        tagLine: string;
        masteries: z.infer<typeof MasterySchema>[];
    }[];
    locale: Locale;
};

const WIDTH = 1600;
const HEIGHT = 750;

export default async (data: TeamData) => {
    const lang = getLocale(data.locale);

    // Load assets
    const [backgroundAsset, clashIcon, levelAsset, crownAsset] = await Promise.all([
        getAsset(AssetType.OTHER, 'background.png'),
        getAsset(AssetType.OTHER, `clash/${data.iconId}.png`),
        getAsset(AssetType.OTHER, 'level.png'),
        getAsset(AssetType.OTHER, 'crown.png')
    ]);

    const riotLang = getRiotLanguageFromDiscordLocale(data.locale);
    const champions = (await getChampionsMap(riotLang))!;

    // Get captain
    const captain = data.players.find(
        (player) => player.role === 'CAPTAIN' && data.captain === player.puuid
    )!;
    const nonCaptainPlayers = data.players.filter((p) => p.role === 'MEMBER');

    // Load all profile icons and mastery images
    const allPlayers = [captain, ...nonCaptainPlayers];
    const profileIcons = await Promise.all(
        allPlayers.map((p) =>
            getAsset(AssetType.DDRAGON_PROFILEICON, `${p.profileIconId}.png`)
        )
    );

    const masteryImages = await Promise.all(
        allPlayers.map((player) =>
            Promise.all(
                player.masteries.map(async (mastery) => {
                    const champion = champions.get(mastery.championId)!;
                    return getAsset(
                        AssetType.DDRAGON_CHAMPION,
                        `${fixChampName(champion.id)}.png`
                    );
                })
            )
        )
    );

    // Helper to render a player
    const renderPlayer = (
        player: TeamData['players'][number],
        profileIcon: Buffer,
        masteryImgs: (Buffer | null)[],
        isCaptain: boolean
    ): ElementNode => {
        const MASTERY_SIZE = 75;

        return column(
            {
                alignItems: 'center',
                gap: 5,
                padding: 10
            },
            // Player info row
            row(
                {
                    alignItems: 'center',
                    gap: 15
                },
                // Profile icon with level
                div(
                    {
                        position: 'relative',
                        width: 100,
                        height: 130
                    },
                    // Crown for captain
                    isCaptain
                        ? div(
                              {
                                  position: 'absolute',
                                  top: 0,
                                  left: 37
                              },
                              img(crownAsset!, { width: 26, height: 26 })
                          )
                        : null,
                    // Level badge
                    div(
                        {
                            position: 'absolute',
                            top: 17,
                            left: 25,
                            width: 50,
                            height: 26,
                            justifyContent: 'center',
                            alignItems: 'center'
                        },
                        img(levelAsset!, { width: 50, height: 26 }),
                        div(
                            {
                                position: 'absolute',
                                width: 50,
                                height: 26,
                                justifyContent: 'center',
                                alignItems: 'center'
                            },
                            text(
                                { fontSize: 18, color: Color.WHITE, fontWeight: 700 },
                                player.level.toString()
                            )
                        )
                    ),
                    // Profile icon
                    div(
                        {
                            position: 'absolute',
                            top: 30,
                            left: 0
                        },
                        img(profileIcon, { width: 100, height: 100, borderRadius: 50 })
                    )
                ),
                // Player details
                column(
                    {
                        gap: 5
                    },
                    // Name
                    text(
                        { fontSize: 28, color: Color.WHITE, fontWeight: 700 },
                        `${player.gameName}#${player.tagLine}`
                    ),
                    // Rank
                    player.highestRank === null
                        ? text(
                              { fontSize: 26, color: Color.GRAY, fontWeight: 700 },
                              lang.unranked
                          )
                        : row(
                              { gap: 5 },
                              text(
                                  {
                                      fontSize: 26,
                                      color: Color[player.highestRank.tier],
                                      fontWeight: 700
                                  },
                                  new Rank(player.highestRank).toString(lang)
                              ),
                              text(
                                  { fontSize: 26, color: Color.WHITE, fontWeight: 700 },
                                  ` (${
                                      lang.rank.queues[
                                          player.highestRank
                                              .queueType as keyof typeof lang.rank.queues
                                      ]
                                  })`
                              )
                          ),
                    // Position with W/L
                    player.highestRank === null
                        ? text(
                              { fontSize: 24, color: Color.WHITE, fontWeight: 700 },
                              lang.clash.positions[player.position]
                          )
                        : row(
                              { gap: 3 },
                              text(
                                  { fontSize: 24, color: Color.WHITE, fontWeight: 700 },
                                  `${lang.clash.positions[player.position]} (`
                              ),
                              text(
                                  { fontSize: 24, color: Color.GREEN, fontWeight: 700 },
                                  `${player.highestRank.wins}W`
                              ),
                              text(
                                  { fontSize: 24, color: Color.WHITE, fontWeight: 700 },
                                  '/'
                              ),
                              text(
                                  { fontSize: 24, color: Color.RED, fontWeight: 700 },
                                  `${player.highestRank.losses}L`
                              ),
                              text(
                                  { fontSize: 24, color: Color.WHITE, fontWeight: 700 },
                                  ')'
                              )
                          )
                )
            ),
            // Masteries row
            row(
                {
                    gap: 10,
                    marginTop: 10
                },
                ...player.masteries.map((mastery, i) =>
                    div(
                        {
                            position: 'relative',
                            width: MASTERY_SIZE,
                            height: MASTERY_SIZE + 25
                        },
                        // Champion image
                        masteryImgs[i]
                            ? img(masteryImgs[i]!, {
                                  width: MASTERY_SIZE,
                                  height: MASTERY_SIZE
                              })
                            : null,
                        // Mastery level
                        div(
                            {
                                position: 'absolute',
                                bottom: 30,
                                width: MASTERY_SIZE,
                                justifyContent: 'center'
                            },
                            text(
                                {
                                    fontSize: 20,
                                    color: Color.WHITE,
                                    fontWeight: 700,
                                    ...textOutline()
                                },
                                mastery.championLevel.toString()
                            )
                        ),
                        // Points
                        div(
                            {
                                position: 'absolute',
                                bottom: 0,
                                width: MASTERY_SIZE,
                                justifyContent: 'center'
                            },
                            text(
                                {
                                    fontSize: 18,
                                    color: Color.WHITE,
                                    fontWeight: 700,
                                    ...textOutline()
                                },
                                formatNumbersWithSuffix(mastery.championPoints)
                            )
                        )
                    )
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
                alignItems: 'center'
            },
            // Header with team name and icon
            row(
                {
                    alignItems: 'center',
                    gap: 20,
                    marginTop: 20
                },
                img(clashIcon!, { width: 80, height: 80 }),
                text(
                    { fontSize: 50, color: Color.WHITE, fontWeight: 700 },
                    `${data.abbreviation} | ${data.name}`.toUpperCase()
                )
            ),
            // Captain
            div(
                { marginTop: 20 },
                renderPlayer(captain, profileIcons[0]!, masteryImages[0], true)
            ),
            // Other players in a 2x2 grid
            nonCaptainPlayers.length > 0
                ? div(
                      {
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'center',
                          width: WIDTH,
                          marginTop: 20
                      },
                      ...nonCaptainPlayers.map((player, i) =>
                          div(
                              {
                                  width: WIDTH / 2,
                                  justifyContent: 'center'
                              },
                              renderPlayer(
                                  player,
                                  profileIcons[i + 1]!,
                                  masteryImages[i + 1],
                                  false
                              )
                          )
                      )
                  )
                : null
        )
    );

    return saveHtml(element, { width: WIDTH, height: HEIGHT });
};
