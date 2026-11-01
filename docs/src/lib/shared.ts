// The docs app is served at the root of its own Next build and mounted at /docs by the
// portal via next.config `basePath`. So fumadocs routes live at '/', not '/docs'.
export const appName = 'Cosmos Pay Docs';
export const docsRoute = '/';
export const docsImageRoute = '/og';
// Used to build the markdown URL for the "Copy Markdown" page action, which is fetched
// client-side, so it must include the /docs basePath (Next doesn't prefix manual fetches).
export const docsContentRoute = '/docs/llms.mdx';

// Where the docs live in production (dev.cosmospay.lat/docs). Canonical URLs, hreflang, the
// sitemap, the JSON-LD and the llms files are absolute, so they name the same URL whichever host
// answered for the static export (the files are reachable on every domain the portal serves).
export const siteOrigin = 'https://dev.cosmospay.lat';
export const docsBasePath = '/docs';
export const docsOrigin = `${siteOrigin}${docsBasePath}`;

// The social card: the portal's own Open Graph image ("Cosmos Pay Developer Platform"), served
// from the portal's public/ at the root of the same host.
export const ogImage = {
  url: `${siteOrigin}/og-image.png`,
  width: 1200,
  height: 630,
  alt: 'Cosmos Pay Developer Platform',
};

// Used for "edit on GitHub" / view-source links. Content is generated, so these point at
// the SDK repository for reference.
export const gitConfig = {
  user: 'CosmosPay',
  repo: 'CosmosJS_SDK',
  branch: 'main',
};
