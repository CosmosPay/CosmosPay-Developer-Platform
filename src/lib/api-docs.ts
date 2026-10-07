import { API_DOCS_ENABLED } from 'astro:env/server';

/**
 * Whether the portal's own API reference (Swagger UI at /swagger + the /api/openapi.json spec)
 * is exposed. It's an internal/developer tool, so it's available in development by default and
 * hidden in production unless the `API_DOCS_ENABLED` env flag is set — letting you choose which
 * environment exposes it (e.g. enable on staging, keep off on prod).
 *
 * Both halves are fixed at BUILD time. `import.meta.env.DEV` is a build-time constant (true under
 * `astro dev`, false in a prod build), and `API_DOCS_ENABLED` is an astro:env field with
 * `access: 'public'`, which Astro inlines into the bundle as a literal. So a built server cannot
 * opt in via a runtime env var: build with `API_DOCS_ENABLED=true` for the environment that
 * should expose the reference (e.g. staging).
 */
export const apiDocsEnabled: boolean = import.meta.env.DEV || API_DOCS_ENABLED;
