import type { CSSProperties, ElementNode } from './types';

// JSX child type - includes false/null/undefined for conditional rendering
type JSXChild = ElementNode | string | number | boolean | null | undefined;
type JSXChildren = JSXChild | JSXChild[];

// Filter valid children (remove false, null, undefined, true)
function filterChildren(children: JSXChildren): (ElementNode | string | number)[] {
    if (children == null || children === false || children === true) {
        return [];
    }
    if (Array.isArray(children)) {
        return children
            .flat()
            .filter(
                (c): c is ElementNode | string | number =>
                    c != null && c !== false && c !== true
            );
    }
    return [children as ElementNode | string | number];
}

// Process image source
function processImageSrc(src: Buffer | string): string {
    return typeof src === 'string'
        ? src.startsWith('data:')
            ? src
            : `data:image/png;base64,${src}`
        : `data:image/png;base64,${src.toString('base64')}`;
}

// ============================================================================
// JSX Components
// ============================================================================

interface BoxProps {
    style?: CSSProperties;
    children?: JSXChildren;
}

interface RowProps extends BoxProps {
    gap?: number;
    alignItems?: CSSProperties['alignItems'];
    justifyContent?: CSSProperties['justifyContent'];
}

interface ColumnProps extends BoxProps {
    gap?: number;
    alignItems?: CSSProperties['alignItems'];
    justifyContent?: CSSProperties['justifyContent'];
}

interface TextProps {
    style?: CSSProperties;
    children?: string | number | (string | number)[];
}

interface ImgProps {
    src: Buffer | string;
    width?: number;
    height?: number;
    style?: CSSProperties;
}

interface BackgroundProps {
    src: Buffer | string;
    width: number;
    height: number;
    style?: CSSProperties;
    children?: JSXChildren;
}

/**
 * JSX Box component - basic flex container
 */
export function Box({ style, children }: BoxProps): ElementNode {
    return {
        type: 'div',
        props: {
            style: { display: 'flex', ...style },
            children: filterChildren(children)
        }
    };
}

/**
 * JSX Row component - horizontal flex container
 */
export function Row({
    style,
    gap,
    alignItems,
    justifyContent,
    children
}: RowProps): ElementNode {
    return {
        type: 'div',
        props: {
            style: {
                display: 'flex',
                flexDirection: 'row',
                ...(gap !== undefined && { gap }),
                ...(alignItems !== undefined && { alignItems }),
                ...(justifyContent !== undefined && { justifyContent }),
                ...style
            },
            children: filterChildren(children)
        }
    };
}

/**
 * JSX Column component - vertical flex container
 */
export function Column({
    style,
    gap,
    alignItems,
    justifyContent,
    children
}: ColumnProps): ElementNode {
    return {
        type: 'div',
        props: {
            style: {
                display: 'flex',
                flexDirection: 'column',
                ...(gap !== undefined && { gap }),
                ...(alignItems !== undefined && { alignItems }),
                ...(justifyContent !== undefined && { justifyContent }),
                ...style
            },
            children: filterChildren(children)
        }
    };
}

/**
 * JSX Text component - renders text content
 */
export function Text({ style, children }: TextProps): ElementNode {
    const text = Array.isArray(children) ? children.join('') : String(children ?? '');
    return {
        type: 'span',
        props: {
            style: { display: 'flex', ...style },
            children: text
        }
    };
}

/**
 * JSX Img component - renders an image
 */
export function Img({ src, width, height, style }: ImgProps): ElementNode {
    return {
        type: 'img',
        props: {
            src: processImageSrc(src),
            width,
            height,
            style: { ...style }
        }
    };
}

/**
 * JSX Background component - container with background image
 */
export function Background({
    src,
    width,
    height,
    style,
    children
}: BackgroundProps): ElementNode {
    return {
        type: 'div',
        props: {
            style: {
                display: 'flex',
                position: 'relative',
                backgroundImage: `url(${processImageSrc(src)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                width,
                height,
                ...style
            },
            children: filterChildren(children)
        }
    };
}

/**
 * JSX Center component - centered flex container
 */
export function Center({ style, children }: BoxProps): ElementNode {
    return {
        type: 'div',
        props: {
            style: {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                ...style
            },
            children: filterChildren(children)
        }
    };
}

/**
 * JSX Absolute component - absolute positioned container
 */
export function Absolute({
    style,
    children
}: BoxProps & {
    style?: CSSProperties & {
        top?: number;
        left?: number;
        right?: number;
        bottom?: number;
    };
}): ElementNode {
    return {
        type: 'div',
        props: {
            style: {
                display: 'flex',
                position: 'absolute',
                ...style
            },
            children: filterChildren(children)
        }
    };
}

/**
 * Helper to create styles for text with outline/stroke effect
 */
export function textOutline(color: string = '#000000', width: number = 2): CSSProperties {
    const offsets = [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0]
    ];

    return {
        textShadow: offsets
            .map(([x, y]) => `${x * width}px ${y * width}px 0 ${color}`)
            .join(', ')
    };
}
