import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { ElementNode, RenderOptions } from './types';
import type { Font } from 'satori';
import fs from 'node:fs/promises';
import path from 'node:path';

// Font cache to avoid reloading fonts on every render
let fontCache: Font[] | null = null;

/**
 * Loads the fonts used for rendering
 */
async function loadFonts(): Promise<Font[]> {
    if (fontCache) {
        return fontCache;
    }

    const fontsDir = path.join(process.cwd(), 'assets', 'fonts');

    const [boldFont, regularFont] = await Promise.all([
        fs.readFile(path.join(fontsDir, 'beaufortforlolja-bold.ttf')),
        fs.readFile(path.join(fontsDir, 'beaufortforlolja-regular.ttf'))
    ]);

    fontCache = [
        {
            name: 'Beaufort for LOL Ja',
            data: boldFont,
            weight: 700,
            style: 'normal'
        },
        {
            name: 'Beaufort for LOL Ja',
            data: regularFont,
            weight: 400,
            style: 'normal'
        }
    ];

    return fontCache;
}

/**
 * Renders an element tree to a PNG buffer
 */
export async function render(element: ElementNode, options: RenderOptions): Promise<Buffer> {
    const fonts = await loadFonts();

    // Convert element to SVG using satori
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svg = await satori(element as any, {
        width: options.width,
        height: options.height,
        fonts,
        debug: options.debug
    });

    // Convert SVG to PNG using resvg
    const resvg = new Resvg(svg, {
        fitTo: {
            mode: 'width',
            value: options.width
        }
    });

    const pngData = resvg.render();
    return Buffer.from(pngData.asPng());
}

/**
 * Clears the font cache (useful for hot reloading in development)
 */
export function clearFontCache(): void {
    fontCache = null;
}
