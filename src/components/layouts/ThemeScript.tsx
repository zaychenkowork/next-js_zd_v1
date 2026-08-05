import { STORAGE_KEYS } from '~/constants/storageKeys';

/**
 * Applies the stored (or system) theme before the browser paints, which is the
 * only way to avoid a flash of the wrong theme without making the whole route
 * dynamic.
 *
 * The alternative is a cookie read in the layout, which works but calls
 * `cookies()` and therefore opts every page out of static rendering. For a
 * preference this cheap, a blocking inline script is the better trade.
 *
 * React 19 hoists `<link>`, `<meta>` and `<script src>` into `<head>`, but *not*
 * inline scripts — so this must be rendered as the first child of `<body>`,
 * where it still runs before any content is painted.
 *
 * If a strict CSP is ever added, this needs a nonce (`headers().get(...)` in the
 * layout, passed through to the `nonce` attribute).
 */
const themeScript = `(function(){try{var k=${JSON.stringify(
  STORAGE_KEYS.theme,
)};var t=localStorage.getItem(k);if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
