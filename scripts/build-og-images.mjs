// Draw the share card (Open Graph / Twitter image, 1200x630 PNG) of every indexable page of the
// company site and the gateway in every language it is written in, into src/assets/og/ (git-ignored),
// before `astro build`: Vite then fingerprints them under /_astro/ (src/lib/seo/og-image-urls.ts).
// What each card says is src/lib/seo/og-images.ts; how it is drawn, src/lib/og/ (HarfBuzz shapes the
// title, resvg rasterises the SVG; no generative step, no network).
//
// A card is drawn again only when it would change: each one's key hashes what it says with the
// renderer's sources, the brand files and fonts it uses and the pinned packages' versions, kept in
// src/assets/og/manifest.json. Cards of pages that left the registry are deleted. A title that does
// not fit its box, or holds a character no font has, fails the build.
//
// The hosts the cards print come from PUBLIC_SITE_URL and PUBLIC_PAYMENTS_URL, resolved as Vite
// resolves them (the process environment, then .env.<mode>.local, .env.<mode>, .env.local, .env;
// `--mode`, default production), with astro.config.mjs's production defaults.
//
//   npm run og:build [-- --mode development]      (run by build, build:app and predev)
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { OgFonts } from '@/lib/og/fonts';
import { renderCard } from '@/lib/og/render';
import { ogCards } from '@/lib/seo/og-images';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'src', 'assets', 'og');
const manifestFile = path.join(outDir, 'manifest.json');

const modeAt = process.argv.indexOf('--mode');
const mode = modeAt > -1 && process.argv[modeAt + 1] ? process.argv[modeAt + 1] : 'production';

try {
  const { config } = await import('dotenv');
  for (const file of [`.env.${mode}.local`, `.env.${mode}`, '.env.local', '.env']) {
    const full = path.join(root, file);
    if (existsSync(full)) config({ path: full, quiet: true });
  }
} catch {
  /* dotenv not installed: the ambient environment and the defaults below */
}

function origin(name, fallback) {
  const raw = (process.env[name] || '').trim() || fallback;
  try {
    return new URL(raw).origin;
  } catch {
    console.error(`[og] ${name} must be an absolute URL, got ${JSON.stringify(raw)}`);
    process.exit(1);
  }
}

const hosts = {
  site: origin('PUBLIC_SITE_URL', 'https://cosmospay.lat'),
  payments: origin('PUBLIC_PAYMENTS_URL', 'https://payments.cosmospay.lat'),
};

/* Everything a card's pixels depend on besides its own words. */
function fingerprint() {
  const hash = createHash('sha256');
  const files = [
    ...['fonts.ts', 'render.ts', 'text.ts'].map((f) => path.join(root, 'src', 'lib', 'og', f)),
    path.join(root, 'public', 'brand', 'lockup-cosmos-pay-mono.svg'),
    path.join(root, 'public', 'brand', 'cinta.png'),
    ...readdirSync(path.join(root, 'public', 'fonts')).map((f) => path.join(root, 'public', 'fonts', f)),
  ];
  for (const file of files) hash.update(path.relative(root, file)).update(readFileSync(file));
  for (const pkg of ['harfbuzzjs', '@resvg/resvg-js', 'wawoff2', '@fontsource-variable/noto-sans-devanagari', '@fontsource-variable/noto-sans-sc']) {
    hash.update(`${pkg}@${JSON.parse(readFileSync(path.join(root, 'node_modules', pkg, 'package.json'), 'utf8')).version}`);
  }
  return hash.digest('hex');
}

const started = performance.now();
const cards = ogCards(hosts);
const base = fingerprint();
const previous = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {};
const manifest = {};
let fonts = null;
let drawn = 0;
let bytes = 0;

for (const card of cards) {
  const key = createHash('sha256').update(base).update(JSON.stringify(card)).digest('hex').slice(0, 16);
  const file = path.join(outDir, card.file);
  manifest[card.file] = key;
  if (previous[card.file] === key && existsSync(file)) {
    bytes += statSync(file).size;
    continue;
  }
  fonts ??= await OgFonts.load();
  let png;
  try {
    png = await renderCard(card, fonts);
  } catch (error) {
    console.error(`[og] ${card.area} ${card.path} (${card.lang}): ${error.message}`);
    process.exit(1);
  }
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, png);
  bytes += png.length;
  drawn++;
}

// Cards of pages or languages that are gone.
for (const area of existsSync(outDir) ? readdirSync(outDir, { withFileTypes: true }) : []) {
  if (!area.isDirectory()) continue;
  for (const name of readdirSync(path.join(outDir, area.name))) {
    if (!(`${area.name}/${name}` in manifest)) rmSync(path.join(outDir, area.name, name));
  }
}
mkdirSync(outDir, { recursive: true });
writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);

const seconds = ((performance.now() - started) / 1000).toFixed(1);
console.log(`[og] ${cards.length} cards (${drawn} drawn, ${cards.length - drawn} unchanged), ${(bytes / 1024 / 1024).toFixed(1)} MiB, in ${seconds}s`);
