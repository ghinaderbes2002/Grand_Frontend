/*
 * Kept out of the toggle's "use client" module on purpose: a server component
 * importing a value from a client module receives a client reference, not the
 * value — the root layout would inline a reference instead of the script.
 */

/** Where the explicit choice is kept. Absent means "follow the system". */
export const THEME_STORAGE_KEY = "theme";

/**
 * Runs in `<head>` before first paint and restores an explicit choice, so a
 * visitor who picked dark never sees a flash of the light page. It only ever
 * *sets* the attribute — with nothing stored, the stylesheet's media query
 * follows the system on its own. Wrapped in try/catch because storage access
 * throws in some private modes, and the page must render regardless.
 */
export const themeInitScript = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;
