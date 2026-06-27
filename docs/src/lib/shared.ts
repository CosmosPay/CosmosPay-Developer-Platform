// The docs app is served at the root of its own Next build and mounted at /docs by the
// portal via next.config `basePath`. So fumadocs routes live at '/', not '/docs'.
export const appName = 'Cosmos Pay Docs';
export const docsRoute = '/';
export const docsImageRoute = '/og';
export const docsContentRoute = '/llms.mdx';

// Used for "edit on GitHub" / view-source links. Content is generated, so these point at
// the SDK repository for reference.
export const gitConfig = {
  user: 'CosmosPay',
  repo: 'CosmosJS_SDK',
  branch: 'main',
};
