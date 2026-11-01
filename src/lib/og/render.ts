/* render.ts: the share card of one page in one language, as a 1200x630 PNG, for the build step
   (scripts/build-og-images.mjs) and the unit tests; never imported by a page.

   Drawn from the page's own title and the brand, with no generative step: an SVG of the brand's
   lockup (public/brand), the title set by text.ts as glyph outlines, and the host, rasterised by
   resvg (pinned). Two skins, as the hosts look:
   - the company site (cosmospay.lat): BRAND.md's black panel, the title huge and thin (Open Sauce
     One Light, white) and the brand's ribbon (public/brand/cinta.png) on the right, as the
     existing share card has it;
   - the gateway (payments.cosmospay.lat): the institutional skin (src/styles/institutional.css),
     its neutral canvas and black ink, the title as the pages set theirs (SemiBold, tight
     tracking), the lockup followed by the host's label. Solid colours only, no gradient; the home's
     highlighted word gets the hero's black highlighter (`.pl-hl`).
   Hindi and Chinese titles are set in the Noto faces fonts.ts falls back to, with the line height
   those scripts need. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, type OgCard } from "@/lib/seo/og-images";
import type { OgFonts } from "@/lib/og/fonts";
import { fitTitle, setLine, type SetLine } from "@/lib/og/text";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const W = OG_IMAGE_WIDTH;
const H = OG_IMAGE_HEIGHT;
const PAD = 72;

interface Skin {
  bg: string;
  ink: string;
  /** The host and the label: BRAND.md's secondary text (white at 60 % on black) or the skin's. */
  muted: string;
  label: string;
  line: string;
  /** The words on the highlighter (the block is the ink). */
  markInk: string;
  titleWeight: 300 | 600;
  tracking: number;
  /** Line height of a Latin title (Devanagari and Chinese need more, see `leading`). */
  leading: number;
  titleWidth: number;
  sizes: number[];
}

const range = (from: number, to: number, step: number): number[] => Array.from({ length: Math.floor((from - to) / step) + 1 }, (_, i) => from - i * step);

const SKINS: Record<OgCard["area"], Skin> = {
  // BRAND.md: a black panel, white type, Open Sauce One Light at -0.02em (`.section-head h2`).
  site: { bg: "#000000", ink: "#FFFFFF", muted: "#999999", label: "#999999", line: "#333333", markInk: "#000000", titleWeight: 300, tracking: -0.02, leading: 1.04, titleWidth: 660, sizes: range(88, 48, 2) },
  // institutional.css: --bg, --ink, --ink-3, --ink-2, --line-2; `.pl-page-title` sets 600 at -0.035em.
  payments: { bg: "#F6F6F7", ink: "#13131A", muted: "#6A6A75", label: "#4A4A55", line: "#D2D2D8", markInk: "#FFFFFF", titleWeight: 600, tracking: -0.035, leading: 1.06, titleWidth: W - 2 * PAD, sizes: range(80, 44, 2) },
};

const DEVANAGARI = /\p{Script=Devanagari}/u;
const HAN = /\p{Script=Han}/u;

/** Line height for a title: Devanagari stacks vowel signs above and below the headline bar, and
 *  Chinese sits on a square grid, so both get more room than Latin. */
function leading(title: string, skin: Skin): number {
  if (DEVANAGARI.test(title)) return Math.max(skin.leading, 1.32);
  if (HAN.test(title)) return Math.max(skin.leading, 1.22);
  return skin.leading;
}

/* ---------- brand files ---------- */

const brandFile = (name: string): string => readFileSync(path.join(ROOT, "public", "brand", name), "utf8");

/** The stacked lockup (isotype + "cosmos" over "pay"), one colour, as a nested SVG at `height`. */
function lockup(x: number, y: number, height: number, color: string): { svg: string; width: number } {
  const source = brandFile("lockup-cosmos-pay-mono.svg");
  const viewBox = /viewBox="([^"]+)"/.exec(source)?.[1] ?? "0 0 235.27 66.17";
  const [, , vw, vh] = viewBox.split(/\s+/).map(Number);
  const inner = source.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").replaceAll("currentColor", color);
  const width = (height * vw) / vh;
  return { svg: `<svg x="${x}" y="${y}" width="${width.toFixed(2)}" height="${height}" viewBox="${viewBox}">${inner}</svg>`, width };
}

/* Where the ribbon (1672x941) sits on the company card: its loops on the right half, clear of the
   title's box. */
const RIBBON = { x: 640, y: 30, w: 900 };

let ribbonData: string | null = null;
/** The brand's ribbon (BRAND.md: it lives on black or navy), as a data URI. */
function ribbon(): string {
  ribbonData ??= `data:image/png;base64,${readFileSync(path.join(ROOT, "public", "brand", "cinta.png")).toString("base64")}`;
  return ribbonData;
}

/* ---------- text as paths ---------- */

const num = (n: number): string => (Math.round(n * 100) / 100).toString();

/** A set line's glyphs as paths with their baseline at (x, y); the highlighted ones in `markInk`. */
function glyphPaths(line: SetLine, x: number, y: number, fill: string, markInk = fill): string {
  return line.glyphs
    .filter((g) => g.d)
    .map((g) => `<path fill="${g.marked ? markInk : fill}" transform="translate(${num(x + g.x)} ${num(y + g.y)}) scale(${num(g.scale)} ${num(-g.scale)})" d="${g.d}"/>`)
    .join("");
}

/** How far the highlighter's block reaches over and under the baseline, in em: the letters' own
 *  height in each script (Devanagari's vowel signs rise over the headline bar). */
function markExtent(mark: string): [number, number] {
  if (DEVANAGARI.test(mark)) return [1.04, 0.34];
  if (HAN.test(mark)) return [0.92, 0.18];
  return [0.86, 0.22];
}

/* ---------- the card ---------- */

/** The card of `card` as SVG, its glyphs already outlines. */
export async function cardSvg(card: OgCard, fonts: OgFonts): Promise<string> {
  const skin = SKINS[card.area];
  await fonts.prepare(card.title, skin.titleWeight);
  await fonts.prepare(card.label ?? "", 500);
  await fonts.prepare(card.host, 400);
  const parts: string[] = [`<rect width="${W}" height="${H}" fill="${skin.bg}"/>`];

  if (card.area === "site") {
    // The ribbon on the right, as on the existing card: its loops clear of the title's box.
    parts.push(`<image href="${ribbon()}" x="${RIBBON.x}" y="${RIBBON.y}" width="${RIBBON.w}" height="${num((RIBBON.w * 941) / 1672)}" preserveAspectRatio="xMidYMid slice"/>`);
  }

  // Header: the lockup, then the host's label after a hairline (the gateway: "Payments").
  const logoH = 54;
  const logo = lockup(PAD, 64, logoH, skin.ink);
  parts.push(logo.svg);
  if (card.label) {
    const labelStyle = { weight: 500 as const, size: 30, tracking: -0.01 };
    const label = setLine(card.label, fonts, labelStyle, "en");
    const ruleX = PAD + logo.width + 24;
    parts.push(`<rect x="${num(ruleX)}" y="${64 + 6}" width="1.5" height="${logoH - 12}" fill="${skin.line}"/>`);
    // Centred on the lockup: its cap height (about 0.7 em) halves around the lockup's middle.
    parts.push(glyphPaths(label, ruleX + 24, 64 + logoH / 2 + labelStyle.size * 0.35, skin.label));
  }

  // Footer: the host, in the secondary ink.
  const hostStyle = { weight: 400 as const, size: 26, tracking: 0 };
  const host = setLine(card.host, fonts, hostStyle, "en");
  const footY = H - 64;
  parts.push(glyphPaths(host, PAD, footY, skin.muted));

  // The title: as large as fits three lines of its box, balanced, its last line a fixed distance
  // over the footer, so short titles leave the air above them (BRAND.md: "mucho aire").
  const lh = leading(card.title, skin);
  const fitted = fitTitle(card.title, fonts, { weight: skin.titleWeight, tracking: skin.tracking, mark: card.mark }, { width: skin.titleWidth, maxLines: 3, sizes: skin.sizes }, card.lang);
  const step = fitted.size * lh;
  const lastBaseline = footY - hostStyle.size - 64;
  fitted.lines.forEach((line, i) => {
    const baseline = lastBaseline - (fitted.lines.length - 1 - i) * step;
    if (line.mark && card.mark) {
      // The hero's highlighter: a solid block behind the words, the words in the canvas colour.
      const [over, under] = markExtent(card.mark);
      const top = baseline - fitted.size * over;
      const height = fitted.size * (over + under);
      parts.push(`<rect x="${num(PAD + line.mark.x0)}" y="${num(top)}" width="${num(line.mark.x1 - line.mark.x0)}" height="${num(height)}" rx="${num(0.08 * fitted.size)}" fill="${skin.ink}"/>`);
    }
    parts.push(glyphPaths(line, PAD, baseline, skin.ink, skin.markInk));
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>`;
}

/** The card of `card` as a PNG. */
export async function renderCard(card: OgCard, fonts: OgFonts): Promise<Buffer> {
  const svg = await cardSvg(card, fonts);
  const png = new Resvg(svg, { fitTo: { mode: "original" }, font: { loadSystemFonts: false }, shapeRendering: 2, imageRendering: 0 }).render();
  return png.asPng();
}
