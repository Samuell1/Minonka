import { AssetType, getAsset, getRunesReforged, getSummonerSpells } from '$/lib/Assets';
import { asyncExists } from '$/lib/fsAsync';
import { SpectatorSchema } from '$/lib/Riot/schemes';
import { env } from '$/types/env';
import { DePromise, FileResult, OmitUnion } from '$/types/types';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { WebSocket } from 'ws';
import { z } from 'zod';
import { ExtractAssetResult } from './types';

// HTML Imaging imports
import {
    render,
    ElementNode,
    Color,
    img,
    row,
    column,
    div,
    text,
    textOutline
} from '$/lib/Imaging/html';
export { Color } from '$/lib/Imaging/html';

// Check if we're running in a worker environment (not on main server)
const isRemoteWorker = process.env.WORKER_MODE === 'remote';

// Global websocket reference for remote worker communication
let workerWebSocket: WebSocket | null = null;

export const setWorkerWebSocket = (ws: WebSocket) => {
    workerWebSocket = ws;
};

/**
 * Saves an HTML element as a rendered PNG image
 */
export const saveHtml = async (
    element: ElementNode,
    options: { width: number; height: number }
): Promise<FileResult> => {
    const renderedImage = await render(element, options);

    if (isRemoteWorker) {
        return {
            type: 'temp',
            data: renderedImage.toString('base64')
        };
    } else {
        if (!(await asyncExists(env.CACHE_PATH))) {
            await fs.mkdir(env.CACHE_PATH, { recursive: true });
        }

        const name = crypto.randomBytes(16).toString('hex');
        const filePath = `${env.CACHE_PATH}/${name}.png`;

        await fs.writeFile(filePath, renderedImage);

        return {
            type: 'local',
            path: filePath
        };
    }
};

/**
 * Saves a pre-rendered buffer as a PNG image
 */
export const saveBuffer = async (buffer: Buffer): Promise<FileResult> => {
    if (isRemoteWorker) {
        return {
            type: 'temp',
            data: buffer.toString('base64')
        };
    } else {
        if (!(await asyncExists(env.CACHE_PATH))) {
            await fs.mkdir(env.CACHE_PATH, { recursive: true });
        }

        const name = crypto.randomBytes(16).toString('hex');
        const filePath = `${env.CACHE_PATH}/${name}.png`;

        await fs.writeFile(filePath, buffer);

        return {
            type: 'local',
            path: filePath
        };
    }
};

export const persistantExists = async (name: string): Promise<boolean> => {
    if (isRemoteWorker && workerWebSocket) {
        // For remote workers, send a request to check if file exists
        return new Promise((resolve) => {
            const requestId = crypto.randomBytes(16).toString('hex');

            // Set up a one-time listener for the response
            const messageHandler = (message: Buffer) => {
                const str = message.toString();
                if (str.startsWith('persistentResult')) {
                    const [, responseId, exists] = str.split(';');
                    if (responseId === requestId) {
                        workerWebSocket?.off('message', messageHandler);
                        resolve(exists === 'true');
                    }
                }
            };

            workerWebSocket?.on('message', messageHandler);
            workerWebSocket?.send(`checkPersistent;${requestId};${name}`);

            // Timeout after 5 seconds
            setTimeout(() => {
                workerWebSocket?.off('message', messageHandler);
                resolve(false);
            }, 5000);
        });
    } else {
        // Local mode - check filesystem directly
        return asyncExists(`${env.PERSISTANT_CACHE_PATH}/${name}`);
    }
};

export const getPersistant = (name: string): FileResult => {
    if (isRemoteWorker) {
        return {
            type: 'persistent',
            name: name
        };
    } else {
        return {
            type: 'local',
            path: `${env.PERSISTANT_CACHE_PATH}/${name}`
        };
    }
};

/**
 * Saves an HTML element as a persistent PNG image
 */
export const savePersistantHtml = async (
    element: ElementNode,
    options: { width: number; height: number },
    name: string
): Promise<FileResult> => {
    const renderedImage = await render(element, options);

    if (isRemoteWorker) {
        return {
            type: 'persistent',
            data: renderedImage.toString('base64'),
            name: name
        };
    } else {
        if (!(await asyncExists(env.PERSISTANT_CACHE_PATH))) {
            await fs.mkdir(env.PERSISTANT_CACHE_PATH, { recursive: true });
        }

        const filePath = `${env.PERSISTANT_CACHE_PATH}/${name}`;
        await fs.writeFile(filePath, renderedImage);

        return {
            type: 'local',
            path: filePath
        };
    }
};

/**
 * Saves a pre-rendered buffer as a persistent PNG image
 */
export const savePersistantBuffer = async (buffer: Buffer, name: string): Promise<FileResult> => {
    if (isRemoteWorker) {
        return {
            type: 'persistent',
            data: buffer.toString('base64'),
            name: name
        };
    } else {
        if (!(await asyncExists(env.PERSISTANT_CACHE_PATH))) {
            await fs.mkdir(env.PERSISTANT_CACHE_PATH, { recursive: true });
        }

        const filePath = `${env.PERSISTANT_CACHE_PATH}/${name}`;
        await fs.writeFile(filePath, buffer);

        return {
            type: 'local',
            path: filePath
        };
    }
};

export const toMMSS = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
        .toString()
        .padStart(2, '0');
    const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainingSeconds}`;
};

/**
 * Creates summoner spell elements for HTML rendering
 */
export const createSummonerSpells = async (
    player: {
        summoner1Id: number;
        summoner2Id: number;
    },
    summoners: ExtractAssetResult<typeof getSummonerSpells>,
    size: number,
    gap: number = 4
): Promise<ElementNode> => {
    const spellAssets = await Promise.all(
        [player.summoner1Id, player.summoner2Id].map(async (summKey) => {
            const summoner = Object.values(summoners.data).find(
                (summ) => summ.key === summKey
            )!;
            return getAsset(AssetType.DDRAGON_SPELL, summoner.image.full);
        })
    );

    return column(
        { gap },
        ...spellAssets.map((asset) => img(asset!, { width: size, height: size }))
    );
};

/**
 * Creates item row elements for HTML rendering
 */
export const createItems = async (
    player: {
        item0: number;
        item1: number;
        item2: number;
        item3: number;
        item4: number;
        item5: number;
        item6: number;
        visionScore: number;
    },
    imageWidth: number,
    imageSpacing: number,
    itemBackground: ExtractAssetResult<typeof getAsset>,
    imageBorder: number,
    reverse: boolean = false
): Promise<ElementNode> => {
    const itemIds = [
        player.item0,
        player.item1,
        player.item2,
        player.item3,
        player.item4,
        player.item5,
        player.item6
    ];

    const itemAssets = await Promise.all(
        itemIds.map((itemId) =>
            itemId === 0 ? null : getAsset(AssetType.DDRAGON_ITEM, itemId + '.png')
        )
    );

    const items = itemIds.map((itemId, i) => {
        const isWard = i === 6;
        return div(
            {
                position: 'relative',
                width: imageWidth,
                height: imageWidth
            },
            // Background
            img(itemBackground!, { width: imageWidth, height: imageWidth }),
            // Item image (if exists)
            itemAssets[i]
                ? div(
                      {
                          position: 'absolute',
                          top: imageBorder,
                          left: imageBorder
                      },
                      img(itemAssets[i]!, {
                          width: imageWidth - imageBorder * 2,
                          height: imageWidth - imageBorder * 2
                      })
                  )
                : null,
            // Vision score on ward slot
            isWard && itemAssets[i]
                ? div(
                      {
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: imageWidth,
                          height: imageWidth,
                          justifyContent: 'center',
                          alignItems: 'center'
                      },
                      text(
                          {
                              fontSize: 30,
                              color: Color.WHITE,
                              fontWeight: 700,
                              ...textOutline()
                          },
                          player.visionScore
                      )
                  )
                : null
        );
    });

    return row(
        {
            gap: imageSpacing,
            flexDirection: reverse ? 'row-reverse' : 'row'
        },
        ...items
    );
};

export const fixChampName = (champName: string) => {
    //because FiddleSticks is written with capital S, but in files it's lowercase
    if (champName === 'FiddleSticks') {
        return 'Fiddlesticks';
    }
    return champName;
};

type NormalizedPerks = {
    styles: {
        style: number;
        selections: { perk: number }[];
    }[];
    statPerks: { defense: number; flex: number; offense: number };
};

export const getRuneTree = (
    runesReforged: OmitUnion<DePromise<ReturnType<typeof getRunesReforged>>, null>,
    player: {
        perks: NormalizedPerks;
    },
    idx: number
) => {
    const root = player.perks.styles[idx];

    const tree = runesReforged.find(
        (rune) =>
            rune.id === root.style ||
            root.selections
                .map((selection) => selection.perk)
                .some((perkId) =>
                    rune.slots
                        .map((slot) => slot.runes.map((rune) => rune.id))
                        .flat()
                        .includes(perkId)
                )
    );

    if (!tree) {
        throw new Error('Failed to find tree');
    }

    return tree;
};

export const getRune = (
    tree: ReturnType<typeof getRuneTree>,
    player: {
        perks: NormalizedPerks;
    },
    idx: number,
    selection: number
) => {
    return tree.slots[0].runes.find(
        (rune) => rune.id === player.perks.styles[idx].selections[selection].perk
    )!;
};

export const spectatorPerksNormalize = (
    perks: z.infer<typeof SpectatorSchema>['participants'][number]['perks']
): NormalizedPerks => {
    const STYLES = ['primaryStyle', 'subStyle'];
    const STYLES_COUNT = [4, 2];

    const perksSTART = STYLES_COUNT.reduce((acc, curr) => acc + curr, 0);

    return {
        styles: STYLES.map((_, idx) => {
            const previous = STYLES_COUNT[idx - 1] ?? 0;
            const selections = perks.perkIds.slice(
                previous,
                previous + STYLES_COUNT[idx]
            );

            return {
                style:
                    STYLES[idx] === 'primaryStyle' ? perks.perkStyle : perks.perkSubStyle,
                selections: selections.map((perkId) => ({ perk: perkId }))
            };
        }),
        statPerks: {
            offense: perks.perkIds[perksSTART + 0],
            flex: perks.perkIds[perksSTART + 1],
            defense: perks.perkIds[perksSTART + 2]
        }
    };
};
