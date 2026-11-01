/* fonts.ts: the faces the share images (src/lib/og/render.ts) are set in, for the build step only
   (scripts/build-og-images.mjs and the unit tests; never imported by a page).

   The brand typeface, Open Sauce One, is read from the files the site serves (public/fonts, one
   static file per weight). It covers Latin only, so every character it lacks falls back, per
   grapheme, to a Noto face that has it: Noto Sans Devanagari for Hindi and Noto Sans SC for
   Chinese (both variable, both SIL OFL 1.1, from the pinned @fontsource-variable packages). The
   Chinese face comes in the slices Google Fonts cuts it into (one file per unicode-range), so only
   the slices a text needs are opened (`prepare`). Every file is WOFF2, which HarfBuzz cannot read:
   wawoff2 (Google's decoder in WebAssembly, pinned) turns each into the TrueType it wraps.

   A character no face has is a missing glyph (tofu): `pick` answers null and the renderer refuses
   the text, so a title that cannot be drawn fails the build instead of shipping an empty box. */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as hb from "harfbuzzjs";
import wawoff2 from "wawoff2";

/** The weights the cards use: the company titles (Light), body, the host label, the gateway titles. */
export type OgWeight = 300 | 400 | 500 | 600;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const require = createRequire(import.meta.url);

/* public/fonts: the files the site's @font-face rules load (src/styles/cosmos.css). */
const OPEN_SAUCE: Record<OgWeight, string> = {
  300: "OpenSauceOne-Light.woff2",
  400: "OpenSauceOne-Regular.woff2",
  500: "OpenSauceOne-Medium.woff2",
  600: "OpenSauceOne-SemiBold.woff2",
};

/** One face at one weight, ready to shape with. */
export interface OgFace {
  /** A stable name: the file and the weight (runs of the same face share it). */
  id: string;
  font: hb.Font;
  upem: number;
  /** The brand face: titles take its tracking; the fallbacks keep their own spacing (tracking
   *  breaks the headline bar of Devanagari and the grid of Chinese). */
  brand: boolean;
  has(cp: number): boolean;
}

interface Slice {
  file: string;
  ranges: [number, number][];
}

/** The `@font-face` blocks of a fontsource stylesheet: each file with its unicode-range. */
function slicesOf(css: string, dir: string): Slice[] {
  const out: Slice[] = [];
  for (const block of css.split("@font-face").slice(1)) {
    const src = /url\(\.\/files\/([^)]+\.woff2)\)/.exec(block);
    const range = /unicode-range:\s*([^;]+);/.exec(block);
    if (!src || !range) continue;
    const ranges = range[1].split(",").map((part): [number, number] => {
      const [a, b] = part.trim().replace(/^U\+/i, "").split("-");
      return [parseInt(a, 16), parseInt(b ?? a, 16)];
    });
    out.push({ file: path.join(dir, "files", src[1]), ranges });
  }
  return out;
}

const inRanges = (cp: number, ranges: [number, number][]): boolean => ranges.some(([a, b]) => cp >= a && cp <= b);

function packageDir(name: string): string {
  return path.dirname(require.resolve(`${name}/package.json`));
}

/* The decoder answers a view into its WebAssembly memory, which the next file it decodes
   overwrites: keep a copy. */
async function ttfOf(file: string): Promise<Uint8Array> {
  return (await wawoff2.decompress(readFileSync(file))).slice();
}

/** A HarfBuzz face over TrueType bytes, at `weight` (a variable face takes it as its wght axis). */
function faceOf(id: string, ttf: Uint8Array, weight: OgWeight | null, brand: boolean): OgFace {
  const face = new hb.Face(new hb.Blob(ttf));
  const font = new hb.Font(face);
  if (weight !== null) font.setVariations([new hb.Variation("wght", weight)]);
  const covered = new Set(face.collectUnicodes());
  return { id, font, upem: face.upem, brand, has: (cp) => covered.has(cp) };
}

/**
 * The faces of every weight the cards use, with the fallback order: Open Sauce One, then Noto
 * Sans Devanagari, then Noto Sans SC (the slice that holds the character), then the Latin slices
 * of the Devanagari face for a symbol Open Sauce One lacks.
 */
export class OgFonts {
  private brand = new Map<OgWeight, OgFace>();
  private deva = new Map<OgWeight, OgFace>();
  private latin = new Map<OgWeight, OgFace[]>();
  private han: Slice[];
  private hanFaces = new Map<string, OgFace>();
  private hanTtf = new Map<string, Promise<Uint8Array>>();

  private constructor(han: Slice[]) {
    this.han = han;
  }

  static async load(): Promise<OgFonts> {
    const devaDir = packageDir("@fontsource-variable/noto-sans-devanagari");
    const hanDir = packageDir("@fontsource-variable/noto-sans-sc");
    const fonts = new OgFonts(slicesOf(readFileSync(path.join(hanDir, "wght.css"), "utf8"), hanDir));
    const deva = slicesOf(readFileSync(path.join(devaDir, "wght.css"), "utf8"), devaDir);
    const devaMain = deva.find((s) => s.file.includes("-devanagari-wght"));
    if (!devaMain) throw new Error("og fonts: the Devanagari slice of Noto Sans Devanagari is missing");
    const devaLatin = deva.filter((s) => s !== devaMain);
    const devaTtf = await ttfOf(devaMain.file);
    const latinTtf = await Promise.all(devaLatin.map((s) => ttfOf(s.file)));
    for (const weight of Object.keys(OPEN_SAUCE).map(Number) as OgWeight[]) {
      const file = path.join(ROOT, "public", "fonts", OPEN_SAUCE[weight]);
      fonts.brand.set(weight, faceOf(`${OPEN_SAUCE[weight]}`, await ttfOf(file), null, true));
      fonts.deva.set(weight, faceOf(`noto-deva@${weight}`, devaTtf, weight, false));
      fonts.latin.set(
        weight,
        latinTtf.map((ttf, i) => faceOf(`noto-deva-latin${i}@${weight}`, ttf, weight, false)),
      );
    }
    return fonts;
  }

  /** Opens the Chinese slices `text` needs, at `weight`; call before `pick` for that text. */
  async prepare(text: string, weight: OgWeight): Promise<void> {
    const brand = this.brand.get(weight) as OgFace;
    const deva = this.deva.get(weight) as OgFace;
    for (const ch of text) {
      const cp = ch.codePointAt(0) as number;
      if (brand.has(cp) || deva.has(cp)) continue;
      for (const slice of this.han) {
        if (!inRanges(cp, slice.ranges)) continue;
        const key = `${slice.file}@${weight}`;
        if (!this.hanFaces.has(key)) {
          if (!this.hanTtf.has(slice.file)) this.hanTtf.set(slice.file, ttfOf(slice.file));
          const ttf = await (this.hanTtf.get(slice.file) as Promise<Uint8Array>);
          this.hanFaces.set(key, faceOf(`noto-sc:${path.basename(slice.file)}@${weight}`, ttf, weight, false));
        }
        if ((this.hanFaces.get(key) as OgFace).has(cp)) break;
      }
    }
  }

  /** The brand face at `weight` (labels and the host name are set in it). */
  brandFace(weight: OgWeight): OgFace {
    return this.brand.get(weight) as OgFace;
  }

  /** The first face, in fallback order, that has every code point of `cluster`; null when none
   *  does (a missing glyph). Joiners and variation selectors ride with whatever face takes the
   *  rest of the cluster. */
  pick(cluster: string, weight: OgWeight): OgFace | null {
    const cps = [...cluster].map((c) => c.codePointAt(0) as number).filter((cp) => !ignorable(cp));
    if (cps.length === 0) return this.brand.get(weight) as OgFace;
    const hanFaces = [...this.hanFaces.entries()].filter(([key]) => key.endsWith(`@${weight}`)).map(([, face]) => face);
    const chain = [this.brand.get(weight), this.deva.get(weight), ...hanFaces, ...(this.latin.get(weight) ?? [])] as OgFace[];
    return chain.find((face) => cps.every((cp) => face.has(cp))) ?? null;
  }
}

/* Zero-width joiners and non-joiners, variation selectors: they shape with their neighbours and
   need no glyph of their own. */
function ignorable(cp: number): boolean {
  return cp === 0x200c || cp === 0x200d || (cp >= 0xfe00 && cp <= 0xfe0f);
}
