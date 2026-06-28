import { API_DOCS_ENABLED } from 'astro:env/server';

/**
 * Whether the portal's own API reference (Swagger UI at /swagger + the /api/openapi.json spec)
 * is exposed. It's an internal/developer tool, so it's available in development by default and
 * hidden in production unless the `API_DOCS_ENABLED` env flag is set — letting you choose which
 * environment exposes it (e.g. enable on staging, keep off on prod).
 *
 * `import.meta.env.DEV` is a build-time constant (true under `astro dev`, false in a prod build);
 * `API_DOCS_ENABLED` is read at runtime, so a built server can still opt in via env.
 */
export const apiDocsEnabled: boolean = import.meta.env.DEV || API_DOCS_ENABLED;
