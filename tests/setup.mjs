/**
 * Preload for `npm run test:unit` (`node --import ./tests/setup.mjs`).
 *
 * It registers the `@/…` alias resolver and nothing else — deliberately. The suite
 * covers the modules under `src/lib/` that import nothing but `node:*`, so there is
 * no `astro:env` virtual module to stub and no database to reach. A module that
 * needs either of those is not a unit-test target here: keep the logic that decides
 * a limit, a permission or a signature out of the route handler, and it stays
 * reachable from this file.
 */
import { register } from 'node:module';

// import.meta.url is already a file: URL — it is the parent to resolve against.
register('./alias-hook.mjs', import.meta.url);
