/* brand.ts: what the company's brand page (cosmospay.lat/brand) shows and offers, besides its words
   (the platform catalogs' `brand` block): the logos, the palette, the typeface, the astronaut's
   poses, the ribbon and the strokes, every file each one downloads as, and the brand kit that holds
   them all. src/pages/site/brand.astro renders it, the page's Markdown version
   (src/lib/seo/site-markdown.ts) lists the same files, and src/lib/site/brand-kit.ts makes the
   files that are not committed and the archive (npm run brand:build), so the page, its Markdown and
   the kit always name the same things. Pure.

   Every value has its source in this repository:
   - the files: public/brand (the agency's kit as BRAND.md describes it) and public/fonts;
   - the colours: the brand palette tokens of src/styles/cosmos.css (`--cosmos-*`), the four of
     BRAND.md section 3 (tests/unit/brandKit.test.ts reads them from the stylesheet);
   - the logo's rules: BRAND.md section 6 (black on light, white on dark and navy; clear space the
     height of the wordmark's c; the isotype at 24 px at least; never deformed or shadowed);
   - the astronaut's rules: BRAND.md section 5 (180 px tall at least, one pose per screen, only the
     palette's colours; the sticker for black, navy or a photograph);
   - the typeface: the WOFF2 files' own name tables (family, designer, the SIL Open Font License 1.1
     and the project's address), which the test reads again; its desktop files (public/brand/fonts)
     are the project's own TTFs and licence at commit TYPEFACE.commit, byte for byte (the test
     checks each file's git blob id and that its outlines are the web files').
   Also offered, with no rule of their own (BRAND.md does not describe them): the agency's all
   Cosmic Blue `lockup-cosmos-pay.png`, with its SVG made from the lockup's `currentColor` file (the
   test draws one over the other); the one-colour app icon, `isotipo-variante-1-mono.svg` (the square
   with the C cut out, checked against the two-colour icons); and `personaje/celular-1..4.svg`, four
   drawings of the phone pose.
   Left out on purpose: `wordmark-cosmos*.svg` (the word "cosmos" alone is not the Cosmos Pay name),
   `isotipo-variante-3*.svg` and `isotipo-variante-2-mono.svg` (the same drawings as variant 1's),
   `planeta.png` (not described in BRAND.md), and the Aeronaut-based display face (a trial licence). */

/** Where the files the build makes are served (public/brand/kit, git-ignored). */
export const KIT_DIR = "/brand/kit";
/** The brand kit: every file below in one archive. */
export const KIT_ZIP = `${KIT_DIR}/cosmos-pay-brand-kit.zip`;
/** The folder the archive's files sit in, so unzipping it makes one folder. */
export const KIT_FOLDER = "cosmos-pay-brand-kit";
/** The archive's own notes (only in the archive). */
export const KIT_README = "README.txt";

/** How a file is made from the committed brand files (paths under public/). */
export type Make =
  /** Served and archived as committed. */
  | { kind: "copy"; from: string }
  /** A single-colour SVG drawn in `currentColor`, written in one colour of the palette. */
  | { kind: "recolour"; from: string; colour: string }
  /** An SVG rasterised `width` pixels wide (in `colour` first when it is drawn in `currentColor`). */
  | { kind: "png"; from: string; width: number; colour?: string }
  /** The palette as text (paletteText). */
  | { kind: "palette" };

export type Format = "svg" | "png" | "txt" | "ttf";

/** One file a visitor can download, alone or in the kit. */
export interface Download {
  /** Where the page links it (a committed file, or one the build makes under KIT_DIR). */
  href: string;
  /** Its path inside the kit's folder; its last part is also the name a single download saves as. */
  kit: string;
  format: Format;
  make: Make;
}

/** The name a single download saves as (the `download` attribute). */
export function fileName(download: Download): string {
  return download.kit.slice(download.kit.lastIndexOf("/") + 1);
}

/* ---------- colour ---------- */

export type ColourKey = "black" | "white" | "navy" | "blue";

/** The brand palette: four colours and no other (BRAND.md section 3). Names are the manual's own. */
export const BRAND_COLOURS: readonly { key: ColourKey; name: string; hex: string; token: string }[] = [
  { key: "black", name: "Black", hex: "#000000", token: "--cosmos-black" },
  { key: "white", name: "White", hex: "#FFFFFF", token: "--cosmos-white" },
  { key: "navy", name: "Dark Navy", hex: "#05064F", token: "--cosmos-navy" },
  { key: "blue", name: "Cosmic Blue", hex: "#000877", token: "--cosmos-blue" },
];

const hexOf = (key: ColourKey): string => BRAND_COLOURS.find((c) => c.key === key)!.hex;

/** A colour's RGB channels as people copy them: "0, 8, 119". */
export function rgbText(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(", ");
}

/* ---------- logo ---------- */

export type LogoKey = "lockup" | "wallet" | "isotype" | "icon" | "iconMono";
/** The ink of a logo file: black for light backgrounds, white for dark and navy ones, and the
 *  lockup's Cosmic Blue. */
export type Ink = "black" | "white" | "blue";

interface LogoSource {
  key: LogoKey;
  slug: string;
  /** Its inks, in the page's order. */
  inks: readonly Ink[];
  /** The artwork drawn in `currentColor`, written in each ink that has no file of its own. */
  mono?: string;
  /** Artwork committed in one ink, used as it is. */
  svg?: Partial<Record<Ink, string>>;
  /** A PNG committed in one ink, served and archived as it is (the others are drawn from the SVG). */
  png?: Partial<Record<Ink, string>>;
  /** How wide its PNGs are drawn. */
  width: number;
}

const LOGO_SOURCES: readonly LogoSource[] = [
  // The mark of cosmospay.lat: the isotype beside "cosmos" over "pay". Its Cosmic Blue PNG is the
  // agency's; the SVG beside it is the same drawing written in Cosmic Blue.
  {
    key: "lockup",
    slug: "cosmos-pay-logo",
    inks: ["black", "white", "blue"],
    mono: "/brand/lockup-cosmos-pay-mono.svg",
    svg: { white: "/brand/lockup-cosmos-pay.svg" },
    png: { blue: "/brand/lockup-cosmos-pay.png" },
    width: 2000,
  },
  // The wallet's own lockup: "cosmos pay wallet". For the wallet only (BRAND.md section 6).
  { key: "wallet", slug: "cosmos-pay-wallet-logo", inks: ["black", "white"], mono: "/brand/lockup-cosmos-pay-wallet-mono.svg", svg: { white: "/brand/lockup-cosmos-pay-wallet.svg" }, width: 2000 },
  // The C with the stroke through it: favicon, app icon and avatar.
  { key: "isotype", slug: "cosmos-pay-isotype", inks: ["black", "white"], mono: "/brand/isotipo-mono.svg", svg: { white: "/brand/isotipo.svg" }, width: 1024 },
  // The isotype in a rounded square: black box with a white C, and white box with a black C.
  { key: "icon", slug: "cosmos-pay-app-icon", inks: ["black", "white"], svg: { black: "/brand/isotipo-variante-1.svg", white: "/brand/isotipo-variante-2.svg" }, width: 1024 },
  // The same square in one colour with the C cut out of it (fill-rule evenodd): the ground shows through.
  { key: "iconMono", slug: "cosmos-pay-app-icon-one-colour", inks: ["black", "white"], mono: "/brand/isotipo-variante-1-mono.svg", width: 1024 },
];

/** One colourway of a logo: its SVG and its PNG. */
export interface LogoVariant {
  ink: Ink;
  svg: Download;
  png: Download;
}

export interface LogoFiles {
  key: LogoKey;
  variants: readonly LogoVariant[];
}

function logoFiles(source: LogoSource): LogoFiles {
  const variant = (ink: Ink): LogoVariant => {
    const kit = (format: Format) => `logo/${source.slug}-${ink}.${format}`;
    const made = (format: Format) => `${KIT_DIR}/${source.slug}-${ink}.${format}`;
    const committed = source.svg?.[ink];
    if (!committed && !source.mono) throw new Error(`[brand] ${source.slug} has no ${ink} artwork`);
    // A committed file is used as it is; otherwise the `currentColor` artwork is written in the ink.
    const from = committed ?? source.mono!;
    const colour = committed ? undefined : hexOf(ink);
    const svg: Download = colour
      ? { href: made("svg"), kit: kit("svg"), format: "svg", make: { kind: "recolour", from, colour } }
      : { href: from, kit: kit("svg"), format: "svg", make: { kind: "copy", from } };
    const pngFile = source.png?.[ink];
    const png: Download = pngFile
      ? { href: pngFile, kit: kit("png"), format: "png", make: { kind: "copy", from: pngFile } }
      : { href: made("png"), kit: kit("png"), format: "png", make: { kind: "png", from, width: source.width, ...(colour && { colour }) } };
    return { ink, svg, png };
  };
  return { key: source.key, variants: source.inks.map(variant) };
}

/** A logo's files in one ink (every logo has black and white). */
export function logoVariant(logo: LogoFiles, ink: Ink): LogoVariant {
  const found = logo.variants.find((v) => v.ink === ink);
  if (!found) throw new Error(`[brand] ${logo.key} has no ${ink} files`);
  return found;
}

/** The logos, in the page's order. */
export const BRAND_LOGOS: readonly LogoFiles[] = LOGO_SOURCES.map(logoFiles);

/**
 * The logo's clear space, measured on lockup-cosmos-pay-mono.svg in the file's own units
 * (tests/unit/brandKit.test.ts measures them again): the file's viewBox, the box its artwork fills,
 * and the unit BRAND.md gives, the height of the c of "cosmos", to keep free on every side.
 */
export const CLEAR_SPACE = {
  viewBox: { x: 459.99, y: 200.25, w: 235.27, h: 66.17 },
  art: { x: 468.71, y: 202.7, w: 217.84, h: 61.27 },
  c: 23.59,
} as const;

/** The smallest the isotype is drawn, in CSS pixels (BRAND.md section 6). */
export const ISOTYPE_MIN_PX = 24;

/** What not to do with the logo (BRAND.md sections 3 and 6), each drawn on the page. */
export const LOGO_DONTS = ["stretch", "recolour", "rotate", "effects", "busy"] as const;

/* ---------- typeface ---------- */

/** Open Sauce One, as its own files state it (their name tables: tests/unit/brandKit.test.ts). */
export const TYPEFACE = {
  family: "Open Sauce One",
  designer: "Alfredo Marco Pradil",
  /** The project's repository, named in every file's copyright. */
  source: "https://github.com/marcologous/Open-Sauce-Fonts",
  licenceName: "SIL Open Font License 1.1",
  /** The family's own licence file in that repository. */
  licence: "https://github.com/marcologous/Open-Sauce-Fonts/blob/master/Open%20Sauce%20One%20OFL.txt",
  /** The project's commit the desktop files (public/brand/fonts) come from: its fonts/ttf files and
   *  "Open Sauce One OFL.txt", unchanged (the licence saved as OFL.txt). */
  commit: "1747e4467caf9ecce17690ae6880d86a03e17c41",
  /** The weights this site ships, each by the style name its files give: the web file
   *  (public/fonts) and the desktop one (public/brand/fonts). */
  weights: [
    { name: "Light", weight: 300, file: "/fonts/OpenSauceOne-Light.woff2", desktop: "/brand/fonts/OpenSauceOne-Light.ttf" },
    { name: "Regular", weight: 400, file: "/fonts/OpenSauceOne-Regular.woff2", desktop: "/brand/fonts/OpenSauceOne-Regular.ttf" },
    { name: "Medium", weight: 500, file: "/fonts/OpenSauceOne-Medium.woff2", desktop: "/brand/fonts/OpenSauceOne-Medium.ttf" },
    { name: "SemiBold", weight: 600, file: "/fonts/OpenSauceOne-SemiBold.woff2", desktop: "/brand/fonts/OpenSauceOne-SemiBold.ttf" },
    { name: "Bold", weight: 700, file: "/fonts/OpenSauceOne-Bold.woff2", desktop: "/brand/fonts/OpenSauceOne-Bold.ttf" },
  ],
  /** The licence the desktop files travel with. */
  licenceFile: "/brand/fonts/OFL.txt",
} as const;

/** The typeface's desktop files (TTF) for design tools, weight by weight. */
export const FONT_FILES: readonly Download[] = TYPEFACE.weights.map((w) => ({
  href: w.desktop,
  kit: `fonts/${w.desktop.slice(w.desktop.lastIndexOf("/") + 1)}`,
  format: "ttf",
  make: { kind: "copy", from: w.desktop },
}));

/** The licence, beside the desktop files. */
export const FONT_LICENCE: Download = { href: TYPEFACE.licenceFile, kit: "fonts/OFL.txt", format: "txt", make: { kind: "copy", from: TYPEFACE.licenceFile } };

/** The specimen's lines: the Latin letters and figures the brand's files carry. */
export const SPECIMEN = ["ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz", "0123456789"] as const;

/* ---------- the astronaut ---------- */

export type PoseKey = "phone" | "floating" | "working" | "thinking" | "thumbsUp" | "standing" | "relaxed";
/** The three drawings of each pose (BRAND.md section 5): black line on white, Cosmic Blue line on
 *  white, and the sticker (black fill, thick white outline) for black, navy or a photograph. */
export type PoseStyle = "black" | "blue" | "sticker";
export const POSE_STYLES: readonly PoseStyle[] = ["black", "blue", "sticker"];

const POSE_SOURCES: readonly { key: PoseKey; slug: string; svg: string; png: string }[] = [
  { key: "phone", slug: "phone", svg: "/brand/astronauta-telefono.svg", png: "celular" },
  { key: "floating", slug: "floating", svg: "/brand/astronauta-flotando.svg", png: "flotando" },
  { key: "working", slug: "working", svg: "/brand/astronauta-laptop.svg", png: "trabajando" },
  { key: "thinking", slug: "thinking", svg: "/brand/astronauta-pensando.svg", png: "pensando" },
  { key: "thumbsUp", slug: "thumbs-up", svg: "/brand/astronauta-pulgar.svg", png: "ok" },
  { key: "standing", slug: "standing", svg: "/brand/astronauta-parado.svg", png: "de-pie" },
  { key: "relaxed", slug: "relaxed", svg: "/brand/astronauta-acostado.svg", png: "relajada" },
];

/* The kit's file names in English; the committed ones keep the agency's Spanish names. */
const PNG_SUFFIX: Record<PoseStyle, string> = { black: "negro", blue: "azul", sticker: "sticker" };

export interface PoseFiles {
  key: PoseKey;
  /** The vector drawing (black line, white fill and outline). */
  svg: Download;
  /** The PNG of each style, 1081 px square. */
  png: Record<PoseStyle, Download>;
}

export const BRAND_POSES: readonly PoseFiles[] = POSE_SOURCES.map((pose) => {
  const png = (style: PoseStyle): Download => {
    const from = `/brand/personaje/${pose.png}-${PNG_SUFFIX[style]}.png`;
    return { href: from, kit: `illustrations/cosmos-pay-astronaut-${pose.slug}-${style}.png`, format: "png", make: { kind: "copy", from } };
  };
  return {
    key: pose.key,
    svg: { href: pose.svg, kit: `illustrations/cosmos-pay-astronaut-${pose.slug}.svg`, format: "svg", make: { kind: "copy", from: pose.svg } },
    png: { black: png("black"), blue: png("blue"), sticker: png("sticker") },
  };
});

/** Every pose in one drawing. */
export const ALL_POSES: Download = {
  href: "/brand/astronautas-todos.svg",
  kit: "illustrations/cosmos-pay-astronaut-all-poses.svg",
  format: "svg",
  make: { kind: "copy", from: "/brand/astronautas-todos.svg" },
};

/** The phone pose in four more drawings: each a vector (the agency's personaje/celular-N.svg) and its
 *  PNG, 1080 px square, drawn from it. */
export type PhoneKey = "line" | "sticker" | "blueSticker" | "cutout";

export interface PhoneFiles {
  key: PhoneKey;
  /** The tile it is shown on: white, or navy for a white outline. */
  ground: "white" | "navy";
  svg: Download;
  png: Download;
}

const PHONE_SOURCES: readonly { key: PhoneKey; slug: string; n: number; ground: PhoneFiles["ground"] }[] = [
  // Black line on a white fill: the vector of personaje/celular-negro.png.
  { key: "line", slug: "line", n: 4, ground: "white" },
  // The same with a thick white outline: the vector of personaje/celular-sticker.png.
  { key: "sticker", slug: "sticker", n: 1, ground: "navy" },
  // The same in a Cosmic Blue line.
  { key: "blueSticker", slug: "sticker-blue", n: 2, ground: "navy" },
  // White, with the lines cut out of it: the ground shows through them.
  { key: "cutout", slug: "cutout-white", n: 3, ground: "navy" },
];

export const PHONES: readonly PhoneFiles[] = PHONE_SOURCES.map((phone) => {
  const from = `/brand/personaje/celular-${phone.n}.svg`;
  const name = `cosmos-pay-phone-${phone.slug}`;
  return {
    key: phone.key,
    ground: phone.ground,
    svg: { href: from, kit: `illustrations/${name}.svg`, format: "svg", make: { kind: "copy", from } },
    png: { href: `${KIT_DIR}/${name}.png`, kit: `illustrations/${name}.png`, format: "png", make: { kind: "png", from, width: 1080 } },
  };
});

/** The astronaut is never drawn smaller than this, in CSS pixels of height (BRAND.md section 5). */
export const CHARACTER_MIN_PX = 180;

/* ---------- the ribbon and the strokes ---------- */

/** The ribbon: drawn on the page from its WebP, downloaded as the full PNG (1672 x 941, on black). */
export const RIBBON = {
  view: "/brand/cinta.webp",
  width: 1672,
  height: 941,
  download: { href: "/brand/cinta.png", kit: "graphics/cosmos-pay-ribbon.png", format: "png", make: { kind: "copy", from: "/brand/cinta.png" } } as Download,
};

/** The six strokes, the ribbon's line version: each drawn on the page from its `currentColor`
 *  file and downloaded in black. */
export const STROKES: readonly { n: number; view: string; download: Download }[] = [1, 2, 3, 4, 5, 6].map((n) => ({
  n,
  view: `/brand/trazo-${n}-mono.svg`,
  download: { href: `/brand/trazo-${n}.svg`, kit: `graphics/cosmos-pay-stroke-${n}.svg`, format: "svg", make: { kind: "copy", from: `/brand/trazo-${n}.svg` } },
}));

/* ---------- the kit ---------- */

/** The palette as a text file. */
export const PALETTE: Download = { href: `${KIT_DIR}/cosmos-pay-palette.txt`, kit: "cosmos-pay-palette.txt", format: "txt", make: { kind: "palette" } };

/** Every file the page offers, in the page's order: the logos, the palette, the typeface's desktop
 *  files and their licence, the astronaut, the phone drawings, the ribbon and the strokes. The kit
 *  holds exactly these and its README (brand-kit.ts). */
export function brandDownloads(): Download[] {
  return [
    ...BRAND_LOGOS.flatMap((logo) => logo.variants.flatMap((v) => [v.svg, v.png])),
    PALETTE,
    ...FONT_FILES,
    FONT_LICENCE,
    ...BRAND_POSES.flatMap((pose) => [pose.svg, ...POSE_STYLES.map((style) => pose.png[style])]),
    ALL_POSES,
    ...PHONES.flatMap((phone) => [phone.svg, phone.png]),
    RIBBON.download,
    ...STROKES.map((stroke) => stroke.download),
  ];
}

/** The palette file: each colour's name, HEX and RGB, then the stylesheet's tokens. */
export function paletteText(site: string): string {
  const width = Math.max(...BRAND_COLOURS.map((c) => c.name.length)) + 2;
  return [
    "Cosmos Pay brand palette",
    `${site}/brand`,
    "",
    ...BRAND_COLOURS.map((c) => `${c.name.padEnd(width)}${c.hex}   RGB ${rgbText(c.hex)}`),
    "",
    ":root {",
    ...BRAND_COLOURS.map((c) => `  ${c.token}: ${c.hex};`),
    "}",
    "",
  ].join("\n");
}
