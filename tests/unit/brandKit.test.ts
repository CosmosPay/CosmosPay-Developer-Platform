import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import wawoff2 from 'wawoff2';
import {
  ALL_POSES,
  BRAND_COLOURS,
  BRAND_LOGOS,
  BRAND_POSES,
  CLEAR_SPACE,
  FONT_FILES,
  FONT_LICENCE,
  KIT_DIR,
  KIT_FOLDER,
  KIT_README,
  KIT_ZIP,
  PALETTE,
  PHONES,
  POSE_STYLES,
  RIBBON,
  STROKES,
  TYPEFACE,
  brandDownloads,
  fileName,
  logoVariant,
  paletteText,
  rgbText,
} from '@/lib/site/brand';
import { buildBrandKit, readmeText } from '@/lib/site/brand-kit';
import { unzip, zip } from '@/lib/zip';
import { pageMarkdown } from '@/lib/seo/page-markdown';
import { CONTACT_ADDRESS } from '@/lib/payments/contact';

/* The brand page (cosmospay.lat/brand) offers every file in src/lib/site/brand.ts and the kit holds
   exactly those (and its README). The kit is made at build time (npm run brand:build), so here it is
   made the same way, from the committed files, and read back. */

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const PUBLIC = path.join(ROOT, 'public');
const SITE = 'https://cosmospay.lat';
const read = (publicPath: string): Buffer => readFileSync(path.join(PUBLIC, ...publicPath.split('/').filter(Boolean)));
const EM_DASH = String.fromCharCode(0x2014);

const kit = buildBrandKit({ read, site: SITE });
const entries = unzip(kit.zip);
const byName = new Map(entries.map((e) => [e.name, Buffer.from(e.data)]));

function pngSize(png: Buffer): { width: number; height: number } {
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'PNG signature');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

// No text in the brand's drawings: no system fonts to load (that alone takes seconds).
const NO_FONTS = { font: { loadSystemFonts: false } };
const hexOf = (key: string): string => BRAND_COLOURS.find((c) => c.key === key)!.hex;

/** An SVG's RGBA pixels, `width` pixels wide, over `background` (transparent when omitted). */
function pixels(svg: string, width: number, background?: string): Uint8Array {
  return new Resvg(svg, { ...NO_FONTS, fitTo: { mode: 'width', value: width }, ...(background && { background }) }).render().pixels;
}

/** A PNG's RGBA pixels at its own size, decoded by resvg (alpha exact; colour exact where opaque). */
function pngPixels(png: Buffer): { data: Uint8Array; width: number; height: number } {
  const { width, height } = pngSize(png);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><image width="${width}" height="${height}" image-rendering="optimizeSpeed" href="data:image/png;base64,${png.toString('base64')}"/></svg>`;
  return { data: new Resvg(svg, NO_FONTS).render().pixels, width, height };
}

/** The sfnt tables of a font file, by tag. */
function sfntTables(font: Buffer): Map<string, Buffer> {
  const tables = new Map<string, Buffer>();
  for (let i = 0; i < font.readUInt16BE(4); i++) {
    const r = 12 + i * 16;
    tables.set(font.toString('latin1', r, r + 4), font.subarray(font.readUInt32BE(r + 8), font.readUInt32BE(r + 8) + font.readUInt32BE(r + 12)));
  }
  return tables;
}

/** A font's Windows (UTF-16BE) name records, by name id. */
function nameRecords(font: Buffer): Map<number, string> {
  const name = sfntTables(font).get('name')!;
  const strings = new Map<number, string>();
  const base = name.readUInt16BE(4);
  for (let i = 0; i < name.readUInt16BE(2); i++) {
    const r = 6 + i * 12;
    if (name.readUInt16BE(r) !== 3) continue; // Windows, UTF-16BE
    const bytes = name.subarray(base + name.readUInt16BE(r + 10), base + name.readUInt16BE(r + 10) + name.readUInt16BE(r + 8));
    strings.set(name.readUInt16BE(r + 6), String.fromCharCode(...Array.from({ length: bytes.length / 2 }, (_, j) => bytes.readUInt16BE(j * 2))));
  }
  return strings;
}

/** A file's git blob id, as `git hash-object` gives it (text with LF line ends, as git stores it). */
const blobId = (data: Buffer): string => createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');

test('zip: what it writes reads back, deflated or stored, byte for byte, and the same input makes the same archive', () => {
  const files = [
    { name: 'a/readme.txt', data: Buffer.from('hello '.repeat(200)) },
    { name: 'a/b/random.bin', data: Buffer.from(Array.from({ length: 64 }, (_, i) => (i * 97 + 13) % 256)) },
    { name: 'ñandú.txt', data: Buffer.from('UTF-8 names') },
  ];
  const archive = zip(files);
  assert.equal(archive.readUInt32LE(0), 0x04034b50, 'starts with a local header');
  assert.deepEqual(
    unzip(archive).map((e) => [e.name, Buffer.from(e.data).toString('hex')]),
    files.map((f) => [f.name, f.data.toString('hex')]),
  );
  assert.ok(archive.length < 1200 + 64 + 200, 'the repeated text is deflated');
  assert.deepEqual(zip(files), archive, 'deterministic: one timestamp, one order');
  assert.throws(() => zip([files[0], files[0]]), /twice/);
  for (const name of ['/abs.txt', '../up.txt', 'a//b.txt', 'a\\b.txt', '']) assert.throws(() => zip([{ name, data: Buffer.from('x') }]), /relative path/, name);
});

test('zip: a corrupted entry fails its CRC-32 instead of reading back wrong', () => {
  const archive = zip([{ name: 'x.txt', data: Buffer.from('abcdef') }]);
  const broken = Buffer.from(archive);
  broken[30 + 'x.txt'.length] ^= 0xff; // the first byte of the stored data
  assert.throws(() => unzip(broken), /CRC-32/);
});

test('every committed file the page names exists, and every file it offers is one of the kit', () => {
  for (const d of brandDownloads()) {
    const from = 'from' in d.make ? d.make.from : null;
    if (from) assert.ok(existsSync(path.join(PUBLIC, from)), `${from} is committed`);
    // A copied file is served where it is committed; the build makes only what is under KIT_DIR.
    if (d.make.kind === 'copy') assert.equal(d.href, d.make.from, d.kit);
    else assert.ok(d.href.startsWith(`${KIT_DIR}/`), `${d.kit} is made under ${KIT_DIR}`);
    assert.equal(fileName(d), d.kit.split('/').at(-1));
    assert.match(d.kit, /^(logo|illustrations|graphics)\/cosmos-pay-[a-z0-9-]+\.(svg|png)$|^cosmos-pay-palette\.txt$|^fonts\/(OpenSauceOne-[A-Za-z]+\.ttf|OFL\.txt)$/, d.kit);
    assert.equal(path.extname(d.kit).slice(1), d.format);
  }
  // A single download saves under its own name: no two files share one (npm run test:smoke
  // matches the page's downloads with the archive's files by name).
  const names = brandDownloads().map(fileName);
  assert.equal(new Set(names).size, names.length, 'no two downloads share a name');
  for (const view of [RIBBON.view, ...STROKES.map((s) => s.view), '/brand/isotipo.svg', '/brand/lockup-cosmos-pay-mono.svg', '/brand/cinta.webp']) {
    assert.ok(existsSync(path.join(PUBLIC, view)), `${view} is committed`);
  }
  const kits = brandDownloads().map((d) => d.kit);
  assert.equal(new Set(kits).size, kits.length, 'no file twice');
});

test('the kit holds exactly the files the page offers and its README, under one folder', () => {
  const expected = [`${KIT_FOLDER}/${KIT_README}`, ...brandDownloads().map((d) => `${KIT_FOLDER}/${d.kit}`)];
  assert.deepEqual(entries.map((e) => e.name), expected);
  // Every logo's colourways x 2 formats (the lockup has three, the others two), the palette, the
  // typeface's 5 TTFs and their licence, 7 poses x (SVG + 3 PNGs), every pose, the 4 phone drawings
  // x 2 formats, the ribbon, 6 strokes.
  assert.deepEqual(BRAND_LOGOS.map((logo) => logo.variants.map((v) => v.ink).join(' ')), ['black white blue', 'black white', 'black white', 'black white', 'black white']);
  const logoFiles = BRAND_LOGOS.reduce((n, logo) => n + logo.variants.length * 2, 0);
  assert.equal(
    brandDownloads().length,
    logoFiles + 1 + FONT_FILES.length + 1 + BRAND_POSES.length * (1 + POSE_STYLES.length) + 1 + PHONES.length * 2 + 1 + STROKES.length,
  );
  assert.equal(entries.length, 74);
  // The fonts sit in their own folder beside their licence.
  assert.deepEqual(
    entries.filter((e) => e.name.startsWith(`${KIT_FOLDER}/fonts/`)).map((e) => e.name.slice(KIT_FOLDER.length + 1)),
    ['fonts/OpenSauceOne-Light.ttf', 'fonts/OpenSauceOne-Regular.ttf', 'fonts/OpenSauceOne-Medium.ttf', 'fonts/OpenSauceOne-SemiBold.ttf', 'fonts/OpenSauceOne-Bold.ttf', 'fonts/OFL.txt'],
  );
});

test("each file in the kit is the committed file, or made from it as the page says", () => {
  for (const d of brandDownloads()) {
    const data = byName.get(`${KIT_FOLDER}/${d.kit}`)!;
    switch (d.make.kind) {
      case 'copy':
        assert.ok(data.equals(read(d.make.from)), `${d.kit} is ${d.make.from} as committed`);
        break;
      case 'recolour': {
        const svg = data.toString('utf8');
        assert.ok(!svg.includes('currentColor'), `${d.kit} has no currentColor left`);
        assert.equal(svg, read(d.make.from).toString('utf8').replace(/currentColor/g, d.make.colour), d.kit);
        break;
      }
      case 'png':
        assert.equal(pngSize(data).width, d.make.width, d.kit);
        assert.equal(data[25], 6, `${d.kit} is RGBA: a transparent ground`);
        break;
      case 'palette':
        assert.equal(data.toString('utf8'), paletteText(SITE));
        break;
    }
  }
  // Each logo SVG is drawn in its ink: black, white, the lockup's Cosmic Blue.
  for (const logo of BRAND_LOGOS) {
    for (const { ink, svg } of logo.variants) {
      const text = byName.get(`${KIT_FOLDER}/${svg.kit}`)!.toString('utf8');
      assert.ok(text.toLowerCase().includes(`fill="${hexOf(ink).toLowerCase()}"`), `${logo.key} ${ink}`);
      assert.ok(!text.includes('currentColor'), `${logo.key} ${ink}: no currentColor left`);
    }
  }
  assert.ok(logoVariant(BRAND_LOGOS[0], 'blue').svg.href.startsWith(`${KIT_DIR}/`), 'the blue SVG is made, from the lockup drawn in currentColor');
});

test("the one-colour app icon is the square with the C cut out: it looks like the two-colour icons on their grounds", () => {
  const draw = (svg: string, ink: string, background: string) => pixels(svg.replace(/currentColor/g, ink), 256, background);
  const compare = (a: Uint8Array, b: Uint8Array) => {
    let max = 0;
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const d = Math.abs(a[i] - b[i]);
      sum += d;
      if (d > max) max = d;
    }
    return { max, mean: sum / a.length };
  };
  // Every `-mono` app icon is one path with the even-odd rule, so its C is a hole in the square.
  for (const n of [1, 2, 3]) {
    const svg = read(`/brand/isotipo-variante-${n}-mono.svg`).toString('utf8');
    assert.equal(svg.match(/<path\b/g)?.length, 1, `variant ${n}: one path`);
    assert.match(svg, /fill="currentColor" fill-rule="evenodd"/, `variant ${n}`);
    // In black on white it is the black icon (variant 1 and its duplicate 3: a black square, a white C);
    // in white on black, the white icon (variant 2: a white square, a black C). Only the edges differ.
    const [ink, ground, twoColour] = n === 2 ? ['#FFFFFF', '#000000', 2] : ['#000000', '#FFFFFF', n];
    const diff = compare(draw(svg, ink, ground), pixels(read(`/brand/isotipo-variante-${twoColour}.svg`).toString('utf8'), 256, ground));
    assert.ok(diff.mean < 0.2 && diff.max < 128, `variant ${n}: mean ${diff.mean}, max ${diff.max}`);
  }
  // The page offers variant 1's, in black and in white.
  const iconMono = BRAND_LOGOS.find((logo) => logo.key === 'iconMono')!;
  assert.deepEqual(iconMono.variants.map((v) => [v.ink, v.svg.make]), [
    ['black', { kind: 'recolour', from: '/brand/isotipo-variante-1-mono.svg', colour: '#000000' }],
    ['white', { kind: 'recolour', from: '/brand/isotipo-variante-1-mono.svg', colour: '#FFFFFF' }],
  ]);
});

test("the lockup's Cosmic Blue PNG is the agency's, and its SVG is the same drawing written in Cosmic Blue", () => {
  const blue = logoVariant(BRAND_LOGOS[0], 'blue');
  assert.deepEqual(blue.png.make, { kind: 'copy', from: '/brand/lockup-cosmos-pay.png' });
  const png = pngPixels(read(blue.png.href));
  // One colour: every opaque pixel is Cosmic Blue.
  const blueRgb = rgbText(hexOf('blue')).split(', ').map(Number);
  let x0 = png.width, y0 = png.height, x1 = -1, y1 = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      if (png.data[i + 3] === 255) assert.deepEqual([png.data[i], png.data[i + 1], png.data[i + 2]], blueRgb, `pixel ${x},${y}`);
      if (png.data[i + 3] > 127) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
  }
  // The same drawing: the made SVG, scaled onto the PNG's artwork, covers the same pixels (a
  // quarter-pixel search for the PNG's own offset), so only anti-aliased edges differ.
  const svg = byName.get(`${KIT_FOLDER}/${blue.svg.kit}`)!.toString('utf8');
  const vb = CLEAR_SPACE.viewBox;
  const art = CLEAR_SPACE.art;
  const scale = (x1 - x0 + 1) / art.w;
  assert.ok(Math.abs((y1 - y0 + 1) / scale - art.h) < 0.5, 'the same proportions');
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  let best = { mean: Infinity, max: 0 };
  for (let dx = -1; dx <= 1; dx += 0.25) {
    for (let dy = -1; dy <= 1; dy += 0.25) {
      const ox = x0 - (art.x - vb.x) * scale + dx;
      const oy = y0 - (art.y - vb.y) * scale + dy;
      const placed = `<svg xmlns="http://www.w3.org/2000/svg" width="${png.width}" height="${png.height}" viewBox="0 0 ${png.width} ${png.height}"><g transform="translate(${ox} ${oy}) scale(${scale}) translate(${-vb.x} ${-vb.y})">${inner}</g></svg>`;
      const drawn = new Resvg(placed, NO_FONTS).render().pixels;
      let sum = 0;
      let max = 0;
      for (let i = 3; i < drawn.length; i += 4) {
        const d = Math.abs(drawn[i] - png.data[i]);
        sum += d;
        if (d > max) max = d;
      }
      const mean = sum / (png.width * png.height);
      if (mean < best.mean) best = { mean, max };
    }
  }
  assert.ok(best.mean < 0.6 && best.max < 160, `alpha differs by ${best.mean} on average, ${best.max} at most`);
});

test('the phone drawings are the agency\'s vectors, each with a PNG drawn from it', () => {
  assert.deepEqual(PHONES.map((phone) => [phone.key, phone.svg.make]), [
    ['line', { kind: 'copy', from: '/brand/personaje/celular-4.svg' }],
    ['sticker', { kind: 'copy', from: '/brand/personaje/celular-1.svg' }],
    ['blueSticker', { kind: 'copy', from: '/brand/personaje/celular-2.svg' }],
    ['cutout', { kind: 'copy', from: '/brand/personaje/celular-3.svg' }],
  ]);
  for (const phone of PHONES) {
    const png = byName.get(`${KIT_FOLDER}/${phone.png.kit}`)!;
    assert.deepEqual(pngSize(png), { width: 1080, height: 1080 }, phone.key);
  }
});

test('the build writes the made files where the page links them, each the same bytes as in the kit', () => {
  const made = brandDownloads().filter((d) => d.href.startsWith(`${KIT_DIR}/`));
  assert.deepEqual(kit.files.map((f) => f.href), made.map((d) => d.href));
  for (const file of kit.files) {
    const d = made.find((x) => x.href === file.href)!;
    assert.ok(file.data.equals(byName.get(`${KIT_FOLDER}/${d.kit}`)!), file.href);
  }
  assert.ok(KIT_ZIP.startsWith(`${KIT_DIR}/`) && KIT_ZIP.endsWith('.zip'));
});

test('the palette is the four brand colours of the stylesheet, nothing else', () => {
  const css = readFileSync(path.join(ROOT, 'src', 'styles', 'cosmos.css'), 'utf8');
  assert.deepEqual(BRAND_COLOURS.map((c) => c.name), ['Black', 'White', 'Dark Navy', 'Cosmic Blue']);
  for (const colour of BRAND_COLOURS) {
    const token = new RegExp(`${colour.token}:\\s*(#[0-9A-Fa-f]{6});`).exec(css);
    assert.ok(token, `${colour.token} is in cosmos.css`);
    assert.equal(token[1].toUpperCase(), colour.hex, colour.token);
  }
  assert.equal(rgbText('#000877'), '0, 8, 119');
  assert.equal(rgbText('#05064F'), '5, 6, 79');
  const text = paletteText(SITE);
  for (const colour of BRAND_COLOURS) assert.ok(text.includes(colour.hex) && text.includes(`RGB ${rgbText(colour.hex)}`), colour.name);
  assert.ok(text.includes(`${SITE}/brand`));
});

test('the README names the page, the folders, the typeface licence and the contact address, with no em dash', () => {
  const readme = byName.get(`${KIT_FOLDER}/${KIT_README}`)!.toString('utf8');
  assert.equal(readme, readmeText(SITE));
  for (const part of [`${SITE}/brand`, 'logo/', 'illustrations/', 'graphics/', 'fonts/', FONT_LICENCE.kit, PALETTE.kit, TYPEFACE.designer, TYPEFACE.licenceName, TYPEFACE.source, CONTACT_ADDRESS]) {
    assert.ok(readme.includes(part), part);
  }
  for (const text of [readme, paletteText(SITE)]) assert.ok(!text.includes(EM_DASH));
});

test("the clear space is the wordmark's c, as measured on the logo file", () => {
  const svg = read('/brand/lockup-cosmos-pay-mono.svg').toString('utf8').replace(/currentColor/g, '#000');
  const vb = /viewBox="([^"]+)"/.exec(svg)![1].split(/\s+/).map(Number);
  assert.deepEqual(vb, [CLEAR_SPACE.viewBox.x, CLEAR_SPACE.viewBox.y, CLEAR_SPACE.viewBox.w, CLEAR_SPACE.viewBox.h]);
  const box = new Resvg(svg, NO_FONTS).getBBox()!;
  for (const [k, v] of Object.entries({ x: box.x, y: box.y, w: box.width, h: box.height })) {
    assert.ok(Math.abs(v - CLEAR_SPACE.art[k as 'x']) < 0.02, `art ${k}: ${v}`);
  }
  // The c is the first letter of "cosmos" (the top line, right of the isotype): its path starts the
  // word, and its height is the word's.
  const paths = svg.match(/<path[^>]*\/>/g)!;
  const boxes = paths.map((p) => new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}">${p}</svg>`, NO_FONTS).getBBox()!);
  const word = boxes.filter((b) => b.y < CLEAR_SPACE.art.y + CLEAR_SPACE.art.h / 3 && b.x > CLEAR_SPACE.art.x + 70);
  const first = word.reduce((a, b) => (b.x < a.x ? b : a));
  assert.ok(Math.abs(first.height - CLEAR_SPACE.c) < 0.02, `c: ${first.height}`);
});

/* The desktop files are the project's own at TYPEFACE.commit, byte for byte: each file's git blob id
   in that commit's tree (github.com/marcologous/Open-Sauce-Fonts, fonts/ttf and the family's
   "Open Sauce One OFL.txt", saved as OFL.txt). */
const UPSTREAM_BLOBS: Record<string, string> = {
  '/brand/fonts/OpenSauceOne-Light.ttf': '33b41dede66acd75af6369780c37b47bb0970f34',
  '/brand/fonts/OpenSauceOne-Regular.ttf': 'efb50a694009c92450aa709e408e04a9f12b515a',
  '/brand/fonts/OpenSauceOne-Medium.ttf': '14ad137c28ae748356fa8d00b7a0114d97574885',
  '/brand/fonts/OpenSauceOne-SemiBold.ttf': '9dbf84a748644fabd013eb33c613030dbe1b9fb7',
  '/brand/fonts/OpenSauceOne-Bold.ttf': '190eedaaf3eafba5dc778fa9d48ff82470ad98dd',
  '/brand/fonts/OFL.txt': '5984869f43e56ceb10061aa1e0846840e569682f',
};

test("the typeface is what its own files say: Open Sauce One by its designer, under the SIL OFL 1.1", async () => {
  for (const w of TYPEFACE.weights) {
    const web = Buffer.from(await wawoff2.decompress(read(w.file)));
    const desktop = read(w.desktop);
    for (const [label, font] of [['web', web], ['desktop', desktop]] as const) {
      const file = label === 'web' ? w.file : w.desktop;
      assert.equal(sfntTables(font).get('OS/2')!.readUInt16BE(4), w.weight, `${file} weight class`);
      const strings = nameRecords(font);
      assert.ok((strings.get(16) ?? strings.get(1))!.startsWith(TYPEFACE.family), `${file} family`);
      assert.ok(strings.get(4)!.endsWith(w.name), `${file} is ${w.name}`);
      assert.equal(strings.get(9), TYPEFACE.designer);
      assert.match(strings.get(13)!, /SIL Open Font License, Version 1\.1/);
      assert.ok(strings.get(0)!.includes(TYPEFACE.source), `${file} names the project`);
    }
    // The desktop file is the web file's font: the same names, metrics, spacing and kerning (the
    // tables WOFF2 keeps byte for byte; it rewrites glyf, loca, cmap and head).
    const [a, b] = [sfntTables(desktop), sfntTables(web)];
    for (const tag of ['name', 'OS/2', 'hhea', 'hmtx', 'maxp', 'post', 'GPOS', 'GSUB', 'GDEF']) {
      assert.ok(a.get(tag)!.equals(b.get(tag)!), `${w.desktop}: ${tag} as in ${w.file}`);
    }
    assert.equal(a.has('glyf'), true, `${w.desktop} is TrueType`);
  }
  // Byte for byte the project's files at the pinned commit, the licence with them.
  assert.match(TYPEFACE.commit, /^[0-9a-f]{40}$/);
  for (const d of [...FONT_FILES, FONT_LICENCE]) {
    const data = read(d.href);
    const stored = d.format === 'txt' ? Buffer.from(data.toString('utf8').replace(/\r\n/g, '\n'), 'utf8') : data;
    assert.equal(blobId(stored), UPSTREAM_BLOBS[d.href], `${d.href} is the project's file at ${TYPEFACE.commit}`);
  }
  const licence = read(FONT_LICENCE.href).toString('utf8');
  assert.ok(licence.startsWith(`Copyright (c) 2020 The Open Sauce One Authors (${TYPEFACE.source})`));
  assert.match(licence, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.ok(TYPEFACE.licence.startsWith(`${TYPEFACE.source}/`));
  // The trial display face never ships with the brand.
  const offered = brandDownloads().map((d) => d.kit).join(' ');
  assert.ok(!/aeronaut|lazos/i.test(offered + JSON.stringify(TYPEFACE)));
});

test("the page's Markdown offers every file of the kit and the kit itself, at the site's addresses", () => {
  const md = pageMarkdown('site', '/brand', 'en', { site: SITE, dev: 'https://dev.cosmospay.lat', payments: 'https://payments.cosmospay.lat', api: 'https://api.cosmospay.lat/cosmos-api', profiles: { X: 'https://x.com/CosmosPay' } })!;
  const files = new Set([...md.matchAll(/\((https:\/\/cosmospay\.lat\/(?:brand|fonts)\/[^)\s]+)\)/g)].map((m) => m[1]));
  assert.deepEqual([...files].sort(), [...brandDownloads().map((d) => `${SITE}${d.href}`), `${SITE}${KIT_ZIP}`].sort());
  assert.ok(md.includes(ALL_POSES.href) && md.includes(RIBBON.download.href));
});
