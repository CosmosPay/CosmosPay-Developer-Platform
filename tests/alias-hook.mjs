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
import { existsSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..');

/** Same order the bundler tries: exact file, .ts, .tsx, then a directory index. */
const CANDIDATES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const base = resolvePath(ROOT, 'src', specifier.slice(2));
    for (const ext of CANDIDATES) {
      const candidate = base + ext;
      if (existsSync(candidate)) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    }
  }
  return nextResolve(specifier, context);
}
