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
            expect(element.props.style.display).toBe('flex');
            expect(element.props.style.width).toBe(100);
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
            expect(element.props.style.fontSize).toBe(16);
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
            expect(element.props.style.flexDirection).toBe('row');
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
            expect(element.props.style.flexDirection).toBe('row');
            expect(element.props.style.gap).toBe(10);
        });
    });

    describe('column', () => {
        it('should create a flex column', () => {
            const element = column({ gap: 5 }, 'item1', 'item2');
            expect(element.props.style.flexDirection).toBe('column');
            expect(element.props.style.gap).toBe(5);
        });
    });

    describe('center', () => {
        it('should create a centered container', () => {
            const element = center({ width: 200 }, 'centered content');
            expect(element.props.style.justifyContent).toBe('center');
            expect(element.props.style.alignItems).toBe('center');
        });
    });

    describe('absolute', () => {
        it('should create an absolute positioned element', () => {
            const element = absolute({ top: 10, left: 20 }, 'content');
            expect(element.props.style.position).toBe('absolute');
            expect(element.props.style.top).toBe(10);
            expect(element.props.style.left).toBe(20);
        });
    });

    describe('background', () => {
        it('should create a container with background image', () => {
            const buffer = Buffer.from('image data');
            const element = background(buffer, { width: 800, height: 600 }, 'content');
            expect(element.props.style.position).toBe('relative');
            expect(element.props.style.backgroundSize).toBe('cover');
            expect(element.props.style.backgroundPosition).toBe('center');
            expect(element.props.style.width).toBe(800);
            expect(element.props.style.height).toBe(600);
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

describe('Render', () => {
    it('should render a simple element to PNG buffer', async () => {
        const element = div(
            {
                width: 100,
                height: 100,
                backgroundColor: '#ffffff'
            },
            text({ fontSize: 12, color: Color.WHITE }, 'Test')
        );

        const buffer = await render(element, { width: 100, height: 100 });

        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(0);

        // PNG signature check
        const pngSignature = buffer.slice(0, 8);
        expect(pngSignature[0]).toBe(0x89);
        expect(pngSignature[1]).toBe(0x50); // P
        expect(pngSignature[2]).toBe(0x4e); // N
        expect(pngSignature[3]).toBe(0x47); // G
    });

    it('should render complex layouts', async () => {
        const element = column(
            {
                width: 200,
                height: 200,
                backgroundColor: '#333333'
            },
            row(
                { gap: 10 },
                text({ fontSize: 14, color: Color.WHITE }, 'Item 1'),
                text({ fontSize: 14, color: Color.RED }, 'Item 2')
            ),
            text({ fontSize: 20, color: Color.GREEN, fontWeight: 700 }, 'Header')
        );

        const buffer = await render(element, { width: 200, height: 200 });
        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(0);
    });

    it('should render elements with explicit dimensions correctly', async () => {
        const WIDTH = 400;
        const HEIGHT = 300;

        const element = div(
            {
                width: WIDTH,
                height: HEIGHT,
                backgroundColor: '#1a1a1a'
            },
            column(
                {
                    width: WIDTH,
                    height: HEIGHT,
                    padding: 20,
                    justifyContent: 'space-between'
                },
                text({ fontSize: 24, color: Color.WHITE, fontWeight: 700 }, 'Top'),
                text({ fontSize: 24, color: Color.WHITE, fontWeight: 700 }, 'Bottom')
            )
        );

        const buffer = await render(element, { width: WIDTH, height: HEIGHT });
        expect(buffer).toBeInstanceOf(Buffer);
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

        expect(element.props.style.height).toBe(HEIGHT);
        expect(element.props.style.padding).toBe(PADDING);
    });
});
