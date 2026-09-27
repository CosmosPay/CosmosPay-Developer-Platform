/**
 * Resolve the `@/…` path alias when running under plain Node.
 *
 * `tsconfig.json`'s `paths` is a type-checker instruction; it does not exist at
 * runtime, and type stripping only erases types — it hands Node the bare specifier
 * `@/lib/plans`, which Node cannot resolve. Vite/Astro apply the alias for the app
 * build (`astro.config.mjs` → `resolve.alias`), so this hook is the equivalent for
 * `node --test`.
 *
 * The alternative (moving `@/` to a `package.json` `imports` entry, which Node
 * understands natively) would touch every import in `src/`; this is 30 lines and
 * changes nothing about how the app builds.
 */
import { statSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..');

/** Same order the bundler tries: exact file, .ts, .tsx, then a directory index. */
const CANDIDATES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

/**
 * A candidate only counts when it is a FILE. `@/schemas/swaps` is both `swaps.ts` and a
 * `swaps/` directory (the module's Zod schemas next to its OpenAPI registration), and the
 * bundler picks the file — resolving to the directory instead hands node something it
 * cannot import.
 */
function firstFile(base) {
  for (const ext of CANDIDATES) {
    const candidate = base + ext;
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      /* no such path — try the next extension */
    }
  }
  return null;
}

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const hit = firstFile(resolvePath(ROOT, 'src', specifier.slice(2)));
    if (hit) return nextResolve(pathToFileURL(hit).href, context);
  }

  // Extensionless relative imports (`./envelope`, `../lib/http`). Vite adds the extension
  // for the app build; node does not, so every TS module that imports a sibling without
  // one is unreachable from a plain `node` run without this.
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const hit = firstFile(resolvePath(dirname(fileURLToPath(context.parentURL)), specifier));
    if (hit) return nextResolve(pathToFileURL(hit).href, context);
  }

  return nextResolve(specifier, context);
}
