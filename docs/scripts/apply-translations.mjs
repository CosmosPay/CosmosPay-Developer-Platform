// Overlay the hand-maintained translations onto the (English) generated content tree.
//
// Translations live under docs/content-i18n/<lang>/ mirroring content/docs/ (e.g.
// content-i18n/es/sdk/server/overview.mdx, content-i18n/es/sdk/server/meta.json). This script
// copies each into content/docs/ as a Fumadocs dot-locale sibling — overview.mdx ->
// overview.es.mdx, meta.json -> meta.es.json — which the loader's i18n parser ('dot') picks
// up. Pages without a translation just fall back to English (fallbackLanguage in
// lib/i18n-config.ts). Runs in `npm run generate` AFTER generate-sdk (which wipes content/
// docs/sdk), so the siblings survive.
import fs from 'node:fs';
import path from 'node:path';
import { sanitizeInternal } from './sanitize-internal.mjs';

const I18N = path.resolve(import.meta.dirname, '..', 'content-i18n');
const OUT = path.resolve(import.meta.dirname, '..', 'content/docs');
const LANGS = ['es', 'fr', 'de', 'pt'];
const EXTS = new Set(['.mdx', '.md', '.json']);

function walk(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

// Definition pages are nested under server/ and web/ folders, but the translations were
// authored against the old flat layout, so their `/sdk/definitions/<slug>` cross-links would
// now 404. Build slug -> category from the freshly generated folders (generate-sdk runs first)
// and rewrite those links on the way in, so the source translations stay layout-agnostic.
const defCat = {};
for (const cat of ['server', 'web']) {
  const d = path.join(OUT, 'sdk', 'definitions', cat);
  if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) if (f.endsWith('.mdx')) defCat[f.replace(/\.mdx$/, '')] = cat;
}
function fixDefLinks(content) {
  return content.replace(/\]\(\/sdk\/definitions\/([a-z0-9-]+)((?:#[^)]*)?)\)/g, (m, slug, frag) =>
    defCat[slug] ? `](/sdk/definitions/${defCat[slug]}/${slug}${frag})` : m);
}

let total = 0;
for (const lang of LANGS) {
  const root = path.join(I18N, lang);
  if (!fs.existsSync(root)) continue;
  let n = 0;
  walk(root, (file) => {
    const ext = path.extname(file);
    if (!EXTS.has(ext)) return;
    const rel = path.relative(root, file); // e.g. sdk/server/overview.mdx
    const base = rel.slice(0, -ext.length); // sdk/server/overview
    const outExt = ext === '.md' ? '.mdx' : ext; // normalise .md -> .mdx
    const dest = path.join(OUT, `${base}.${lang}${outExt}`); // sdk/server/overview.es.mdx
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    let content = fs.readFileSync(file, 'utf8');
    if (outExt === '.mdx') content = sanitizeInternal(fixDefLinks(content));
    fs.writeFileSync(dest, content, 'utf8');
    n++;
  });
  total += n;
  console.log(`[apply-translations] ${lang}: ${n} files`);
}
console.log(`[apply-translations] applied ${total} translated files into ${OUT}`);
