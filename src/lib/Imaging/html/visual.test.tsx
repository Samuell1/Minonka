import { describe, it, expect } from 'vitest';
import { Box, Text, Row, Column, Background } from './elements';
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

        const element = (
            <Box style={{ width: WIDTH, height: HEIGHT, backgroundColor: '#1a1a2e' }}>
                <Column style={{ width: WIDTH, height: HEIGHT, padding: PADDING }}>
                    {/* Header */}
                    <Row
                        justifyContent="space-between"
                        alignItems="center"
                        style={{
                            width: WIDTH - PADDING * 2,
                            height: HEADER_HEIGHT,
                            backgroundColor: 'rgba(255,0,0,0.2)'
                        }}
                    >
                        {/* Left bans placeholder */}
                        <Row gap={8}>
                            {Array(5)
                                .fill(null)
                                .map(() => (
                                    <Box
                                        style={{
                                            width: 55,
                                            height: 55,
                                            backgroundColor: '#444',
                                            borderRadius: 8
                                        }}
                                    />
                                ))}
                        </Row>
                        {/* Center stats */}
                        <Column alignItems="center" gap={5}>
                            <Text
                                style={{
                                    fontSize: 70,
                                    color: Color.GREEN,
                                    fontWeight: 700
                                }}
                            >
                                VICTORY
                            </Text>
                            <Text
                                style={{
                                    fontSize: 35,
                                    color: Color.WHITE,
                                    fontWeight: 700
                                }}
                            >
                                Ranked Solo
                            </Text>
                            <Text
                                style={{
                                    fontSize: 35,
                                    color: Color.WHITE,
                                    fontWeight: 700
                                }}
                            >
                                25:30
                            </Text>
                        </Column>
                        {/* Right bans placeholder */}
                        <Row gap={8}>
                            {Array(5)
                                .fill(null)
                                .map(() => (
                                    <Box
                                        style={{
                                            width: 55,
                                            height: 55,
                                            backgroundColor: '#444',
                                            borderRadius: 8
                                        }}
                                    />
                                ))}
                        </Row>
                    </Row>
                    {/* Teams */}
                    <Row
                        gap={30}
                        style={{
                            width: WIDTH - PADDING * 2,
                            height: TEAMS_HEIGHT,
                            backgroundColor: 'rgba(0,255,0,0.1)'
                        }}
                    >
                        {/* Team 1 */}
                        <Column
                            justifyContent="space-between"
                            style={{
                                width: (WIDTH - PADDING * 2 - 30) / 2,
                                height: TEAMS_HEIGHT,
                                backgroundColor: 'rgba(0,0,255,0.1)'
                            }}
                        >
                            {Array(5)
                                .fill(null)
                                .map((_, i) => (
                                    <Row
                                        alignItems="center"
                                        gap={8}
                                        style={{
                                            height: 95,
                                            backgroundColor: 'rgba(255,255,255,0.05)'
                                        }}
                                    >
                                        <Box
                                            style={{
                                                width: 70,
                                                height: 70,
                                                backgroundColor: '#333',
                                                borderRadius: 8
                                            }}
                                        />
                                        <Column style={{ width: 160 }}>
                                            <Text
                                                style={{
                                                    fontSize: 22,
                                                    color: Color.WHITE,
                                                    fontWeight: 700
                                                }}
                                            >
                                                {`player${i + 1}`}
                                            </Text>
                                            <Text
                                                style={{
                                                    fontSize: 22,
                                                    color: Color.WHITE,
                                                    fontWeight: 700
                                                }}
                                            >
                                                5/2/8
                                            </Text>
                                        </Column>
                                    </Row>
                                ))}
                        </Column>
                        {/* Team 2 */}
                        <Column
                            justifyContent="space-between"
                            style={{
                                width: (WIDTH - PADDING * 2 - 30) / 2,
                                height: TEAMS_HEIGHT,
                                backgroundColor: 'rgba(255,0,255,0.1)'
                            }}
                        >
                            {Array(5)
                                .fill(null)
                                .map((_, i) => (
                                    <Row
                                        alignItems="center"
                                        gap={8}
                                        style={{
                                            flexDirection: 'row-reverse',
                                            height: 95,
                                            backgroundColor: 'rgba(255,255,255,0.05)'
                                        }}
                                    >
                                        <Box
                                            style={{
                                                width: 70,
                                                height: 70,
                                                backgroundColor: '#333',
                                                borderRadius: 8
                                            }}
                                        />
                                        <Column
                                            alignItems="flex-end"
                                            style={{ width: 160 }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 22,
                                                    color: Color.WHITE,
                                                    fontWeight: 700
                                                }}
                                            >
                                                {`enemy${i + 1}`}
                                            </Text>
                                            <Text
                                                style={{
                                                    fontSize: 22,
                                                    color: Color.WHITE,
                                                    fontWeight: 700
                                                }}
                                            >
                                                2/5/3
                                            </Text>
                                        </Column>
                                    </Row>
                                ))}
                        </Column>
                    </Row>
                    {/* Footer */}
                    <Box
                        style={{
                            width: WIDTH - PADDING * 2,
                            height: FOOTER_HEIGHT,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: 'rgba(255,255,0,0.2)'
                        }}
                    >
                        <Text
                            style={{ fontSize: 28, color: Color.WHITE, fontWeight: 400 }}
                        >
                            12/27/2024, 10:30:00 PM
                        </Text>
                    </Box>
                </Column>
            </Box>
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

        const element = (
            <Background src={testBgBuffer} width={WIDTH} height={HEIGHT}>
                <Column
                    justifyContent="space-between"
                    style={{ width: WIDTH, height: HEIGHT, padding: 20 }}
                >
                    <Text style={{ fontSize: 24, color: Color.WHITE, fontWeight: 700 }}>
                        Top
                    </Text>
                    <Text style={{ fontSize: 24, color: Color.WHITE, fontWeight: 700 }}>
                        Middle
                    </Text>
                    <Text style={{ fontSize: 24, color: Color.WHITE, fontWeight: 700 }}>
                        Bottom
                    </Text>
                </Column>
            </Background>
        );

        const buffer = await render(element, { width: WIDTH, height: HEIGHT });
        await saveTestImage(buffer, 'background-test.png');

        expect(buffer.length).toBeGreaterThan(0);
    });

    it('should test flex container overflow behavior', async () => {
        const WIDTH = 300;
        const HEIGHT = 200;

        const element = (
            <Box
                style={{
                    width: WIDTH,
                    height: HEIGHT,
                    backgroundColor: '#1a1a2e',
                    overflow: 'hidden'
                }}
            >
                <Column
                    style={{
                        width: WIDTH,
                        height: HEIGHT,
                        backgroundColor: 'rgba(255,0,0,0.3)'
                    }}
                >
                    <Box
                        style={{
                            width: WIDTH,
                            height: 100,
                            backgroundColor: 'rgba(0,255,0,0.5)'
                        }}
                    />
                    <Box
                        style={{
                            width: WIDTH,
                            height: 100,
                            backgroundColor: 'rgba(0,0,255,0.5)'
                        }}
                    />
                </Column>
            </Box>
        );

        const buffer = await render(element, { width: WIDTH, height: HEIGHT });
        await saveTestImage(buffer, 'overflow-test.png');

        expect(buffer.length).toBeGreaterThan(0);
    });

    it('should test outer container with explicit dimensions', async () => {
        const WIDTH = 1600;
        const HEIGHT = 750;

        const element = (
            <Box
                style={{
                    width: WIDTH,
                    height: HEIGHT,
                    backgroundColor: '#1a1a2e',
                    borderWidth: 5,
                    borderColor: '#ff0000',
                    borderStyle: 'solid'
                }}
            >
                <Box
                    style={{
                        width: WIDTH - 10,
                        height: HEIGHT - 10,
                        backgroundColor: '#2a2a3e',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <Text style={{ fontSize: 50, color: Color.WHITE, fontWeight: 700 }}>
                        {`${WIDTH} x ${HEIGHT}`}
                    </Text>
                </Box>
            </Box>
        );

        const buffer = await render(element, { width: WIDTH, height: HEIGHT });
        await saveTestImage(buffer, 'dimensions-test.png');

        expect(buffer.length).toBeGreaterThan(0);
    });

    it('should test background with properly sized image', async () => {
        const WIDTH = 1600;
        const HEIGHT = 750;

        const bgImage = await createTestBackground(WIDTH, HEIGHT);

        const element = (
            <Background src={bgImage} width={WIDTH} height={HEIGHT}>
                <Column style={{ width: WIDTH, height: HEIGHT, padding: 30 }}>
                    <Row
                        justifyContent="center"
                        alignItems="center"
                        style={{
                            width: WIDTH - 60,
                            height: 100,
                            backgroundColor: 'rgba(255,0,0,0.3)'
                        }}
                    >
                        <Text
                            style={{ fontSize: 40, color: Color.WHITE, fontWeight: 700 }}
                        >
                            Header
                        </Text>
                    </Row>
                    <Row
                        style={{
                            width: WIDTH - 60,
                            height: 520,
                            backgroundColor: 'rgba(0,255,0,0.2)'
                        }}
                    >
                        <Text style={{ fontSize: 30, color: Color.WHITE }}>
                            Content Area
                        </Text>
                    </Row>
                    <Row
                        justifyContent="center"
                        alignItems="center"
                        style={{
                            width: WIDTH - 60,
                            height: 40,
                            backgroundColor: 'rgba(0,0,255,0.3)'
                        }}
                    >
                        <Text style={{ fontSize: 24, color: Color.WHITE }}>Footer</Text>
                    </Row>
                </Column>
            </Background>
        );

        const buffer = await render(element, { width: WIDTH, height: HEIGHT });
        await saveTestImage(buffer, 'background-sized-test.png');

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

        const bgImage = await createTestBackground(WIDTH, HEIGHT);

        const element = (
            <Background src={bgImage} width={WIDTH} height={HEIGHT}>
                <Column style={{ width: WIDTH, height: HEIGHT, padding: PADDING }}>
                    {/* Header */}
                    <Row
                        justifyContent="center"
                        alignItems="center"
                        style={{
                            width: WIDTH - PADDING * 2,
                            height: HEADER_HEIGHT,
                            backgroundColor: 'rgba(255,0,0,0.15)'
                        }}
                    >
                        <Text
                            style={{ fontSize: 70, color: Color.GREEN, fontWeight: 700 }}
                        >
                            VICTORY
                        </Text>
                    </Row>
                    {/* Teams container */}
                    <Row
                        gap={30}
                        style={{ width: WIDTH - PADDING * 2, height: TEAMS_HEIGHT }}
                    >
                        {/* Team 1 */}
                        <Column
                            justifyContent="space-between"
                            style={{
                                width: TEAM_WIDTH,
                                height: TEAMS_HEIGHT,
                                backgroundColor: 'rgba(0,0,255,0.15)'
                            }}
                        >
                            {Array(5)
                                .fill(null)
                                .map((_, i) => (
                                    <Row
                                        alignItems="center"
                                        gap={10}
                                        style={{
                                            width: TEAM_WIDTH,
                                            height: 85,
                                            backgroundColor: 'rgba(255,255,255,0.05)'
                                        }}
                                    >
                                        <Box
                                            style={{
                                                width: 70,
                                                height: 70,
                                                backgroundColor: '#444',
                                                borderRadius: 8
                                            }}
                                        />
                                        <Text
                                            style={{
                                                fontSize: 20,
                                                color: Color.WHITE,
                                                fontWeight: 700
                                            }}
                                        >
                                            {`Player ${i + 1} - 5/2/8`}
                                        </Text>
                                    </Row>
                                ))}
                        </Column>
                        {/* Team 2 */}
                        <Column
                            justifyContent="space-between"
                            style={{
                                width: TEAM_WIDTH,
                                height: TEAMS_HEIGHT,
                                backgroundColor: 'rgba(255,0,255,0.15)'
                            }}
                        >
                            {Array(5)
                                .fill(null)
                                .map((_, i) => (
                                    <Row
                                        alignItems="center"
                                        gap={10}
                                        style={{
                                            width: TEAM_WIDTH,
                                            height: 85,
                                            flexDirection: 'row-reverse',
                                            backgroundColor: 'rgba(255,255,255,0.05)'
                                        }}
                                    >
                                        <Box
                                            style={{
                                                width: 70,
                                                height: 70,
                                                backgroundColor: '#444',
                                                borderRadius: 8
                                            }}
                                        />
                                        <Text
                                            style={{
                                                fontSize: 20,
                                                color: Color.WHITE,
                                                fontWeight: 700
                                            }}
                                        >
                                            {`Enemy ${i + 1} - 2/5/3`}
                                        </Text>
                                    </Row>
                                ))}
                        </Column>
                    </Row>
                    {/* Footer */}
                    <Row
                        justifyContent="center"
                        alignItems="center"
                        style={{
                            width: WIDTH - PADDING * 2,
                            height: FOOTER_HEIGHT,
                            backgroundColor: 'rgba(255,255,0,0.15)'
                        }}
                    >
                        <Text style={{ fontSize: 24, color: Color.WHITE }}>
                            12/27/2024, 10:30:00 PM
                        </Text>
                    </Row>
                </Column>
            </Background>
        );

        const buffer = await render(element, { width: WIDTH, height: HEIGHT });
        await saveTestImage(buffer, 'match-with-bg.png');

        const metadata = await sharp(buffer).metadata();
        expect(metadata.width).toBe(WIDTH);
        expect(metadata.height).toBe(HEIGHT);
    });
});
