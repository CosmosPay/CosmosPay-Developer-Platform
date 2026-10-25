// Build the merchant embed (src/embed) into ONE file, public/embed/cosmos-pay.js: minified,
// an IIFE, no imports at runtime. Astro copies public/ into dist/client, so `npm run build`
// runs this BEFORE `astro build`; `astro dev` serves public/ as is, so predev runs it too.
// Static files are served before the middleware, on every domain; the URL merchants are
// given is https://payments.cosmospay.lat/embed/cosmos-pay.js.
//
// The script runs on the merchant's page and cannot read this app's configuration, so the two
// addresses it needs are inlined here, from the same variables the app inlines at build:
//   PUBLIC_PAYMENTS_URL      -> the payments origin: the popup's URL, and the only origin
//                               whose messages the pay button accepts
//   PUBLIC_PAYMENTS_API_URL  -> the gateway (with its entry prefix) the inline checkout reads
//                               /v1/payment-links/{id} from
// Resolved like Vite/Astro resolve them: the process environment first, then
// .env.<mode>.local, .env.<mode>, .env.local, .env (`--mode`, default production), then the
// production defaults astro.config.mjs declares. The output is git-ignored: it is a product
// of the environment it was built for.
//
//   node scripts/build-embed.mjs [--mode development]
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outfile = path.join(root, 'public', 'embed', 'cosmos-pay.js');

const modeAt = process.argv.indexOf('--mode');
const mode = modeAt > -1 && process.argv[modeAt + 1] ? process.argv[modeAt + 1] : 'production';

/* dotenv never overrides a variable that is already set, so loading the most specific file
   first gives Vite's precedence. Optional, as in ensure-docs.mjs. */
try {
  const { config } = await import('dotenv');
  for (const file of [`.env.${mode}.local`, `.env.${mode}`, '.env.local', '.env']) {
    const full = path.join(root, file);
    if (fs.existsSync(full)) config({ path: full, quiet: true });
  }
} catch {
  /* dotenv not installed: the ambient environment and the defaults below */
}

/* astro.config.mjs's defaults for the same fields. */
const DEFAULTS = {
  PUBLIC_PAYMENTS_URL: 'https://payments.cosmospay.lat',
  PUBLIC_PAYMENTS_API_URL: 'https://api.cosmospay.lat/cosmos-api',
};

/** The variable as an absolute http(s) URL without trailing slashes; exits on anything else. */
function httpUrl(name) {
  const raw = (process.env[name] || '').trim() || DEFAULTS[name];
  let url;
  try {
    url = new URL(raw);
  } catch {
    url = null;
  }
  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
    console.error(`[build-embed] ${name} must be an absolute http(s) URL, got ${JSON.stringify(raw)}`);
    process.exit(1);
  }
  return raw.replace(/\/+$/, '');
}

const paymentsOrigin = new URL(httpUrl('PUBLIC_PAYMENTS_URL')).origin;
const apiUrl = httpUrl('PUBLIC_PAYMENTS_API_URL');

const started = performance.now();
await build({
  entryPoints: [path.join(root, 'src', 'embed', 'index.ts')],
  outfile,
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  // Custom elements v1, shadow DOM and optional chaining: every browser from 2020 on.
  target: ['es2020'],
  // The `@/` alias, from tsconfig.json's `paths` (the same mapping Vite and the tests use).
  tsconfig: path.join(root, 'tsconfig.json'),
  define: {
    __COSMOS_PAY_PAYMENTS_ORIGIN__: JSON.stringify(paymentsOrigin),
    __COSMOS_PAY_API_URL__: JSON.stringify(apiUrl),
  },
  banner: { js: `/*! Cosmos Pay embed: <cosmos-pay-button>, <cosmos-pay-checkout>. ${paymentsOrigin}/embed/cosmos-pay.js */` },
  legalComments: 'none',
  charset: 'utf8',
  logLevel: 'warning',
});

const size = fs.statSync(outfile).size;
const ms = Math.round(performance.now() - started);
console.log(
  `[build-embed] ${path.relative(root, outfile)} (${(size / 1024).toFixed(1)} KiB, ${ms} ms) — ` +
    `payments ${paymentsOrigin}, API ${apiUrl} [${mode}]`,
);
