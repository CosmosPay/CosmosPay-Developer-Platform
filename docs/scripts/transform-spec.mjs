// The docs site's view of the Payments API spec: the community server's openapi.json,
// with public-facing auth and tag headings — and NOTHING else changed.
//
// Pure, and shared by the two scripts that must agree on it: `generate-api.mjs` writes
// docs/openapi.json through it, and `scripts/check-api-spec.mjs` recomputes it from the
// server's current spec and fails when the committed copy differs. Two copies of this
// logic would be two ways for the docs to describe an API the server does not serve.
//
// What it does, and why each step is safe:
//   - tag definitions: headings and descriptions for every tag the operations use. A tag
//     used by the server and missing here THROWS: silently rendering it as an untitled
//     page is how the recovery and wallet-auth sections went undescribed.
//   - auth: the server documents the INTERNAL gateway handshake (`X-Gateway-Secret` +
//     `X-Consumer-Username`) that APISIX injects; external callers only ever send their
//     API key. That is replaced with one bearer scheme. SEP-30's own token (`sep-token`)
//     is NOT the gateway's and is kept.
//   - public routes keep `security: []`. An empty requirement list is a statement ("no
//     credentials"), not an absence — deleting it made every public route inherit the
//     API-key requirement, and the reference told readers to send a key the SEP-10 and
//     SEP-30 endpoints never read.

export const GATEWAY_DEFAULT = 'https://api.cosmospay.lat/cosmos-api';

// Tag order + human titles/descriptions. The source spec only references these names in
// operations; we supply the definitions so each tag page has a proper heading.
export const TAGS = [
  {
    name: 'payment-intents',
    title: 'Payment Intents',
    description: 'Create, fetch, update, cancel and validate Stellar (SEP-7) payment intents.',
  },
  {
    name: 'swaps',
    title: 'Swaps',
    description: 'Quote, create, sign and submit Stellar path-payment swaps.',
  },
  {
    name: 'liquidity-pools',
    title: 'Liquidity Pools',
    description: 'Deposit into and withdraw from Stellar AMM pools, and track your positions.',
  },
  {
    name: 'assets',
    title: 'Assets',
    description:
      'The asset registry: which (code, issuer) pairs exist per network and who issues them. ' +
      '`verified` is a claim about the issuer’s identity, not about quality.',
  },
  {
    name: 'aliases',
    title: 'Aliases',
    description:
      'Payment handles: resolve a name to its addresses, and claim or manage one with a ' +
      'signature by each address it points at.',
  },
  {
    name: 'onramp',
    title: 'On-ramp',
    description: 'Fiat in: quotes, payins, virtual accounts, and the trustline for the asset delivered.',
  },
  {
    name: 'offramp',
    title: 'Off-ramp',
    description: 'Fiat out: quotes, payout authorization, and payout tracking.',
  },
  {
    name: 'kyc',
    title: 'KYC',
    description:
      'Receivers, KYC documents, blockchain wallets, bank accounts, and the rail catalogue.',
  },
  {
    name: 'wallet-auth',
    title: 'Wallet Sign-in',
    description:
      'The Cosmos Wallet’s own sign-in: Authentik (OpenID Connect), Google, GitHub or an ' +
      'emailed code. It proves who a person is and never touches a key; the seed backup it ' +
      'stores is sealed on the device under a password this service never sees.',
  },
  {
    name: 'recovery',
    title: 'Account Recovery (SEP-10 / SEP-30)',
    description:
      'Served by the two recovery deployments only. Standard SEP-10 web authentication and ' +
      'SEP-30 account recovery: each server holds half of what a recovery signature needs, ' +
      'and proves the person’s inbox on its own.',
  },
  {
    name: 'pollar',
    title: 'Social Login',
    description:
      'Sign in with Google or GitHub and get a Stellar wallet Pollar custodies. The bridge ' +
      'opens the login, receives the user back, and redeems a single-use code for a session; ' +
      'the operator routes fund the reserve and manage trustlines.',
  },
  {
    name: 'webhooks',
    title: 'Webhooks',
    description: 'Register endpoints, manage them, and inspect delivery attempts for payment events.',
  },
  { name: 'products', title: 'Products', description: 'CRUD for your product catalog.' },
  { name: 'customers', title: 'Customers', description: 'CRUD for customers and their payment stats.' },
  {
    name: 'analytics',
    title: 'Analytics',
    description: 'Account summary, balances and operational logs.',
  },
  {
    name: 'activity',
    title: 'Client Activity',
    description:
      'Report what your own client did — errors, timings, transactions — and read it back. ' +
      'Unlike the API logs, which only ever see requests that reached this service, these are ' +
      'the events that happen entirely on a device: a crash, a cancelled signature, a screen ' +
      'that failed before any request left it.',
  },
  { name: 'health', title: 'Health', description: 'Liveness and readiness probes.' },
];

const INTERNAL_SCHEMES = new Set(['gateway-secret', 'consumer']);
const INTERNAL_HEADERS = new Set(['x-gateway-secret', 'x-consumer-username']);
/** Schemes the server declares that are not the gateway's, and so survive. */
const KEPT_SCHEMES = new Set(['sep-token']);
const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

/** Every tag the operations use, in document order. */
export function tagsUsed(spec) {
  const used = new Set();
  for (const methods of Object.values(spec.paths || {})) {
    for (const [m, op] of Object.entries(methods)) {
      if (HTTP_METHODS.has(m) && Array.isArray(op?.tags)) op.tags.forEach((t) => used.add(t));
    }
  }
  return [...used];
}

/**
 * The docs spec for a server spec. Does not mutate its argument.
 *
 * @param {object} source the community server's openapi.json, parsed
 * @param {{ gateway?: string }} [options]
 */
export function transformSpec(source, options = {}) {
  const spec = structuredClone(source);

  const known = new Set(TAGS.map((t) => t.name));
  const unknown = tagsUsed(spec).filter((t) => !known.has(t));
  if (unknown.length) {
    throw new Error(
      `[transform-spec] the server uses tags the docs do not describe: ${unknown.join(', ')}. ` +
        'Add them to TAGS in docs/scripts/transform-spec.mjs.',
    );
  }
  spec.tags = TAGS.map((t) => ({ name: t.name, description: t.description }));
  if (!Array.isArray(spec.servers) || spec.servers.length === 0 || spec.servers.every((s) => /localhost/.test(s.url))) {
    spec.servers = [{ url: options.gateway || GATEWAY_DEFAULT, description: 'Cosmos Pay API' }];
  }

  const kept = Object.fromEntries(
    Object.entries(spec.components?.securitySchemes || {}).filter(([name]) => KEPT_SCHEMES.has(name)),
  );
  spec.components = spec.components || {};
  spec.components.securitySchemes = {
    apiKey: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'API key',
      description: 'Your Cosmos Pay secret API key, sent as `Authorization: Bearer <apiKey>`.',
    },
    ...kept,
  };
  spec.security = [{ apiKey: [] }];

  // The server's `info.description` narrates the internal gateway handshake; drop any
  // sentence that mentions it and state the public auth instead.
  if (spec.info && typeof spec.info.description === 'string') {
    const sentences = spec.info.description
      .split(/(?<=\.)\s+/)
      .filter((s) => !/x-gateway-secret|x-consumer-username|apisix|gateway/i.test(s));
    spec.info.description = [
      ...sentences,
      'Authenticate every request with your secret API key in the `Authorization: Bearer <apiKey>` header.',
    ]
      .join(' ')
      .trim();
  }

  for (const methods of Object.values(spec.paths || {})) {
    for (const [m, op] of Object.entries(methods)) {
      if (!HTTP_METHODS.has(m) || !op || typeof op !== 'object') continue;
      if (Array.isArray(op.security)) {
        const wasPublic = op.security.length === 0;
        op.security = op.security.filter((s) => !Object.keys(s).some((k) => INTERNAL_SCHEMES.has(k)));
        // Emptied by the filter → it only named internal schemes → inherit the API key.
        // Empty to begin with → a public route; keep saying so.
        if (op.security.length === 0 && !wasPublic) delete op.security;
      }
      if (Array.isArray(op.parameters)) {
        op.parameters = op.parameters.filter(
          (p) => !(p && p.in === 'header' && INTERNAL_HEADERS.has(String(p.name).toLowerCase())),
        );
      }
    }
  }
  return spec;
}
