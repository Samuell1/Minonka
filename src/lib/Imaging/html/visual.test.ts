import { describe, it, expect } from 'vitest';
import { div, text, row, column, background, img } from './elements';
import { render } from './render';
import { Color } from './types';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUTPUT_DIR = path.join(process.cwd(), 'test-output');

// Create a test background image with exact dimensions
async function createTestBackground(width: number, height: number): Promise<Buffer> {
    return sharp({
        create: {
            width,
            height,
            channels: 4,
            background: { r: 30, g: 30, b: 50, alpha: 1 }
        }
    })
        .png()
        .toBuffer();
}

async function saveTestImage(buffer: Buffer, name: string): Promise<void> {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.writeFile(path.join(OUTPUT_DIR, name), buffer);
}

describe('Visual Tests - Save images for inspection', () => {
    it('should render match-like layout and save to file', async () => {
        const WIDTH = 1600;
        const HEIGHT = 750;
        const PADDING = 30;
        const HEADER_HEIGHT = 180;
        const FOOTER_HEIGHT = 50;
        const TEAMS_HEIGHT = HEIGHT - PADDING * 2 - HEADER_HEIGHT - FOOTER_HEIGHT;

        // Create a simple colored background instead of image
        const element = div(
            {
                width: WIDTH,
                height: HEIGHT,
                backgroundColor: '#1a1a2e'
            },
            column(
                {
                    width: WIDTH,
                    height: HEIGHT,
                    padding: PADDING
                },
                // Header
                row(
                    {
                        width: WIDTH - PADDING * 2,
                        height: HEADER_HEIGHT,
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255,0,0,0.2)' // Debug: red tint
                    },
                    // Left bans placeholder
                    row(
                        { gap: 8 },
                        ...Array(5)
                            .fill(null)
                            .map(() =>
                                div({
                                    width: 55,
                                    height: 55,
                                    backgroundColor: '#444',
                                    borderRadius: 8
                                })
                            )
                    ),
                    // Center stats
                    column(
                        { alignItems: 'center', gap: 5 },
                        text(
                            { fontSize: 70, color: Color.GREEN, fontWeight: 700 },
                            'VICTORY'
                        ),
                        text(
                            { fontSize: 35, color: Color.WHITE, fontWeight: 700 },
                            'Ranked Solo'
                        ),
                        text(
                            { fontSize: 35, color: Color.WHITE, fontWeight: 700 },
                            '25:30'
                        )
                    ),
                    // Right bans placeholder
                    row(
                        { gap: 8 },
                        ...Array(5)
                            .fill(null)
                            .map(() =>
                                div({
                                    width: 55,
                                    height: 55,
                                    backgroundColor: '#444',
                                    borderRadius: 8
                                })
                            )
                    )
                ),
                // Teams
                row(
                    {
                        width: WIDTH - PADDING * 2,
                        height: TEAMS_HEIGHT,
                        gap: 30,
                        backgroundColor: 'rgba(0,255,0,0.1)' // Debug: green tint
                    },
                    // Team 1
                    column(
                        {
                            width: (WIDTH - PADDING * 2 - 30) / 2,
                            height: TEAMS_HEIGHT,
                            justifyContent: 'space-between',
                            backgroundColor: 'rgba(0,0,255,0.1)' // Debug: blue tint
                        },
                        ...Array(5)
                            .fill(null)
                            .map((_, i) =>
                                row(
                                    {
                                        alignItems: 'center',
                                        gap: 8,
                                        height: 95,
                                        backgroundColor: 'rgba(255,255,255,0.05)'
                                    },
                                    div({
                                        width: 70,
                                        height: 70,
                                        backgroundColor: '#333',
                                        borderRadius: 8
                                    }),
                                    column(
                                        { width: 160 },
                                        text(
                                            {
                                                fontSize: 22,
                                                color: Color.WHITE,
                                                fontWeight: 700
                                            },
                                            `player${i + 1}`
                                        ),
                                        text(
                                            {
                                                fontSize: 22,
                                                color: Color.WHITE,
                                                fontWeight: 700
                                            },
                                            '5/2/8'
                                        )
                                    )
                                )
                            )
                    ),
                    // Team 2
                    column(
                        {
                            width: (WIDTH - PADDING * 2 - 30) / 2,
                            height: TEAMS_HEIGHT,
                            justifyContent: 'space-between',
                            backgroundColor: 'rgba(255,0,255,0.1)' // Debug: magenta tint
                        },
                        ...Array(5)
                            .fill(null)
                            .map((_, i) =>
                                row(
                                    {
                                        alignItems: 'center',
                                        flexDirection: 'row-reverse',
                                        gap: 8,
                                        height: 95,
                                        backgroundColor: 'rgba(255,255,255,0.05)'
                                    },
                                    div({
                                        width: 70,
                                        height: 70,
                                        backgroundColor: '#333',
                                        borderRadius: 8
                                    }),
                                    column(
                                        { width: 160, alignItems: 'flex-end' },
                                        text(
                                            {
                                                fontSize: 22,
                                                color: Color.WHITE,
                                                fontWeight: 700
                                            },
                                            `enemy${i + 1}`
                                        ),
                                        text(
                                            {
                                                fontSize: 22,
                                                color: Color.WHITE,
                                                fontWeight: 700
                                            },
                                            '2/5/3'
                                        )
                                    )
                                )
                            )
                    )
                ),
                // Footer
                div(
                    {
                        width: WIDTH - PADDING * 2,
                        height: FOOTER_HEIGHT,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255,255,0,0.2)' // Debug: yellow tint
                    },
                    text(
                        { fontSize: 28, color: Color.WHITE, fontWeight: 400 },
                        '12/27/2024, 10:30:00 PM'
                    )
                )
            )
        );

        const buffer = await render(element, { width: WIDTH, height: HEIGHT });
        await saveTestImage(buffer, 'match-layout-debug.png');

        expect(buffer.length).toBeGreaterThan(0);
    });

    it('should test background element sizing', async () => {
        const WIDTH = 400;
        const HEIGHT = 300;

        // Create a 1x1 colored PNG for background test
        const testBgBuffer = Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
            0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
            0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
            0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x00, 0x03, 0x00,
            0x01, 0x00, 0x05, 0xfe, 0xd4, 0xef, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
            0x44, 0xae, 0x42, 0x60, 0x82
        ]);

        const element = background(
            testBgBuffer,
            { width: WIDTH, height: HEIGHT },
            column(
                {
                    width: WIDTH,
                    height: HEIGHT,
                    padding: 20,
                    justifyContent: 'space-between'
                },
                text({ fontSize: 24, color: Color.WHITE, fontWeight: 700 }, 'Top'),
                text({ fontSize: 24, color: Color.WHITE, fontWeight: 700 }, 'Middle'),
                text({ fontSize: 24, color: Color.WHITE, fontWeight: 700 }, 'Bottom')
            )
        );

        const buffer = await render(element, { width: WIDTH, height: HEIGHT });
        await saveTestImage(buffer, 'background-test.png');

        expect(buffer.length).toBeGreaterThan(0);
    });

    it('should test flex container overflow behavior', async () => {
        const WIDTH = 300;
        const HEIGHT = 200;

        // Test if children overflow the container
        const element = div(
            {
                width: WIDTH,
                height: HEIGHT,
                backgroundColor: '#1a1a2e',
                overflow: 'hidden'
            },
            column(
                {
                    width: WIDTH,
                    height: HEIGHT,
                    backgroundColor: 'rgba(255,0,0,0.3)'
                },
                // This should NOT overflow
                div({
                    width: WIDTH,
                    height: 100,
                    backgroundColor: 'rgba(0,255,0,0.5)'
                }),
                div({
                    width: WIDTH,
                    height: 100,
                    backgroundColor: 'rgba(0,0,255,0.5)'
                })
            )
        );

        const buffer = await render(element, { width: WIDTH, height: HEIGHT });
        await saveTestImage(buffer, 'overflow-test.png');

        expect(buffer.length).toBeGreaterThan(0);
    });

    it('should test outer container with explicit dimensions', async () => {
        const WIDTH = 1600;
        const HEIGHT = 750;

        // Simple test - just outer container with border to see actual dimensions
        const element = div(
            {
                width: WIDTH,
                height: HEIGHT,
                backgroundColor: '#1a1a2e',
                borderWidth: 5,
                borderColor: '#ff0000',
                borderStyle: 'solid'
            },
            div(
                {
                    width: WIDTH - 10,
                    height: HEIGHT - 10,
                    backgroundColor: '#2a2a3e',
                    justifyContent: 'center',
                    alignItems: 'center'
                },
                text(
                    { fontSize: 50, color: Color.WHITE, fontWeight: 700 },
                    `${WIDTH} x ${HEIGHT}`
                )
            )
        );

        const buffer = await render(element, { width: WIDTH, height: HEIGHT });
        await saveTestImage(buffer, 'dimensions-test.png');

        expect(buffer.length).toBeGreaterThan(0);
    });

    it('should test background with properly sized image', async () => {
        const WIDTH = 1600;
        const HEIGHT = 750;

        // Create background image with exact dimensions
        const bgImage = await createTestBackground(WIDTH, HEIGHT);

        const element = background(
            bgImage,
            { width: WIDTH, height: HEIGHT },
            column(
                {
                    width: WIDTH,
                    height: HEIGHT,
                    padding: 30
                },
                row(
                    {
                        width: WIDTH - 60,
                        height: 100,
                        backgroundColor: 'rgba(255,0,0,0.3)',
                        justifyContent: 'center',
                        alignItems: 'center'
                    },
                    text({ fontSize: 40, color: Color.WHITE, fontWeight: 700 }, 'Header')
                ),
                row(
                    {
                        width: WIDTH - 60,
                        height: 520,
                        backgroundColor: 'rgba(0,255,0,0.2)'
                    },
                    text({ fontSize: 30, color: Color.WHITE }, 'Content Area')
                ),
                row(
                    {
                        width: WIDTH - 60,
                        height: 40,
                        backgroundColor: 'rgba(0,0,255,0.3)',
                        justifyContent: 'center',
                        alignItems: 'center'
                    },
                    text({ fontSize: 24, color: Color.WHITE }, 'Footer')
                )
            )
        );

        const buffer = await render(element, { width: WIDTH, height: HEIGHT });
        await saveTestImage(buffer, 'background-sized-test.png');

        // Check dimensions
        const metadata = await sharp(buffer).metadata();
        expect(metadata.width).toBe(WIDTH);
        expect(metadata.height).toBe(HEIGHT);
    });

    it('should test match layout with real background', async () => {
        const WIDTH = 1600;
        const HEIGHT = 750;
        const PADDING = 30;
        const HEADER_HEIGHT = 180;
        const FOOTER_HEIGHT = 50;
        const TEAMS_HEIGHT = HEIGHT - PADDING * 2 - HEADER_HEIGHT - FOOTER_HEIGHT;
        const TEAM_WIDTH = (WIDTH - PADDING * 2 - 30) / 2;

        // Create background image
        const bgImage = await createTestBackground(WIDTH, HEIGHT);

        const element = background(
            bgImage,
            { width: WIDTH, height: HEIGHT },
            column(
                {
                    width: WIDTH,
                    height: HEIGHT,
                    padding: PADDING
                },
                // Header
                row(
                    {
                        width: WIDTH - PADDING * 2,
                        height: HEADER_HEIGHT,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255,0,0,0.15)'
                    },
                    text({ fontSize: 70, color: Color.GREEN, fontWeight: 700 }, 'VICTORY')
                ),
                // Teams container
                row(
                    {
                        width: WIDTH - PADDING * 2,
                        height: TEAMS_HEIGHT,
                        gap: 30
                    },
                    // Team 1
                    column(
                        {
                            width: TEAM_WIDTH,
                            height: TEAMS_HEIGHT,
                            justifyContent: 'space-between',
                            backgroundColor: 'rgba(0,0,255,0.15)'
                        },
                        ...Array(5)
                            .fill(null)
                            .map((_, i) =>
                                row(
                                    {
                                        width: TEAM_WIDTH,
                                        height: 85,
                                        alignItems: 'center',
                                        gap: 10,
                                        backgroundColor: 'rgba(255,255,255,0.05)'
                                    },
                                    div({
                                        width: 70,
                                        height: 70,
                                        backgroundColor: '#444',
                                        borderRadius: 8
                                    }),
                                    text(
                                        {
                                            fontSize: 20,
                                            color: Color.WHITE,
                                            fontWeight: 700
                                        },
                                        `Player ${i + 1} - 5/2/8`
                                    )
                                )
                            )
                    ),
                    // Team 2
                    column(
                        {
                            width: TEAM_WIDTH,
                            height: TEAMS_HEIGHT,
                            justifyContent: 'space-between',
                            backgroundColor: 'rgba(255,0,255,0.15)'
                        },
                        ...Array(5)
                            .fill(null)
                            .map((_, i) =>
                                row(
                                    {
                                        width: TEAM_WIDTH,
                                        height: 85,
                                        alignItems: 'center',
                                        flexDirection: 'row-reverse',
                                        gap: 10,
                                        backgroundColor: 'rgba(255,255,255,0.05)'
                                    },
                                    div({
                                        width: 70,
                                        height: 70,
                                        backgroundColor: '#444',
                                        borderRadius: 8
                                    }),
                                    text(
                                        {
                                            fontSize: 20,
                                            color: Color.WHITE,
                                            fontWeight: 700
                                        },
                                        `Enemy ${i + 1} - 2/5/3`
                                    )
                                )
                            )
                    )
                ),
                // Footer
                row(
                    {
                        width: WIDTH - PADDING * 2,
                        height: FOOTER_HEIGHT,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255,255,0,0.15)'
                    },
                    text({ fontSize: 24, color: Color.WHITE }, '12/27/2024, 10:30:00 PM')
                )
            )
        );

        const buffer = await render(element, { width: WIDTH, height: HEIGHT });
        await saveTestImage(buffer, 'match-with-bg.png');

        // Verify dimensions
        const metadata = await sharp(buffer).metadata();
        expect(metadata.width).toBe(WIDTH);
        expect(metadata.height).toBe(HEIGHT);
    });
});
