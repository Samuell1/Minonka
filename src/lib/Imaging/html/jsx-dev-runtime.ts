// Development JSX runtime - re-exports from production runtime
import { jsx, jsxs, Fragment, JSX } from './jsx-runtime';

// jsxDEV is the development version of jsx, used when source maps are needed
// We just use the production jsx since we don't need dev-specific features
export const jsxDEV = jsx;

export { jsx, jsxs, Fragment, JSX };
