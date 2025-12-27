import type React from 'react';

// Re-export satori types
export type { Font } from 'satori';

// CSS properties supported by satori (subset of React.CSSProperties)
export type CSSProperties = React.CSSProperties;

// Element node structure for satori
export type ElementNode = {
    type: string;
    props: {
        style?: CSSProperties;
        children?: ElementNode | ElementNode[] | string | number;
        src?: string;
        width?: number;
        height?: number;
        [key: string]: unknown;
    };
};

// Shorthand for common style patterns
export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export type JustifyContent =
    | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'space-between'
    | 'space-around'
    | 'space-evenly';
export type AlignItems = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
export type TextAlign = 'left' | 'center' | 'right';

// Render options
export type RenderOptions = {
    width: number;
    height: number;
    debug?: boolean;
};

// Color constants (re-exported from original types)
export const Color = {
    // RANK
    IRON: '#99978b',
    BRONZE: '#966502',
    SILVER: '#99978b',
    GOLD: '#e6c41c',
    PLATINUM: '#49ebaa',
    EMERALD: '#1b9627',
    DIAMOND: '#5149eb',
    MASTER: '#8117b3',
    GRANDMASTER: '#9e0606',
    CHALLENGER: '#e5f051',

    // OTHER
    GREEN: '#1fed18',
    RED: '#ff0000',
    YELLOW: '#fff000',
    GRAY: '#8A8578',
    WHITE: '#FFFFFF',
    BLACK: '#000000',
    TRANSPARENT: 'transparent'
} as const;

export type ColorKey = keyof typeof Color;
