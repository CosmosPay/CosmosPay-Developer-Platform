import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';
import { openapiPlugin } from 'fumadocs-openapi/server';
import { docsContentRoute, docsImageRoute, docsRoute } from './shared';
import { i18n } from './i18n-config';

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  // URL-based localization: en stays at the root, other locales under /<lang>/ (see
  // lib/i18n-config.ts). Pages without a translation fall back to English.
  i18n,
  source: docs.toFumadocsSource(),
  // Adds HTTP method badges to API pages in the sidebar (reads the `_openapi` frontmatter
  // that scripts/generate-api.mjs bakes into each generated tag page).
  plugins: [openapiPlugin()],
});

export function getPageImage(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'image.png'];

  return {
    segments,
    url: `${docsImageRoute}/${segments.join('/')}`,
  };
}

export function getPageMarkdownUrl(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'content.md'];

  return {
    segments,
    url: `${docsContentRoute}/${segments.join('/')}`,
  };
}

// The site is mounted under /docs (next.config basePath), but page.url is baseUrl-relative
// ('/sdk/...'). Prefix it so the URLs printed into llms.txt / llms-full.txt / *.md resolve.
const BASE_PATH = '/docs';

export async function getLLMText(page: (typeof source)['$inferPage']) {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title} (${BASE_PATH}${page.url})

${processed}`;
}
