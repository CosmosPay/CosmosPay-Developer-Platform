/**
 * Every call this console makes to the community server is an operation the server's spec
 * documents, with the same method.
 *
 * `docs/openapi.json` is the server's spec (auth rewritten, paths untouched), and
 * `npm run check:api-spec` keeps it equal to what the server serves — so holding the
 * console's calls against it is holding them against the server. Without this, the table
 * in `src/lib/cosmos.ts` was a hand-kept list of URLs that nothing compared with anything:
 * a renamed server route is a dashboard page that 404s in production.
 *
 * Two surfaces are out of reach, and said so rather than skipped silently:
 *   - `/v1/admin/*` — the operator surface. The server excludes it from its public spec.
 *   - the prefix catch-alls in `src/lib/cosmos-proxy.ts` (kyc / onramp / offramp), which
 *     forward whatever path the dashboard asks for. The routes they end up at are the
 *     server's to validate.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const spec = JSON.parse(readFileSync(path.join(root, 'docs', 'openapi.json'), 'utf8')) as {
  paths: Record<string, Record<string, unknown>>;
};

const VERBS = new Set(['get', 'post', 'put', 'patch', 'delete']);
const normalize = (p: string) => p.replace(/\{[^}]*\}/g, '{}').replace(/\/+$/, '');

const served = new Set<string>();
for (const [p, methods] of Object.entries(spec.paths)) {
  for (const m of Object.keys(methods)) if (VERBS.has(m)) served.add(`${m.toUpperCase()} ${normalize(p)}`);
}

/** The argument list of the call whose `(` is at `open`, split at top-level commas. */
function argsAt(src: string, open: number): string[] {
  const args: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = open + 1;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    // Comments carry apostrophes ("don't"), which would otherwise open a string.
    if (c === '/' && src[i + 1] === '/') {
      i = src.indexOf('\n', i);
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      i = src.indexOf('*/', i) + 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') {
      depth--;
      if (depth === 0) {
        args.push(src.slice(start, i).trim());
        return args;
      }
    } else if (c === ',' && depth === 1) {
      args.push(src.slice(start, i).trim());
      start = i + 1;
    }
  }
  throw new Error('unbalanced call');
}

/** A path argument as a template: every `${…}` becomes `{}`. Null when not a literal. */
function literalPath(arg: string): string | null {
  const m = /^(["'`])(.*)\1$/s.exec(arg);
  if (!m) return null;
  return m[2].replace(/\$\{[^}]*\}/g, '{}');
}

const methodOf = (options: string | undefined) => /method:\s*["'](\w+)["']/.exec(options ?? '')?.[1]?.toUpperCase() ?? 'GET';

interface Call {
  key: string | null;
  where: string;
}

/** `cosmosFetch<T>(user, env, "/v1/…", { method })` in src/lib/cosmos.ts. */
function cosmosFetchCalls(): Call[] {
  const file = path.join(root, 'src', 'lib', 'cosmos.ts');
  const src = readFileSync(file, 'utf8');
  const calls: Call[] = [];
  const re = /\bcosmosFetch(?:<)/g;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    // Skip the generic parameter, then read the call's arguments.
    let i = m.index + m[0].length;
    for (let depth = 1; depth > 0; i++) {
      if (src[i] === '<') depth++;
      else if (src[i] === '>') depth--;
    }
    if (src[i] !== '(') continue;
    if (/function\s+$/.test(src.slice(Math.max(0, m.index - 12), m.index))) continue; // the declaration
    const args = argsAt(src, i);
    const p = literalPath(args[2] ?? '');
    const line = src.slice(0, m.index).split('\n').length;
    calls.push({ key: p === null ? null : `${methodOf(args[3])} ${normalize(p)}`, where: `src/lib/cosmos.ts:${line}` });
  }
  return calls;
}

/** `proxyCosmosRequest({ path: \`kyc/…\`, method: "POST" })` in the API routes. */
function proxyCalls(): Call[] {
  const calls: Call[] = [];
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const full = path.join(dir, n);
      return statSync(full).isDirectory() ? walk(full) : full.endsWith('.ts') ? [full] : [];
    });
  for (const file of walk(path.join(root, 'src', 'pages', 'api'))) {
    const src = readFileSync(file, 'utf8');
    const re = /proxyCosmosRequest\(/g;
    for (let m = re.exec(src); m; m = re.exec(src)) {
      const [options] = argsAt(src, m.index + m[0].length - 1);
      const raw = /path:\s*(["'`][^"'`]*["'`])/.exec(options)?.[1];
      const p = raw ? literalPath(raw) : null;
      if (p === null || p.startsWith('admin/')) continue; // see the header
      calls.push({ key: `${methodOf(options)} ${normalize(`/v1/${p}`)}`, where: path.relative(root, file) });
    }
  }
  return calls;
}

const calls = [...cosmosFetchCalls(), ...proxyCalls()];

test('the console calls were actually found', () => {
  assert.ok(calls.length > 40, `found only ${calls.length}`);
});

test('every console call to the community server is built from a literal path', () => {
  assert.deepEqual(
    calls.filter((c) => c.key === null).map((c) => c.where),
    [],
  );
});

test('every console call is an operation the server documents, same method', () => {
  const missing = calls.filter((c) => c.key && !served.has(c.key)).map((c) => `${c.key}  (${c.where})`);
  assert.deepEqual(missing, []);
});
