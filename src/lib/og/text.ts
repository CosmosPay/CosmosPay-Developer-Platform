/* text.ts: sets a line of text in the share images' faces (src/lib/og/fonts.ts) and breaks a title
   into lines, for the build step only.

   HarfBuzz shapes every run (the same engine browsers use), so Devanagari conjuncts and vowel
   signs come out as a Hindi reader expects, and the glyphs are drawn as paths: the PNG needs no
   font at all. A title is broken at spaces, and in Chinese between words as well (Intl.Segmenter's
   word boundaries), never before closing punctuation or after opening punctuation; then the lines
   are balanced (as `text-wrap: balance` does on the pages) and the size steps down until the
   title fits in its box. */
import * as hb from "harfbuzzjs";
import type { OgFace, OgFonts, OgWeight } from "@/lib/og/fonts";

export interface TextStyle {
  weight: OgWeight;
  /** Font size in pixels. */
  size: number;
  /** Letter spacing of the brand face, in em (the pages' titles track tight). */
  tracking: number;
  /** Words set on the highlighter, where a line holds them: they get the highlighter's padding on
   *  both sides (`.pl-hl`: 0 .08em), so the block never covers the letters beside it. */
  mark?: string;
}

/** The highlighter's side padding, in em (`.pl-hl` in src/styles/payments-landing.css). */
export const MARK_PAD = 0.08;

/** A glyph placed on its line: its outline in font units (y up) and where it sits. */
export interface PlacedGlyph {
  d: string;
  x: number;
  y: number;
  scale: number;
  /** On the highlighter. */
  marked: boolean;
}

export interface SetLine {
  text: string;
  width: number;
  glyphs: PlacedGlyph[];
  /** The highlighter's block on this line, padding included, when the line holds the mark. */
  mark: { x0: number; x1: number } | null;
}

const graphemes = new Intl.Segmenter("und", { granularity: "grapheme" });

interface Run {
  face: OgFace;
  text: string;
  /** Where the run starts in the line (UTF-16). */
  start: number;
}

/** The line cut into runs of one face each. A space keeps the face before it when that face has
 *  one, so a word and the space after it shape together. Throws on a character no face has. */
function itemize(text: string, fonts: OgFonts, weight: OgWeight): Run[] {
  const runs: Run[] = [];
  for (const { segment, index } of graphemes.segment(text)) {
    const prev = runs.at(-1);
    const face = /^\s+$/u.test(segment) && prev && [...segment].every((c) => prev.face.has(c.codePointAt(0) as number)) ? prev.face : fonts.pick(segment, weight);
    if (!face) {
      const codes = [...segment].map((c) => `U+${(c.codePointAt(0) as number).toString(16).toUpperCase().padStart(4, "0")}`).join(" ");
      throw new Error(`og text: no face has "${segment}" (${codes}) in "${text}"`);
    }
    if (prev && prev.face.id === face.id) prev.text += segment;
    else runs.push({ face, text: segment, start: index });
  }
  return runs;
}

/** Shapes `text` as one line: its glyphs from x = 0 on the baseline, and its width. */
export function setLine(text: string, fonts: OgFonts, style: TextStyle, lang: string): SetLine {
  const glyphs: PlacedGlyph[] = [];
  let x = 0;
  // The tracking after the last glyph is not part of the line's width.
  let trailing = 0;
  // The highlighted words, by UTF-16 index, and the block drawn behind them.
  const from = style.mark ? text.indexOf(style.mark) : -1;
  const to = from + (style.mark?.length ?? 0);
  const pad = MARK_PAD * style.size;
  let mark: SetLine["mark"] = null;
  const closeMark = () => {
    if (mark && mark.x1 < 0) {
      x += pad;
      mark.x1 = x;
      trailing = 0;
    }
  };
  for (const run of itemize(text, fonts, style.weight)) {
    const buffer = new hb.Buffer();
    buffer.addText(run.text);
    buffer.guessSegmentProperties();
    buffer.setLanguage(lang);
    hb.shape(run.face.font, buffer);
    const infos = buffer.getGlyphInfos();
    const positions = buffer.getGlyphPositions();
    const scale = style.size / run.face.upem;
    const track = run.face.brand ? style.tracking * style.size : 0;
    for (let i = 0; i < infos.length; i++) {
      const pos = positions[i];
      const gid = infos[i].codepoint;
      // Glyph 0 is .notdef: the face had the character in its cmap but shaping found no glyph.
      if (gid === 0) throw new Error(`og text: a missing glyph in "${text}" (face ${run.face.id})`);
      const cluster = run.start + infos[i].cluster;
      if (from >= 0 && !mark && cluster >= from) {
        mark = { x0: x, x1: -1 };
        x += pad;
      }
      if (cluster >= to) closeMark();
      const advance = pos.xAdvance * scale + (pos.xAdvance !== 0 ? track : 0);
      glyphs.push({
        d: run.face.font.glyphToPath(gid),
        x: x + pos.xOffset * scale,
        y: -pos.yOffset * scale,
        scale,
        marked: from >= 0 && cluster >= from && cluster < to,
      });
      x += advance;
      if (pos.xAdvance !== 0) trailing = track;
    }
  }
  closeMark();
  return { text, width: Math.max(0, x - trailing), glyphs, mark };
}

/* ---------- line breaking ---------- */

/** One unbreakable piece of a title, and whether a space separates it from the piece before. */
interface Atom {
  text: string;
  space: boolean;
}

const HAN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\u{3000}-\u{303f}\u{ff00}-\u{ffef}]/u;
/* Punctuation that may not start a line (closing, final, and the Chinese stops), and that may not
   end one (opening). */
const NO_START = /^[\p{Pe}\p{Pf}!%),.:;?\]}¢°·’”…‧、。〉》」』】〕〗〙〛！％），．：；？］｝～]/u;
const NO_END = /[\p{Ps}\p{Pi}([{£¥‘“〈《「『【〔〖〘〚（［｛]$/u;

/* Names a line never splits: the brand ("Cosmos / Pay" read as two words) and Solana Pay. */
const ONE_NAME = /\b(Cosmos|Solana) Pay\b/g;

/** The pieces of one paragraph a line may break between. */
function atomsOf(text: string, lang: string): Atom[] {
  const atoms: Atom[] = [];
  let space = false;
  // A no-break space inside a name glues it into one piece.
  const kept = text.replace(ONE_NAME, "$1\xa0Pay");
  for (const { segment } of new Intl.Segmenter(lang, { granularity: "word" }).segment(kept)) {
    if (/^[ \t\n]+$/.test(segment)) {
      space = true;
      continue;
    }
    const prev = atoms.at(-1);
    const glued =
      prev &&
      (NO_START.test(segment) ||
        NO_END.test(prev.text) ||
        (!space && !(HAN.test(prev.text.slice(-1)) || HAN.test(segment[0]))));
    if (glued) prev.text += (space ? " " : "") + segment;
    else atoms.push({ text: segment, space });
    space = false;
  }
  return atoms;
}

/** The lines `atoms` fill at most `width` wide, greedily; a piece wider than the box gets a line of
 *  its own (the caller then tries a smaller size). */
function fill(atoms: Atom[], width: number, measure: (text: string) => number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const atom of atoms) {
    const candidate = line ? `${line}${atom.space ? " " : ""}${atom.text}` : atom.text;
    if (line && measure(candidate) > width) {
      lines.push(line);
      line = atom.text;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** The text of atoms[from..to) as one line. */
function join(atoms: Atom[], from: number, to: number): string {
  return atoms
    .slice(from, to)
    .map((atom, i) => (i > 0 && atom.space ? ` ${atom.text}` : atom.text))
    .join("");
}

/**
 * The paragraph in exactly `count` lines no wider than `width`, as even as they can be (the least
 * sum of squared widths: with the text's total fixed, that is the most equal split), the way
 * `text-wrap: balance` sets the pages' titles. Null when it cannot be done.
 */
function balance(atoms: Atom[], count: number, width: number, measure: (text: string) => number): string[] | null {
  const n = atoms.length;
  // cost[m][j]: the best cost of atoms[0..j) in m lines; from[m][j]: where its last line starts.
  const cost = Array.from({ length: count + 1 }, () => new Array<number>(n + 1).fill(Infinity));
  const from = Array.from({ length: count + 1 }, () => new Array<number>(n + 1).fill(-1));
  cost[0][0] = 0;
  for (let m = 1; m <= count; m++) {
    for (let j = 1; j <= n; j++) {
      for (let i = m - 1; i < j; i++) {
        if (cost[m - 1][i] === Infinity) continue;
        const w = measure(join(atoms, i, j));
        if (w > width) continue;
        const c = cost[m - 1][i] + w * w;
        if (c < cost[m][j]) {
          cost[m][j] = c;
          from[m][j] = i;
        }
      }
    }
  }
  if (cost[count][n] === Infinity) return null;
  const lines: string[] = [];
  for (let m = count, j = n; m > 0; m--) {
    const i = from[m][j];
    lines.unshift(join(atoms, i, j));
    j = i;
  }
  return lines;
}

export interface Fitted {
  size: number;
  lines: SetLine[];
}

export interface FitBox {
  width: number;
  maxLines: number;
  /** Sizes to try, largest first. */
  sizes: number[];
}

/**
 * The largest size at which `title` fits `box` (a line feed in it is a forced break), each paragraph in
 * as few lines as it needs, balanced. Throws when the title does not fit at the smallest size.
 * Chinese faces load lazily: `await fonts.prepare(title, weight)` first.
 */
export function fitTitle(title: string, fonts: OgFonts, base: Omit<TextStyle, "size">, box: FitBox, lang: string): Fitted {
  const paragraphs = title.split(/\n/).map((p) => atomsOf(p, lang));
  for (const size of box.sizes) {
    const style = { ...base, size };
    const cache = new Map<string, number>();
    const measure = (text: string): number => {
      if (!cache.has(text)) cache.set(text, setLine(text, fonts, style, lang).width);
      return cache.get(text) as number;
    };
    const greedy = paragraphs.map((atoms) => fill(atoms, box.width, measure));
    if (greedy.flat().length > box.maxLines) continue;
    const lines = paragraphs.map((atoms, i) => balance(atoms, greedy[i].length, box.width, measure));
    if (lines.some((p) => p === null)) continue;
    return { size, lines: (lines as string[][]).flat().map((text) => setLine(text, fonts, style, lang)) };
  }
  throw new Error(`og text: "${title}" does not fit ${box.maxLines} lines of ${box.width}px at ${box.sizes.at(-1)}px`);
}
