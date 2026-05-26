/** Viewport width (px) at or above which the 3-column desktop scanner is shown. */
export const SCANNER_DESKTOP_MIN_PX = 1280;

/** Matches Tailwind `xl` — keep in sync with mobile/desktop class breakpoints. */
export const SCANNER_DESKTOP_MEDIA = `(min-width: ${SCANNER_DESKTOP_MIN_PX}px)`;
