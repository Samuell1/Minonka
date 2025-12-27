import type { CSSProperties, ElementNode } from './types';

type JSXChild = ElementNode | string | number | boolean | null | undefined;
type JSXChildren = JSXChild | JSXChild[];

interface JSXProps {
    style?: CSSProperties;
    children?: JSXChildren;
    src?: string | Buffer;
    width?: number;
    height?: number;
    [key: string]: unknown;
}

function normalizeChildren(children: JSXChildren): (ElementNode | string | number)[] {
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

function processImageSrc(src: string | Buffer | undefined): string | undefined {
    if (!src) return undefined;
    if (typeof src === 'string') {
        return src.startsWith('data:') ? src : `data:image/png;base64,${src}`;
    }
    return `data:image/png;base64,${src.toString('base64')}`;
}

export function jsx(
    type: string | ((props: JSXProps) => ElementNode),
    props: JSXProps
): ElementNode {
    // Handle function components
    if (typeof type === 'function') {
        return type(props);
    }

    const { children, style, src, width, height, ...rest } = props;
    const normalizedChildren = normalizeChildren(children);

    // Handle img elements specially
    if (type === 'img') {
        return {
            type: 'img',
            props: {
                src: processImageSrc(src as string | Buffer | undefined),
                width,
                height,
                style: {
                    ...style
                },
                ...rest
            }
        };
    }

    // Handle div elements with flex default
    if (type === 'div') {
        return {
            type: 'div',
            props: {
                style: {
                    display: 'flex',
                    ...style
                },
                children:
                    normalizedChildren.length === 1
                        ? normalizedChildren[0]
                        : normalizedChildren.length > 0
                          ? normalizedChildren
                          : undefined,
                ...rest
            }
        };
    }

    // Handle span/text elements
    if (type === 'span') {
        return {
            type: 'span',
            props: {
                style: {
                    display: 'flex',
                    ...style
                },
                children:
                    normalizedChildren.length === 1
                        ? normalizedChildren[0]
                        : normalizedChildren.length > 0
                          ? normalizedChildren
                          : undefined,
                ...rest
            }
        };
    }

    // Default handling for other elements
    return {
        type,
        props: {
            style,
            children:
                normalizedChildren.length === 1
                    ? normalizedChildren[0]
                    : normalizedChildren.length > 0
                      ? normalizedChildren
                      : undefined,
            ...rest
        }
    };
}

// jsxs is used when there are multiple children
export const jsxs = jsx;

// Fragment support (useful for grouping without a wrapper)
export function Fragment({ children }: { children?: JSXChildren }): ElementNode {
    const normalizedChildren = normalizeChildren(children);
    return {
        type: 'fragment',
        props: {
            children: normalizedChildren
        }
    };
}

// JSX types for TypeScript
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    export interface Element extends ElementNode {}

    export interface IntrinsicElements {
        div: {
            style?: CSSProperties;
            children?: JSXChildren;
        };
        span: {
            style?: CSSProperties;
            children?: JSXChildren;
        };
        img: {
            src?: string | Buffer;
            width?: number;
            height?: number;
            style?: CSSProperties;
        };
    }

    export interface ElementChildrenAttribute {
        children: unknown;
    }
}
