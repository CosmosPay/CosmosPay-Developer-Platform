/* brand-kit.ts: the files of the brand page (src/lib/site/brand.ts) that are not committed, and the
   brand kit that holds every one of them, made from the committed brand files. Run before
   `astro build` by scripts/build-brand-kit.mjs (npm run brand:build; build, build:app, predev and
   dev:mock run it), which writes them to public/brand/kit (git-ignored), so the black SVGs, the PNGs
   and the archive are never older than the drawings they come from.

   - A logo drawn in `currentColor` is written in each ink it has no committed file in (black; the
     lockup's Cosmic Blue; white for the one-colour app icon).
   - Every logo's PNG is rasterised by resvg (pinned, as for the share cards) at a fixed width, but
     the lockup's Cosmic Blue one, which is the agency's; so are the phone drawings' PNGs.
   - The palette is text (paletteText), the README names the page, the folders, the typeface's
     licence and the contact address, in English (the kit is one archive for every language).
   - The typeface's desktop files and their licence go in as committed (fonts/).
   - The archive (src/lib/zip.ts) holds exactly brandDownloads() and the README, under one folder,
     with a fixed timestamp: the same files always make the same bytes.
   tests/unit/brandKit.test.ts builds it and reads it back. Node only. */
import { Resvg } from "@resvg/resvg-js";
import en from "@/lib/i18n/messages/en";
import { CONTACT_ADDRESS } from "@/lib/payments/contact";
import { FONT_LICENCE, KIT_DIR, KIT_FOLDER, KIT_README, TYPEFACE, brandDownloads, paletteText, type Download, type Make } from "@/lib/site/brand";
import { zip, type ZipEntry } from "@/lib/zip";

export interface KitInput {
  /** The bytes of a committed file, by its public path (`/brand/isotipo.svg`). */
  read: (publicPath: string) => Uint8Array;
  /** The company site's origin, which the README and the palette name. */
  site: string;
}

export interface BrandKit {
  /** The files the build writes under KIT_DIR, by public path. */
  files: { href: string; data: Buffer }[];
  /** The archive's entries, in its order. */
  entries: ZipEntry[];
  /** The archive. */
  zip: Buffer;
}

/** A single-colour SVG with its `currentColor` written as `colour`; it must have one. */
function recolour(svg: string, colour: string, from: string): string {
  if (!svg.includes("currentColor")) throw new Error(`[brand] ${from} is not drawn in currentColor`);
  return svg.replace(/currentColor/g, colour);
}

function made(make: Make, { read, site }: KitInput): Buffer {
  switch (make.kind) {
    case "copy":
      return Buffer.from(read(make.from));
    case "recolour":
      return Buffer.from(recolour(Buffer.from(read(make.from)).toString("utf8"), make.colour, make.from), "utf8");
    case "png": {
      const source = Buffer.from(read(make.from)).toString("utf8");
      const svg = make.colour ? recolour(source, make.colour, make.from) : source;
      // No text in the brand's drawings, so no fonts: the same bytes on every machine.
      const png = new Resvg(svg, { fitTo: { mode: "width", value: make.width }, font: { loadSystemFonts: false } }).render().asPng();
      return Buffer.from(png);
    }
    case "palette":
      return Buffer.from(paletteText(site), "utf8");
  }
}

/** The kit's README: what the files are for and where each kind sits. */
export function readmeText(site: string): string {
  const t = en.brand;
  return [
    t.title,
    `${site}/brand`,
    "",
    t.usage.lede,
    "",
    `logo/: ${t.logo.title}`,
    `illustrations/: ${t.illustrations.title}`,
    `graphics/: ${t.graphics.title}`,
    `fonts/: ${t.type.title}, ${TYPEFACE.family} (TTF)`,
    `cosmos-pay-palette.txt: ${t.colour.title}`,
    "",
    `${TYPEFACE.family} by ${TYPEFACE.designer}: ${TYPEFACE.licenceName} (${FONT_LICENCE.kit}), ${TYPEFACE.source}`,
    CONTACT_ADDRESS,
    "",
  ].join("\n");
}

/** The files to write under KIT_DIR and the archive, from the committed brand files. */
export function buildBrandKit(input: KitInput): BrandKit {
  const downloads: Download[] = brandDownloads();
  const data = new Map(downloads.map((d) => [d.kit, made(d.make, input)]));
  const files = downloads.filter((d) => d.href.startsWith(`${KIT_DIR}/`)).map((d) => ({ href: d.href, data: data.get(d.kit)! }));
  const entries: ZipEntry[] = [
    { name: `${KIT_FOLDER}/${KIT_README}`, data: Buffer.from(readmeText(input.site), "utf8") },
    ...downloads.map((d) => ({ name: `${KIT_FOLDER}/${d.kit}`, data: data.get(d.kit)! })),
  ];
  return { files, entries, zip: zip(entries) };
}
