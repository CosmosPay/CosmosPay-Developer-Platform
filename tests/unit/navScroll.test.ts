import { test } from "node:test";
import assert from "node:assert/strict";
import { NAV_HEIGHT, NAV_SCROLL_SCRIPT, NAV_SCROLL_THRESHOLD } from "@/lib/nav-scroll";

/* The head script that keeps the nav's surface right before (or without) React: run against a
   minimal page, it marks <html> as Nav.tsx would, at the same thresholds. */
function page(panelHeight: number | null) {
  const attrs = new Set<string>();
  const handlers: Record<string, (() => void)[]> = {};
  const win = { scrollY: 0 };
  const panel = panelHeight === null ? null : { offsetHeight: panelHeight };
  let parsed = false;
  const env = {
    window: win,
    document: {
      documentElement: { hasAttribute: (k: string) => attrs.has(k), toggleAttribute: (k: string, on: boolean) => void (on ? attrs.add(k) : attrs.delete(k)) },
      querySelector: (sel: string) => (sel === "main section[data-panel]" && parsed ? panel : null),
    },
    addEventListener: (type: string, fn: () => void) => void (handlers[type] ??= []).push(fn),
  };
  new Function("window", "document", "addEventListener", NAV_SCROLL_SCRIPT)(env.window, env.document, env.addEventListener);
  const fire = (type: string) => handlers[type]?.forEach((fn) => fn());
  return { attrs, win, fire, parse: () => { parsed = true; fire("DOMContentLoaded"); } };
}

test("data-scrolled follows the page past the nav's threshold, both ways", () => {
  const p = page(null);
  p.parse();
  assert.equal(p.attrs.has("data-scrolled"), false);
  p.win.scrollY = NAV_SCROLL_THRESHOLD + 1; p.fire("scroll");
  assert.equal(p.attrs.has("data-scrolled"), true);
  p.win.scrollY = 0; p.fire("scroll");
  assert.equal(p.attrs.has("data-scrolled"), false);
});

test("data-past-panel is set once the first panel is under the bar, never before the panel is parsed", () => {
  const p = page(600);
  p.win.scrollY = 5000; p.fire("scroll");
  assert.equal(p.attrs.has("data-past-panel"), false, "no panel in the DOM yet: the first paint keeps its ink");
  p.parse();
  assert.equal(p.attrs.has("data-past-panel"), true);
  p.win.scrollY = 600 - NAV_HEIGHT - 1; p.fire("scroll");
  assert.equal(p.attrs.has("data-past-panel"), false);
  p.win.scrollY = 600 - NAV_HEIGHT; p.fire("scroll");
  assert.equal(p.attrs.has("data-past-panel"), true);
});

test("a page shown again from the back-forward cache is read again", () => {
  const p = page(null);
  p.parse();
  p.win.scrollY = 300; p.fire("pageshow");
  assert.equal(p.attrs.has("data-scrolled"), true);
});
