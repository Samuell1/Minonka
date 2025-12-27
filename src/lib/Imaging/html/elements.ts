import type { CSSProperties, ElementNode } from './types';

/**
 * Creates a div element with flexbox layout
 */
export function div(
    style: CSSProperties,
    ...children: (ElementNode | string | number | null | undefined)[]
): ElementNode {
    return {
        type: 'div',
        props: {
            style: {
                display: 'flex',
                ...style
            },
            children: children.filter(
                (c): c is ElementNode | string | number => c != null
            ) as ElementNode[]
        }
    };
}

/**
 * Creates a span/text element
 */
export function span(style: CSSProperties, text: string | number): ElementNode {
    return {
        type: 'span',
        props: {
            style: {
                display: 'flex',
                ...style
            },
            children: String(text)
        }
    };
}

/**
 * Creates a text element with optional colored segments
 */
export function text(
    style: CSSProperties,
    content:
        | string
        | number
        | (string | number | { text: string | number; color: string })[]
): ElementNode {
    if (typeof content === 'string' || typeof content === 'number') {
        return span(style, content);
    }

    // Multi-colored text
    const children = content.map((segment, i) => {
        if (typeof segment === 'string' || typeof segment === 'number') {
            return span({ ...style }, segment);
        }
        return span({ ...style, color: segment.color }, segment.text);
    });

    return div(
        {
            ...style,
            display: 'flex',
            flexDirection: 'row'
        },
        ...children
    );
}

/**
 * Creates an image element from a buffer or base64 string
 */
export function img(
    src: Buffer | string,
    style: CSSProperties & { width?: number; height?: number } = {}
): ElementNode {
    const srcString =
        typeof src === 'string'
            ? src.startsWith('data:')
                ? src
                : `data:image/png;base64,${src}`
            : `data:image/png;base64,${src.toString('base64')}`;

    return {
        type: 'img',
        props: {
            src: srcString,
            width: style.width,
            height: style.height,
            style: {
                ...style
            }
        }
    };
}

/**
 * Creates a container with absolute positioning for layering
 */
export function absolute(
    style: CSSProperties & {
        top?: number;
        left?: number;
        right?: number;
        bottom?: number;
    },
    ...children: (ElementNode | string | number | null | undefined)[]
): ElementNode {
    return div(
        {
            position: 'absolute',
            ...style
        },
        ...children
    );
}

/**
 * Creates a flex container with common layout patterns
 */
export function flex(
    direction: 'row' | 'column',
    style: CSSProperties,
    ...children: (ElementNode | string | number | null | undefined)[]
): ElementNode {
    return div(
        {
            display: 'flex',
            flexDirection: direction,
            ...style
        },
        ...children
    );
}

/**
 * Creates a centered container
 */
export function center(
    style: CSSProperties,
    ...children: (ElementNode | string | number | null | undefined)[]
): ElementNode {
    return div(
        {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            ...style
        },
        ...children
    );
}

/**
 * Creates a row with items evenly spaced
 */
export function row(
    style: CSSProperties,
    ...children: (ElementNode | string | number | null | undefined)[]
): ElementNode {
    return div(
        {
            display: 'flex',
            flexDirection: 'row',
            ...style
        },
        ...children
    );
}

/**
 * Creates a column layout
 */
export function column(
    style: CSSProperties,
    ...children: (ElementNode | string | number | null | undefined)[]
): ElementNode {
    return div(
        {
            display: 'flex',
            flexDirection: 'column',
            ...style
        },
        ...children
    );
}

/**
 * Creates a background container with an image
 */
export function background(
    src: Buffer | string,
    style: CSSProperties & { width: number; height: number },
    ...children: (ElementNode | string | number | null | undefined)[]
): ElementNode {
    const srcString =
        typeof src === 'string'
            ? src.startsWith('data:')
                ? src
                : `data:image/png;base64,${src}`
            : `data:image/png;base64,${src.toString('base64')}`;

    return div(
        {
            position: 'relative',
            backgroundImage: `url(${srcString})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            ...style
        },
        ...children
    );
}

/**
 * Helper to create styles for text with outline/stroke effect
 * Note: Satori has limited support for text-stroke, using text-shadow as fallback
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
        textShadow: offsets.map(([x, y]) => `${x * width}px ${y * width}px 0 ${color}`).join(', ')
    };
}
