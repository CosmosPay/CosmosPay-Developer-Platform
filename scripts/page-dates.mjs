// Print, as JSON, when each source file under src/ last changed and when each block of the
// catalogs did (src/lib/seo/page-dates.ts CATALOG_FILES), from git: what the `virtual:page-dates`
// module of astro.config.mjs holds, and what src/lib/seo/page-dates.ts dates each indexable page
// with (its JSON-LD dateModified, its sitemap lastmod, the "Updated" line some pages show).
//
//   { "dates": { "<file>": "<ISO>" }, "blocks": { "<catalog file>": { "<block>": "<ISO>" } } }
//
// Files come from one `git log` over src (newest commit first, so the first date seen for a file
// is its last change). A catalog holds the copy of many pages, so each of its lines is dated by
// `git blame` and grouped into the blocks of keys it belongs to (catalogBlockDates); a line not
// committed yet has no date. Without history (no repository, or a shallow clone such as CI's,
// where every file would date to its one commit) both maps are empty, and every page dates to the
// build. Run by astro.config.mjs with `--import ./tests/setup.mjs` (the `@/` alias), like og:build.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { CATALOG_FILES, catalogBlockDates, parseBlame } from '@/lib/seo/page-dates';

const root = path.resolve(import.meta.dirname, '..');
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });

const dates = {};
const blocks = {};
try {
  if (git(['rev-parse', '--is-shallow-repository']).trim() === 'false') {
    // %x00 marks each commit's date line; the file names follow it (repository-relative).
    let current;
    for (const line of git(['log', '--format=%x00%cI', '--name-only', '--', 'src']).split('\n')) {
      if (line.startsWith('\0')) current = line.slice(1).trim();
      else if (line.trim() && current && !(line.trim() in dates)) dates[line.trim()] = current;
    }
    for (const file of CATALOG_FILES) {
      try {
        const blame = parseBlame(git(['blame', '--porcelain', '--', file]));
        blocks[file] = catalogBlockDates(blame.lines, blame.dates);
      } catch {
        // Not tracked yet: its pages date by their other sources.
      }
    }
  }
} catch {
  // No git: every page dates to the build.
}

process.stdout.write(JSON.stringify({ dates, blocks }));
