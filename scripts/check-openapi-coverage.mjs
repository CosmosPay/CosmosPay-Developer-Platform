/**
 * Fails when a route under `src/pages/api/` is missing from the OpenAPI document.
 *
 * WHY THIS EXISTS. The Swagger reference is only worth opening if it is complete, and
 * "document the endpoint too" is the step that gets dropped under time pressure — which
 * is how the spec once described 11 of 95 operations while the dashboard shipped all 95.
 * A rule in CLAUDE.md states the intent; this is what notices when the intent slipped.
 *
 * WHAT IT COMPARES. Left side: every `export const GET|POST|PATCH|PUT|DELETE|ALL` in a
 * route file, with the file path turned into its URL (`[id]` -> `{id}`, `[...path]` ->
 * `{path}`, `index.ts` -> the directory). Right side: the operations
 * `generateOpenApiDocument()` produces. An `ALL` catch-all counts as covered when the
 * path carries at least one documented method — it answers whatever the upstream
 * accepts, so enumerating verbs there would be fiction.
 *
 * It does NOT check that the documented schema matches what the handler returns. That
 * needs a response to compare against; this is the cheap half, and the half that catches
 * the common miss (a whole endpoint nobody documented).
 *
 * Run: npm run check:openapi
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API_DIR = path.join(ROOT, 'src', 'pages', 'api');
const SCHEMAS_DIR = path.join(ROOT, 'src', 'schemas');

/**
 * Routes that are deliberately absent from the spec. Each one needs a reason — an
 * endpoint is either documented or explicitly, visibly excluded, never just missing.
 */
const EXCLUDED = new Map([
  [
    '/api/auth/{all}',
    "Better Auth's own handler (sign-in, callback, session). Its surface is the library's, documented upstream, and it is not part of this platform's API.",
  ],
  [
    '/api/wallet/console/login-code',
    'A console leg, not integrator surface: the community server calls it to have a sign-in code delivered, authenticated by a shared secret plus the internal marker APISIX strips. It answers 404 to everyone else, so publishing it would advertise an endpoint no reader of this spec can call. Its contract lives with the caller, in the community server.',
  ],
  [
    '/api/wallet/console/provision',
    'The sibling console leg, and the same reasoning: the community server calls it to have an account and its keys minted. A documented endpoint that mints two live API keys is an invitation to find the hole in the secret check.',
  ],
]);

const METHOD_RE = /export\s+const\s+(GET|POST|PUT|PATCH|DELETE|ALL|OPTIONS|HEAD)\b/g;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

/** `src/pages/api/webhooks/[id]/ping.ts` -> `/api/webhooks/{id}/ping` */
function routeUrl(file) {
  const rel = path.relative(path.join(ROOT, 'src', 'pages'), file).split(path.sep).join('/');
  return (
    '/' +
    rel
      .replace(/\.ts$/, '')
      .replace(/\/index$/, '')
      .replace(/\[\.\.\.([^\]]+)\]/g, '{$1}')
      .replace(/\[([^\]]+)\]/g, '{$1}')
  );
}

function routeOperations() {
  const ops = [];
  for (const file of walk(API_DIR)) {
    // `_helpers.ts` and friends are shared code, not routes.
    if (path.basename(file).startsWith('_')) continue;
    const src = readFileSync(file, 'utf8');
    const methods = [...src.matchAll(METHOD_RE)].map((m) => m[1]);
    const url = routeUrl(file);
    for (const method of methods) ops.push({ method, url, file });
  }
  return ops;
}

/** Import every `src/schemas/**\/openapi.ts`, the way auto-load.ts does under Vite. */
async function loadRegistrations() {
  for (const file of walk(SCHEMAS_DIR)) {
    if (path.basename(file) === 'openapi.ts') await import(pathToFileURL(file).href);
  }
}

await loadRegistrations();

/* Not `generateOpenApiDocument()`: that calls loadOpenApiRoutes(), whose `import.meta.glob`
   only exists under Vite. The registrations are already imported above, so the document is
   generated straight from the registry — with the app's own config, not a copy of it. */
const { OpenApiGeneratorV3 } = await import('@asteasolutions/zod-to-openapi');
const { openApiRegistry } = await import('@/lib/openapi/registry');
const { openApiConfig } = await import('@/lib/openapi/document');
const doc = new OpenApiGeneratorV3(openApiRegistry.definitions).generateDocument(openApiConfig);

const documented = new Set();
for (const [url, operations] of Object.entries(doc.paths ?? {})) {
  for (const method of Object.keys(operations)) documented.add(`${method.toUpperCase()} ${url}`);
}
const documentedPaths = new Set(Object.keys(doc.paths ?? {}));

const missing = [];
const excluded = [];
for (const op of routeOperations()) {
  if (EXCLUDED.has(op.url)) {
    excluded.push(op);
    continue;
  }
  // A catch-all forwards every verb; one documented operation on the path is the most
  // that can honestly be claimed for it.
  const covered =
    op.method === 'ALL'
      ? documentedPaths.has(op.url)
      : documented.has(`${op.method} ${op.url}`);
  if (!covered) missing.push(op);
}

const total = routeOperations().length;
console.log(
  `OpenAPI coverage: ${total - missing.length - excluded.length}/${total - excluded.length} route operations documented` +
    (excluded.length ? ` (${excluded.length} explicitly excluded)` : '') +
    `, ${Object.keys(doc.paths ?? {}).length} paths in the document.`,
);

if (missing.length) {
  console.error(`\n${missing.length} undocumented route operation(s):`);
  for (const op of missing) {
    console.error(`  ${op.method.padEnd(6)} ${op.url}   (${path.relative(ROOT, op.file)})`);
  }
  console.error(
    '\nAdd a registration under src/schemas/<module>/openapi.ts — see CLAUDE.md, "every API endpoint MUST be documented".',
  );
  process.exit(1);
}
