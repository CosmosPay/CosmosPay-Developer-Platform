import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { DocsPage } from '@/lib/source';

// When each docs page last changed, for the sitemap's <lastmod> and the JSON-LD dateModified.
//
// Git is the source: one `git log` over the content folders, newest commit first, so the first
// date seen for a file is its last change. A page's file is not always the one in git: the
// translated siblings in content/docs (overview.es.mdx) are copies apply-translations.mjs writes
// from content-i18n/<lang>/, and an API reference page renders docs/openapi.json. In a shallow
// clone (CI checks out one commit) every file would date to that commit, so git is skipped
// there and the file's modification time stands in; only a git date is put in the JSON-LD.

export interface LastModified {
  date: Date;
  fromGit: boolean;
}

// `next build` runs in docs/ (the same assumption as lib/openapi.ts's './openapi.json').
const DOCS_ROOT = process.cwd();
const TRACKED = ['content', 'content-i18n', 'openapi.json'];

let gitDates: Map<string, Date> | null | undefined;

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: DOCS_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
}

function readGitDates(): Map<string, Date> | null {
  try {
    if (git(['rev-parse', '--is-shallow-repository']).trim() !== 'false') return null;
    // %x00 marks each commit's date line; the file names follow it (paths relative to docs/).
    const log = git(['log', '--format=%x00%cI', '--name-only', '--relative', '--', ...TRACKED]);
    const dates = new Map<string, Date>();
    let current: Date | undefined;
    for (const line of log.split('\n')) {
      if (line.startsWith('\0')) current = new Date(line.slice(1).trim());
      else if (line.trim() && current && !dates.has(line.trim())) dates.set(line.trim(), current);
    }
    return dates;
  } catch {
    return null;
  }
}

function relativeFile(absolutePath: string): string {
  return path.relative(DOCS_ROOT, absolutePath).split(path.sep).join('/');
}

/** The files a page's content comes from, relative to docs/. */
function sourceFiles(page: DocsPage): string[] {
  if (!page.absolutePath) return [];
  const file = relativeFile(page.absolutePath);
  const files: string[] = [];
  // content/docs/sdk/server/overview.es.mdx <- content-i18n/es/sdk/server/overview.mdx (or .md)
  const translated = file.match(/^content\/docs\/(.+)\.(es|fr|de|pt)\.mdx$/);
  if (translated) {
    const [, base, lang] = translated;
    const origin = [`content-i18n/${lang}/${base}.mdx`, `content-i18n/${lang}/${base}.md`].find((f) =>
      fs.existsSync(path.join(DOCS_ROOT, f)),
    );
    files.push(origin ?? file);
  } else {
    files.push(file);
  }
  if ((page.data as { _openapi?: unknown })._openapi) files.push('openapi.json');
  return files;
}

function fileDate(file: string): LastModified | undefined {
  gitDates ??= readGitDates();
  const fromGit = gitDates?.get(file);
  if (fromGit) return { date: fromGit, fromGit: true };
  try {
    return { date: fs.statSync(path.join(DOCS_ROOT, file)).mtime, fromGit: false };
  } catch {
    return undefined;
  }
}

/** The page's last change: the newest date among its source files. */
export function pageLastModified(page: DocsPage): LastModified | undefined {
  let newest: LastModified | undefined;
  for (const file of sourceFiles(page)) {
    const found = fileDate(file);
    if (found && (!newest || found.date > newest.date)) newest = found;
  }
  return newest;
}
