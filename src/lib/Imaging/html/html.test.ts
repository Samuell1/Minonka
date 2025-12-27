import { describe, it, expect } from 'vitest';
import {
    div,
    span,
    text,
    img,
    row,
    column,
    background,
    textOutline,
    center,
    absolute
} from './elements';
import { render } from './render';
import { Color } from './types';

describe('HTML Elements', () => {
    describe('div', () => {
        it('should create a div element with display: flex', () => {
            const element = div({ width: 100 });
            expect(element.type).toBe('div');
            expect(element.props.style!.display).toBe('flex');
            expect(element.props.style!.width).toBe(100);
        });

        it('should filter null children', () => {
            const element = div({}, 'hello', null, 'world', undefined);
            expect(element.props.children).toHaveLength(2);
        });
    });

    describe('span', () => {
        it('should create a span element with text content', () => {
            const element = span({ fontSize: 16 }, 'Hello');
            expect(element.type).toBe('span');
            expect(element.props.children).toBe('Hello');
            expect(element.props.style!.fontSize).toBe(16);
        });

        it('should convert numbers to strings', () => {
            const element = span({}, 123);
            expect(element.props.children).toBe('123');
        });
    });

    describe('text', () => {
        it('should create a span for simple text', () => {
            const element = text({ color: Color.WHITE }, 'Hello World');
            expect(element.type).toBe('span');
            expect(element.props.children).toBe('Hello World');
        });

        it('should create a span for numbers', () => {
            const element = text({ fontSize: 20 }, 42);
            expect(element.type).toBe('span');
            expect(element.props.children).toBe('42');
        });

        it('should create a div with multiple spans for array content', () => {
            const element = text({ fontSize: 16 }, [
                'Hello ',
                { text: 'World', color: Color.RED }
            ]);
            expect(element.type).toBe('div');
            expect(element.props.style!.flexDirection).toBe('row');
            expect(element.props.children).toHaveLength(2);
        });
    });

    describe('img', () => {
        it('should create an img element from a buffer', () => {
            const buffer = Buffer.from('test image data');
            const element = img(buffer, { width: 100, height: 100 });
            expect(element.type).toBe('img');
            expect(element.props.width).toBe(100);
            expect(element.props.height).toBe(100);
            expect(element.props.src).toMatch(/^data:image\/png;base64,/);
        });

        it('should handle base64 strings', () => {
            const element = img('data:image/png;base64,abc123', { width: 50 });
            expect(element.props.src).toBe('data:image/png;base64,abc123');
        });

        it('should add data URI prefix for non-data strings', () => {
            const element = img('abc123', { width: 50 });
            expect(element.props.src).toBe('data:image/png;base64,abc123');
        });
    });

    describe('row', () => {
        it('should create a flex row', () => {
            const element = row({ gap: 10 }, 'item1', 'item2');
            expect(element.props.style!.flexDirection).toBe('row');
            expect(element.props.style!.gap).toBe(10);
        });
    });

    describe('column', () => {
        it('should create a flex column', () => {
            const element = column({ gap: 5 }, 'item1', 'item2');
            expect(element.props.style!.flexDirection).toBe('column');
            expect(element.props.style!.gap).toBe(5);
        });
    });

    describe('center', () => {
        it('should create a centered container', () => {
            const element = center({ width: 200 }, 'centered content');
            expect(element.props.style!.justifyContent).toBe('center');
            expect(element.props.style!.alignItems).toBe('center');
        });
    });

    describe('absolute', () => {
        it('should create an absolute positioned element', () => {
            const element = absolute({ top: 10, left: 20 }, 'content');
            expect(element.props.style!.position).toBe('absolute');
            expect(element.props.style!.top).toBe(10);
            expect(element.props.style!.left).toBe(20);
        });
    });

    describe('background', () => {
        it('should create a container with background image', () => {
            const buffer = Buffer.from('image data');
            const element = background(buffer, { width: 800, height: 600 }, 'content');
            expect(element.props.style!.position).toBe('relative');
            expect(element.props.style!.backgroundSize).toBe('cover');
            expect(element.props.style!.backgroundPosition).toBe('center');
            expect(element.props.style!.width).toBe(800);
            expect(element.props.style!.height).toBe(600);
        });
    });

    describe('textOutline', () => {
        it('should create text shadow for outline effect', () => {
            const style = textOutline();
            expect(style.textShadow).toBeDefined();
            expect(style.textShadow).toContain('0 #000000');
        });

        it('should accept custom color and width', () => {
            const style = textOutline('#ff0000', 3);
            expect(style.textShadow).toContain('#ff0000');
            expect(style.textShadow).toContain('3px');
        });
    });
});

describe('Color constants', () => {
    it('should have correct color values', () => {
        expect(Color.WHITE).toBe('#FFFFFF');
        expect(Color.RED).toBe('#ff0000');
        expect(Color.GREEN).toBe('#1fed18');
        expect(Color.YELLOW).toBe('#fff000');
        expect(Color.GRAY).toBe('#8A8578');
    });
});

/**
 * Helper to parse PNG dimensions from IHDR chunk
 */
function parsePngDimensions(buffer: Buffer): { width: number; height: number } {
    // PNG structure: 8-byte signature, then chunks
    // IHDR chunk: 4 bytes length, 4 bytes type, 4 bytes width, 4 bytes height, ...
    // IHDR is always the first chunk after the signature

    // Verify PNG signature
    const signature = buffer.slice(0, 8);
    if (
        signature[0] !== 0x89 ||
        signature[1] !== 0x50 ||
        signature[2] !== 0x4e ||
        signature[3] !== 0x47
    ) {
        throw new Error('Invalid PNG signature');
    }

    // IHDR chunk starts at byte 8
    // Skip 4 bytes (chunk length) + 4 bytes (chunk type "IHDR")
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);

    return { width, height };
}

/**
 * Validates that a buffer is a valid PNG with expected dimensions
 */
function validatePng(
    buffer: Buffer,
    expectedWidth: number,
    expectedHeight: number
): void {
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(100); // Minimum reasonable PNG size

    // Check PNG signature
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50); // P
    expect(buffer[2]).toBe(0x4e); // N
    expect(buffer[3]).toBe(0x47); // G
    expect(buffer[4]).toBe(0x0d);
    expect(buffer[5]).toBe(0x0a);
    expect(buffer[6]).toBe(0x1a);
    expect(buffer[7]).toBe(0x0a);

    // Verify IHDR chunk type
    const ihdrType = buffer.slice(12, 16).toString('ascii');
    expect(ihdrType).toBe('IHDR');

    // Check dimensions
    const { width, height } = parsePngDimensions(buffer);
    expect(width).toBe(expectedWidth);
    expect(height).toBe(expectedHeight);

    // Check PNG contains IEND chunk (search for it in the buffer)
    // IEND is a 0-length chunk: 00 00 00 00 49 45 4E 44 AE 42 60 82
    const iendMarker = Buffer.from([0x49, 0x45, 0x4e, 0x44]); // "IEND"
    const iendIndex = buffer.indexOf(iendMarker);
    expect(iendIndex).toBeGreaterThan(0);
}

/**
 * Creates a simple test image buffer (1x1 red pixel PNG)
 */
function createTestImage(): Buffer {
    // Minimal valid PNG - 1x1 red pixel
    return Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
        0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
        0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
        0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x00, 0x03, 0x00,
        0x01, 0x00, 0x05, 0xfe, 0xd4, 0xef, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
        0x44, 0xae, 0x42, 0x60, 0x82
    ]);
}

describe('Render', () => {
    describe('PNG validation', () => {
        it('should render a valid PNG with correct signature', async () => {
            const element = div(
                {
                    width: 100,
                    height: 100,
                    backgroundColor: '#ffffff'
                },
                text({ fontSize: 12, color: Color.WHITE }, 'Test')
            );

            const buffer = await render(element, { width: 100, height: 100 });
            validatePng(buffer, 100, 100);
        });

        it('should render PNG with exact requested dimensions', async () => {
            const testCases = [
                { width: 100, height: 100 },
                { width: 200, height: 150 },
                { width: 1600, height: 750 },
                { width: 800, height: 600 },
                { width: 272, height: 528 }
            ];

            for (const { width, height } of testCases) {
                const element = div({
                    width,
                    height,
                    backgroundColor: '#1a1a2e'
                });

                const buffer = await render(element, { width, height });
                validatePng(buffer, width, height);
            }
        });

        it('should produce non-empty image data', async () => {
            const element = column(
                {
                    width: 200,
                    height: 200,
                    backgroundColor: '#333333'
                },
                text({ fontSize: 20, color: Color.WHITE }, 'Hello')
            );

            const buffer = await render(element, { width: 200, height: 200 });

            // A 200x200 image should be reasonably sized (at least a few KB)
            expect(buffer.length).toBeGreaterThan(500);
        });
    });

    describe('complex layouts', () => {
        it('should render nested flex layouts', async () => {
            const element = column(
                {
                    width: 400,
                    height: 300,
                    backgroundColor: '#1a1a2e'
                },
                row(
                    { gap: 10, padding: 20 },
                    text({ fontSize: 14, color: Color.WHITE }, 'Item 1'),
                    text({ fontSize: 14, color: Color.RED }, 'Item 2'),
                    text({ fontSize: 14, color: Color.GREEN }, 'Item 3')
                ),
                column(
                    { gap: 5, padding: 10 },
                    text({ fontSize: 16, color: Color.YELLOW }, 'Nested 1'),
                    text({ fontSize: 16, color: Color.WHITE }, 'Nested 2')
                )
            );

            const buffer = await render(element, { width: 400, height: 300 });
            validatePng(buffer, 400, 300);
        });

        it('should render absolute positioned elements', async () => {
            const element = div(
                {
                    width: 300,
                    height: 200,
                    position: 'relative',
                    backgroundColor: '#2d2d2d'
                },
                absolute(
                    { top: 10, left: 10 },
                    text({ fontSize: 14, color: Color.WHITE }, 'Top Left')
                ),
                absolute(
                    { bottom: 10, right: 10 },
                    text({ fontSize: 14, color: Color.YELLOW }, 'Bottom Right')
                )
            );

            const buffer = await render(element, { width: 300, height: 200 });
            validatePng(buffer, 300, 200);
        });

        it('should render with embedded images', async () => {
            const testImage = createTestImage();

            const element = row(
                {
                    width: 200,
                    height: 100,
                    gap: 10,
                    backgroundColor: '#1a1a1a',
                    alignItems: 'center'
                },
                img(testImage, { width: 50, height: 50 }),
                text({ fontSize: 16, color: Color.WHITE }, 'With Image')
            );

            const buffer = await render(element, { width: 200, height: 100 });
            validatePng(buffer, 200, 100);
        });

        it('should render text with outline effect', async () => {
            const element = div(
                {
                    width: 300,
                    height: 100,
                    backgroundColor: '#333333',
                    justifyContent: 'center',
                    alignItems: 'center'
                },
                text(
                    {
                        fontSize: 24,
                        color: Color.WHITE,
                        fontWeight: 700,
                        ...textOutline('#000000', 2)
                    },
                    'Outlined Text'
                )
            );

            const buffer = await render(element, { width: 300, height: 100 });
            validatePng(buffer, 300, 100);
        });

        it('should render multi-colored text', async () => {
            const element = div(
                {
                    width: 400,
                    height: 80,
                    backgroundColor: '#1a1a1a',
                    padding: 20
                },
                text({ fontSize: 20, fontWeight: 700 }, [
                    { text: 'Win: ', color: Color.WHITE },
                    { text: '10', color: Color.GREEN },
                    { text: ' / Loss: ', color: Color.WHITE },
                    { text: '5', color: Color.RED }
                ])
            );

            const buffer = await render(element, { width: 400, height: 80 });
            validatePng(buffer, 400, 80);
        });
    });

    describe('match-like layout', () => {
        it('should render a layout similar to match.ts structure', async () => {
            const WIDTH = 1600;
            const HEIGHT = 750;
            const PADDING = 30;
            const HEADER_HEIGHT = 180;
            const FOOTER_HEIGHT = 50;
            const TEAMS_HEIGHT = HEIGHT - PADDING * 2 - HEADER_HEIGHT - FOOTER_HEIGHT;

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
                            alignItems: 'center'
                        },
                        row({ gap: 8 }),
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
                        row({ gap: 8 })
                    ),
                    // Teams
                    row(
                        {
                            width: WIDTH - PADDING * 2,
                            height: TEAMS_HEIGHT,
                            gap: 30
                        },
                        // Team 1
                        column(
                            {
                                width: (WIDTH - PADDING * 2 - 30) / 2,
                                height: TEAMS_HEIGHT,
                                justifyContent: 'space-between'
                            },
                            ...Array(5)
                                .fill(null)
                                .map((_, i) =>
                                    row(
                                        {
                                            alignItems: 'center',
                                            gap: 8,
                                            height: 95
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
                                justifyContent: 'space-between'
                            },
                            ...Array(5)
                                .fill(null)
                                .map((_, i) =>
                                    row(
                                        {
                                            alignItems: 'center',
                                            flexDirection: 'row-reverse',
                                            gap: 8,
                                            height: 95
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
                            alignItems: 'center'
                        },
                        text(
                            { fontSize: 28, color: Color.WHITE, fontWeight: 400 },
                            '12/27/2024, 10:30:00 PM'
                        )
                    )
                )
            );

            const buffer = await render(element, { width: WIDTH, height: HEIGHT });
            validatePng(buffer, WIDTH, HEIGHT);
            // Match images should be substantial in size
            expect(buffer.length).toBeGreaterThan(10000);
        });
    });

    describe('summoner-like layout', () => {
        it('should render a layout similar to summoner.ts structure', async () => {
            const WIDTH = 272;
            const HEIGHT = 528;

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
                        'Europe West'
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
                        div({
                            width: 40,
                            height: 40,
                            backgroundColor: '#333',
                            borderRadius: 20
                        }),
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
                                '250'
                            )
                        )
                    ),
                    // Profile container
                    div(
                        {
                            position: 'relative',
                            width: 200,
                            height: 200,
                            marginTop: 20,
                            justifyContent: 'center',
                            alignItems: 'center'
                        },
                        div({
                            width: 100,
                            height: 100,
                            backgroundColor: '#555',
                            borderRadius: 50
                        })
                    ),
                    // Name
                    text(
                        {
                            fontSize: 20,
                            color: Color.WHITE,
                            fontWeight: 700,
                            marginTop: 10
                        },
                        'Summoner#EUW'
                    ),
                    // Title
                    text(
                        {
                            fontSize: 18,
                            color: Color.GRAY,
                            fontWeight: 400,
                            marginTop: 10
                        },
                        'The Unstoppable'
                    ),
                    // Challenges
                    row(
                        {
                            gap: 10,
                            marginTop: 20
                        },
                        div({
                            width: 50,
                            height: 50,
                            backgroundColor: '#444',
                            borderRadius: 25
                        }),
                        div({
                            width: 50,
                            height: 50,
                            backgroundColor: '#444',
                            borderRadius: 25
                        }),
                        div({
                            width: 50,
                            height: 50,
                            backgroundColor: '#444',
                            borderRadius: 25
                        })
                    )
                )
            );

            const buffer = await render(element, { width: WIDTH, height: HEIGHT });
            validatePng(buffer, WIDTH, HEIGHT);
        });
    });

    describe('rank-like layout', () => {
        it('should render a layout similar to rank.ts structure', async () => {
            const WIDTH = 1600;
            const HEIGHT = 750;
            const PROFILE_WIDTH = 800;

            const element = div(
                {
                    width: WIDTH,
                    height: HEIGHT,
                    backgroundColor: '#1a1a2e'
                },
                // Profile section
                column(
                    {
                        width: PROFILE_WIDTH,
                        height: HEIGHT,
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10
                    },
                    text(
                        {
                            fontSize: 40,
                            color: Color.WHITE,
                            fontWeight: 700,
                            marginTop: 20
                        },
                        'Europe West'
                    ),
                    div({
                        width: 100,
                        height: 100,
                        backgroundColor: '#333',
                        borderRadius: 50
                    }),
                    div({
                        width: 360,
                        height: 360,
                        backgroundColor: '#555',
                        borderRadius: 180
                    }),
                    text(
                        {
                            fontSize: 50,
                            color: Color.WHITE,
                            fontWeight: 700,
                            marginTop: 20
                        },
                        'Player#TAG'
                    )
                ),
                // Ranks section (absolute positioned)
                row(
                    {
                        width: WIDTH - PROFILE_WIDTH,
                        height: HEIGHT,
                        marginLeft: PROFILE_WIDTH,
                        position: 'absolute',
                        top: 0,
                        left: 0
                    },
                    column(
                        {
                            width: (WIDTH - PROFILE_WIDTH) / 2,
                            height: HEIGHT,
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            paddingTop: 40
                        },
                        text(
                            { fontSize: 50, color: Color.WHITE, fontWeight: 700 },
                            'Solo/Duo'
                        ),
                        text(
                            { fontSize: 50, color: Color.DIAMOND, fontWeight: 700 },
                            'Diamond IV'
                        ),
                        div({
                            width: 256,
                            height: 256,
                            backgroundColor: '#444',
                            marginTop: 20
                        }),
                        text(
                            { fontSize: 50, color: Color.WHITE, fontWeight: 700 },
                            '75 LP'
                        ),
                        text(
                            { fontSize: 50, color: Color.GREEN, fontWeight: 700 },
                            'WR: 55.00%'
                        )
                    ),
                    column(
                        {
                            width: (WIDTH - PROFILE_WIDTH) / 2,
                            height: HEIGHT,
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            paddingTop: 40
                        },
                        text(
                            { fontSize: 50, color: Color.WHITE, fontWeight: 700 },
                            'Flex'
                        ),
                        text(
                            { fontSize: 50, color: Color.PLATINUM, fontWeight: 700 },
                            'Platinum II'
                        ),
                        div({
                            width: 256,
                            height: 256,
                            backgroundColor: '#444',
                            marginTop: 20
                        }),
                        text(
                            { fontSize: 50, color: Color.WHITE, fontWeight: 700 },
                            '45 LP'
                        ),
                        text(
                            { fontSize: 50, color: Color.RED, fontWeight: 700 },
                            'WR: 48.00%'
                        )
                    )
                )
            );

            const buffer = await render(element, { width: WIDTH, height: HEIGHT });
            validatePng(buffer, WIDTH, HEIGHT);
            expect(buffer.length).toBeGreaterThan(10000);
        });
    });
});

describe('Layout calculations', () => {
    it('should correctly calculate explicit heights', () => {
        const WIDTH = 1600;
        const HEIGHT = 750;
        const PADDING = 30;
        const HEADER_HEIGHT = 180;
        const FOOTER_HEIGHT = 50;
        const TEAMS_HEIGHT = HEIGHT - PADDING * 2 - HEADER_HEIGHT - FOOTER_HEIGHT;

        expect(TEAMS_HEIGHT).toBe(460);

        const element = column(
            {
                width: WIDTH,
                height: HEIGHT,
                padding: PADDING
            },
            row({ width: WIDTH - PADDING * 2, height: HEADER_HEIGHT }),
            row({ width: WIDTH - PADDING * 2, height: TEAMS_HEIGHT }),
            div({ width: WIDTH - PADDING * 2, height: FOOTER_HEIGHT })
        );

        expect(element.props.style!.height).toBe(HEIGHT);
        expect(element.props.style!.padding).toBe(PADDING);
    });
});
