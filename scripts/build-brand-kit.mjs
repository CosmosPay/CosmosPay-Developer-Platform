// Make the brand page's files that are not committed, and the brand kit, before `astro build`
// copies public/ into dist/client: the black SVGs of the logos drawn in currentColor, every logo's
// PNG, the palette and the archive of every file the page offers (src/lib/site/brand.ts says what,
// src/lib/site/brand-kit.ts makes them). They go to public/brand/kit (git-ignored), served at
// /brand/kit/ on every domain like the rest of public/brand; the archive's size goes to
// src/assets/brand-kit.json (git-ignored) for the page's download button.
//
// Made from the committed brand files every time (about a second), so nothing here is ever older
// than the drawings; the archive has a fixed timestamp, so the same files make the same bytes.
// The README and the palette name the production site (https://cosmospay.lat), the kit's home.
//
//   npm run brand:build        (run by build, build:app, predev and dev:mock)
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { KIT_DIR, KIT_ZIP } from '@/lib/site/brand';
import { buildBrandKit } from '@/lib/site/brand-kit';

const root = path.resolve(import.meta.dirname, '..');
const publicDir = path.join(root, 'public');
const outDir = path.join(publicDir, ...KIT_DIR.split('/').filter(Boolean));
const manifest = path.join(root, 'src', 'assets', 'brand-kit.json');

const started = performance.now();
const kit = buildBrandKit({
  read: (publicPath) => readFileSync(path.join(publicDir, ...publicPath.split('/').filter(Boolean))),
  site: 'https://cosmospay.lat',
});

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const file of kit.files) writeFileSync(path.join(publicDir, ...file.href.split('/').filter(Boolean)), file.data);
writeFileSync(path.join(publicDir, ...KIT_ZIP.split('/').filter(Boolean)), kit.zip);
mkdirSync(path.dirname(manifest), { recursive: true });
writeFileSync(manifest, `${JSON.stringify({ zipBytes: kit.zip.length, entries: kit.entries.length })}\n`);

const kib = (bytes) => `${(bytes / 1024).toFixed(0)} KiB`;
console.log(
  `[brand] ${kit.files.length} files and the kit (${kit.entries.length} entries, ${kib(kit.zip.length)}) in public${KIT_DIR} in ${Math.round(performance.now() - started)} ms`,
);
