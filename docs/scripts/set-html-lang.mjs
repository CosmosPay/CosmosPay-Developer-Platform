// Give every exported page under a locale prefix its language in <html lang>.
//
// The docs are one Next app with one root layout (app/layout.tsx), and the locale is the first
// segment of the page's own catch-all route, below that layout, so the layout cannot know it and
// renders lang="en" everywhere. The export is static, so the language each page is served in is
// fixed by its path: out/es/** is Spanish, and so on. This rewrites the attribute in those files
// after `next build` (npm runs it as `postbuild`); the Provider keeps it in step on client
// navigation. An English page copied under a locale prefix (no translation yet) gets the locale
// too, as its chrome is in that language; the page marks its English article with lang="en".
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(import.meta.dirname, '..', 'out');
const LOCALES = ['es', 'fr', 'de', 'pt'];
const DEFAULT_TAG = '<html lang="en"';

function htmlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

if (!fs.existsSync(OUT)) {
  console.error(`[set-html-lang] no static export at ${OUT} (run next build first)`);
  process.exit(1);
}

for (const locale of LOCALES) {
  const files = htmlFiles(path.join(OUT, locale));
  let changed = 0;
  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes(DEFAULT_TAG)) {
      console.error(`[set-html-lang] ${path.relative(OUT, file)} has no ${DEFAULT_TAG}>: did the root layout change?`);
      process.exit(1);
    }
    fs.writeFileSync(file, html.replace(DEFAULT_TAG, `<html lang="${locale}"`), 'utf8');
    changed++;
  }
  console.log(`[set-html-lang] ${locale}: ${changed} pages`);
}
