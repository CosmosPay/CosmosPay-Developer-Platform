import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  // This docs app lives in a subfolder of the Astro portal, which has its own
  // package-lock.json. Pin the root to docs/ so Next/Turbopack doesn't infer the parent as
  // the workspace root and try to compile the portal's Astro files (e.g. src/middleware.ts).
  // The shared navbar is not imported across the boundary — scripts/sync-portal-ui.mjs
  // copies it into this tree so everything resolves locally.
  turbopack: { root: import.meta.dirname },
  outputFileTracingRoot: import.meta.dirname,
  // Static export so the Astro dev portal can serve the build as plain files.
  output: 'export',
  // The docs are mounted under /docs of the portal (dev.cosmospay.lat/docs), so every
  // route and asset (_next/*) is prefixed with /docs and the export is self-contained.
  basePath: '/docs',
  // Emit <route>/index.html instead of <route>.html so a static file server (Astro's
  // node adapter) resolves extensionless URLs like /docs/sdk/overview/ correctly.
  trailingSlash: true,
  // next/image optimization isn't available in a static export.
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default withMDX(config);
