// Give every docs page's Markdown the address the company site and the gateway use for theirs: the
// page's own path with .md (/docs/getting-started.md, /docs/es/embed.md; a root is index.md:
// /docs/index.md, /docs/es/index.md), next to the page in the static export.
//
// The llms.mdx route (src/app/llms.mdx) exports each page's Markdown at
// out/llms.mdx/[<lang>/]<slug>/content.md; this copies each file to out/[<lang>/]<slug>.md after
// `next build` (npm runs it as `postbuild`), since a Next route cannot end a dynamic segment in
// ".md". The pages name these addresses (markdownPageUrl in src/lib/source.ts: their
// `<link rel="alternate" type="text/markdown">` and llms.txt), and the portal's
// scripts/build-docs.mjs fails the build when one of them is missing. The static file server
// answers them as text/markdown; charset=utf-8.
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(import.meta.dirname, '..', 'out');
const SOURCE = path.join(OUT, 'llms.mdx');
// The locale prefixes (src/lib/i18n-config.ts DOCS_LANGUAGES, English unprefixed).
const LOCALES = ['es', 'fr', 'de', 'pt'];

if (!fs.existsSync(SOURCE)) {
  console.error(`[write-markdown-pages] no ${path.relative(process.cwd(), SOURCE)} (run next build first)`);
  process.exit(1);
}

function contentFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return contentFiles(full);
    return entry.name === 'content.md' ? [full] : [];
  });
}

let written = 0;
for (const file of contentFiles(SOURCE)) {
  const segments = path.relative(SOURCE, path.dirname(file)).split(path.sep).filter(Boolean);
  const isRoot = segments.length === 0 || (segments.length === 1 && LOCALES.includes(segments[0]));
  const target = isRoot ? path.join(OUT, ...segments, 'index.md') : path.join(OUT, ...segments.slice(0, -1), `${segments.at(-1)}.md`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(file, target);
  written++;
}
console.log(`[write-markdown-pages] ${written} pages at <page>.md`);
