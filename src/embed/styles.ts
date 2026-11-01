/* styles.ts: the embed's CSS, scoped by each element's shadow root.

   The institutional skin of the payments site (src/styles/institutional.css), reduced to
   what an element on someone else's page needs: black is primary (the pill button, #13131A
   with white text; inverted in dark mode), neutral greys for surfaces and lines, solid colours
   only: no gradients, no decorative chips, no shadow beyond a hairline border. Status is
   coloured text with a dot, as on the hosted checkout. Open Sauce One is not served to
   third-party pages, so the type is the system stack.

   `theme` is `data-theme` on the root (`.cp`): light, dark, or auto (the payer's scheme). */

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';

const LIGHT = `
  --cp-surface: #FFFFFF; --cp-surface-2: #F6F6F7; --cp-ink: #13131A; --cp-ink-2: #4A4A55;
  --cp-ink-3: #6A6A75; --cp-line: #E6E6EA; --cp-line-2: #D2D2D8;
  --cp-btn-bg: #13131A; --cp-btn-fg: #FFFFFF; --cp-btn-bg-h: #2A2A33;
  --cp-focus: #2346F4; --cp-ok: #1F7A4D; --cp-bad: #B42318;`;

const DARK = `
  --cp-surface: #15151B; --cp-surface-2: #1C1C24; --cp-ink: #F2F2F5; --cp-ink-2: #B4B4BE;
  --cp-ink-3: #92929D; --cp-line: rgba(255, 255, 255, .09); --cp-line-2: rgba(255, 255, 255, .17);
  --cp-btn-bg: #FFFFFF; --cp-btn-fg: #13131A; --cp-btn-bg-h: #E6E6EA;
  --cp-focus: #8FA3FF; --cp-ok: #7EE0A8; --cp-bad: #FF9C94;`;

const BASE = `
:host { font-family: ${FONT}; }
:host([hidden]) { display: none !important; }
[hidden] { display: none !important; }
.cp { ${LIGHT} box-sizing: border-box; font-family: ${FONT}; color: var(--cp-ink); -webkit-text-size-adjust: 100%; }
.cp[data-theme="dark"] { ${DARK} color-scheme: dark; }
@media (prefers-color-scheme: dark) { .cp[data-theme="auto"] { ${DARK} color-scheme: dark; } }
.cp *, .cp *::before, .cp *::after { box-sizing: border-box; }

.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 44px; margin: 0; padding: 10px 22px; border-radius: 999px;
  border: 1.5px solid var(--cp-btn-bg); background: var(--cp-btn-bg); color: var(--cp-btn-fg);
  font: 600 15px/1.2 ${FONT}; letter-spacing: -0.01em; text-align: center; text-decoration: none;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
  transition: background-color .15s ease, border-color .15s ease, color .15s ease;
}
.btn:hover { background: var(--cp-btn-bg-h); border-color: var(--cp-btn-bg-h); }
.btn:focus-visible { outline: 2px solid var(--cp-focus); outline-offset: 2px; }
.btn[aria-disabled="true"] { opacity: .5; cursor: not-allowed; }
.btn[aria-disabled="true"]:hover { background: var(--cp-btn-bg); border-color: var(--cp-btn-bg); }
.btn-quiet { background: transparent; color: var(--cp-ink); border-color: var(--cp-line-2); }
.btn-quiet:hover { background: transparent; border-color: var(--cp-ink); }
.sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
@media (prefers-reduced-motion: reduce) { .btn { transition: none; } }
@media (forced-colors: active) { .btn { border-color: ButtonText; } }
`;

/* <cosmos-pay-button>: the button IS the root. */
export const BUTTON_CSS = `${BASE}
:host { display: inline-block; vertical-align: middle; }
.cp.btn { width: 100%; }
`;

/* <cosmos-pay-checkout>: one card, as wide as its container up to 420px (the host's
   max-width; a merchant's own rule on the element overrides it). */
export const CHECKOUT_CSS = `${BASE}
:host { display: block; max-width: 420px; }
.cp {
  background: var(--cp-surface); border: 1px solid var(--cp-line); border-radius: 16px;
  padding: 20px; font-size: 15px; line-height: 1.5; text-align: left; overflow-wrap: anywhere;
}
.eyebrow { margin: 0 0 6px; font-size: 13px; color: var(--cp-ink-2); }
.testnet { margin: 0 0 8px; font-size: 13px; font-weight: 600; }
.demo { margin: 0 0 10px; padding: 8px 10px; font-size: 12.5px; line-height: 1.4; color: var(--cp-ink-2); background: var(--cp-surface-2); border-radius: 10px; }
.btn[aria-disabled="true"] { cursor: default; }
.amount { margin: 0; font-size: 30px; font-weight: 600; letter-spacing: -0.03em; line-height: 1.15; font-variant-numeric: tabular-nums; }
.hint { margin: 4px 0 0; font-size: 13.5px; color: var(--cp-ink-2); }
.msg { margin: 8px 0 0; }
.status { margin: 16px 0 0; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; }
.status::before { content: ""; flex: none; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.status[data-phase="paid"] { color: var(--cp-ok); }
.status[data-phase="failed"], .status[data-phase="cancelled"] { color: var(--cp-bad); }
.status[data-phase="expired"] { color: var(--cp-ink-2); }
.status-body { margin: 4px 0 0; font-size: 14px; color: var(--cp-ink-2); }
.pay { margin: 16px 0 0; padding: 16px 0 0; border-top: 1px solid var(--cp-line); display: flex; flex-direction: column; align-items: center; gap: 14px; }
.qr { display: block; width: 200px; max-width: 100%; height: auto; aspect-ratio: 1 / 1; padding: 8px; background: #FFFFFF; border: 1px solid var(--cp-line); border-radius: 12px; }
.pay .btn { width: 100%; }
.demo-run { width: 100%; margin-top: 16px; }
.facts { margin: 16px 0 0; padding: 2px 14px; background: var(--cp-surface-2); border-radius: 12px; }
.row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--cp-line); font-size: 14px; }
.row:last-child { border-bottom: 0; }
.row dt { margin: 0; color: var(--cp-ink-2); flex: none; }
.row dd { margin: 0; text-align: right; font-weight: 500; min-width: 0; }
.by { margin: 14px 0 0; font-size: 12.5px; color: var(--cp-ink-3); text-align: center; }
.loading { display: flex; align-items: center; gap: 10px; min-height: 96px; margin: 0; color: var(--cp-ink-2); }
.spinner { flex: none; width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--cp-line-2); border-top-color: var(--cp-ink); animation: cp-spin .8s linear infinite; }
@keyframes cp-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
.state-title { margin: 0; font-size: 17px; font-weight: 600; letter-spacing: -0.01em; }
.state-body { margin: 6px 0 0; font-size: 14px; color: var(--cp-ink-2); }
.state .btn { margin-top: 14px; }
`;

/* One constructed sheet per element type, shared by every instance. Constructed sheets are
   not inline <style> as far as a merchant's Content-Security-Policy is concerned; a browser
   without them gets a <style> element instead. */
const sheets = new Map<string, CSSStyleSheet>();

export function adoptStyles(root: ShadowRoot, css: string): void {
  if ("adoptedStyleSheets" in root && typeof CSSStyleSheet !== "undefined" && "replaceSync" in CSSStyleSheet.prototype) {
    let sheet = sheets.get(css);
    if (!sheet) {
      sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      sheets.set(css, sheet);
    }
    root.adoptedStyleSheets = [sheet];
    return;
  }
  const style = document.createElement("style");
  style.textContent = css;
  root.append(style);
}
