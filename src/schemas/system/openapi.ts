/* OpenAPI registration for the platform's own metadata routes, the two PUBLIC utility
   endpoints a wallet needs before it holds any credential (the asset catalog and the
   shared public key), and the read-only dashboard aggregates. */
import {
  errors,
  jsonOk,
  registerRoutes,
  sessionSecurity,
} from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';
import { envQuery, passthroughObject } from '@/schemas/shared/openapi-params';

const assetSchema = z
  .object({
    code: z.string().openapi({ example: 'USDC' }),
    issuer: z
      .string()
      .nullable()
      .openapi({ example: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTR6F3DSZL5A3W4G4M4N4A5U4QY3T6' }),
    name: z.string().openapi({ example: 'USD Coin' }),
    issuerName: z.string().openapi({ example: 'Circle' }),
    issuerDomain: z.string().openapi({ example: 'centre.io' }),
    verified: z.boolean().openapi({ example: true }),
    contract: z.string().nullable().openapi({ example: null }),
    flags: z.object({
      authRevocable: z.boolean().openapi({ example: false }),
      clawback: z.boolean().openapi({ example: false }),
    }),
  })
  .openapi('RegistryAsset', { description: 'One catalog entry: a (code, issuer) pair the platform vouches for.' });

const assetRegistrySchema = z
  .object({
    network: z.string().openapi({ example: 'public' }),
    version: z.number().int().openapi({ example: 7 }),
    data: z.array(assetSchema),
  })
  .openapi('AssetRegistry', { description: 'The asset catalog for one network.' });

registerRoutes([
  {
    method: 'get',
    path: '/api/openapi.json',
    tags: ['System'],
    summary: 'OpenAPI specification',
    description: 'Returns the OpenAPI 3.0 document for this API.',
    responses: {
      200: {
        description: 'OpenAPI JSON document',
        content: {
          'application/json': {
            schema: z.object({}).passthrough().openapi('OpenApiDocument'),
          },
        },
      },
      500: errors.internalError,
    },
  },
  {
    // The Swagger UI lives at /swagger (src/pages/swagger.astro). /docs is the statically
    // exported Fumadocs site (public/docs) — a different surface, not this reference.
    method: 'get',
    path: '/swagger',
    tags: ['System'],
    summary: 'Swagger UI',
    description:
      'Interactive API reference powered by Swagger UI. Gated by API_DOCS_ENABLED (on in development).',
    responses: {
      200: {
        description: 'Swagger UI HTML page',
        content: {
          'text/html': {
            schema: { type: 'string' },
          },
        },
      },
    },
  },
  {
    method: 'get',
    path: '/api/assets',
    tags: ['System'],
    summary: 'Asset catalog (public)',
    description:
      'The (code, issuer) pairs the platform vouches for on a network. PUBLIC: a fresh wallet install needs the catalog before it has any credential — the token picker, the trustline screen and the swap screen all resolve pairs against it. Proxied from the Payments API and cached in-process; when the budget is spent or the upstream is down, a stale entry is served in preference to an error, so 429/503 only happen with nothing cached at all.',
    request: {
      query: z.object({
        network: z
          .enum(['public', 'testnet'])
          .optional()
          .openapi({ param: { name: 'network', in: 'query' }, example: 'public', description: 'Defaults to `public`.' }),
      }),
    },
    responses: {
      200: jsonOk(assetRegistrySchema, 'AssetRegistryResponse', 'Asset catalog'),
      429: { description: 'Too many requests and nothing cached to serve', content: errors.badRequest.content },
      503: { description: 'The asset catalog is temporarily unavailable', content: errors.internalError.content },
    },
  },
  {
    method: 'get',
    path: '/api/public-key',
    tags: ['System'],
    summary: 'Shared wallet API key (public)',
    description:
      "The API key the Cosmos Pay Wallet uses when its user has no account of their own. Serving it is what makes rotation possible: the key is compiled into an open-source app, so a new one takes effect on the next fetch instead of on the next app-store review. It carries `role: 'public'`, which the Payments service confines to quotes, envelope builders, on-chain reads and telemetry ingest — it can sign nothing and can replay nothing another consumer wrote. Cached for five minutes and rate-limited; 503 when no key is provisioned for that environment.",
    request: { query: z.object({ env: envQuery }) },
    responses: {
      200: jsonOk(
        z.object({
          env: z.enum(['dev', 'prod']).openapi({ example: 'dev' }),
          apiKey: z.string().nullable().openapi({ example: 'cosmos_pub_9f8c…' }),
        }),
        'PublicKeyResponse',
        'Public access key',
      ),
      429: { description: 'Too many requests and nothing cached to serve', content: errors.badRequest.content },
      503: {
        description: 'Public access is unavailable, or no key is provisioned for this environment',
        content: errors.internalError.content,
      },
    },
  },
  {
    method: 'get',
    path: '/api/cosmos/{metric}',
    tags: ['Analytics'],
    summary: 'Dashboard aggregate',
    description:
      'Read-only rollups from the Payments API for the signed-in consumer. `metric` is one of `summary`, `balances`, `logs` or `webhook-logs`; anything else is 404. Each has its own shape, forwarded unchanged.',
    security: sessionSecurity,
    request: {
      params: z.object({
        metric: z.enum(['summary', 'balances', 'logs', 'webhook-logs']).openapi({
          param: { name: 'metric', in: 'path' },
          example: 'summary',
        }),
      }),
      query: z.object({ env: envQuery }),
    },
    responses: {
      200: jsonOk(
        passthroughObject('AnalyticsPayload', 'The aggregate, forwarded unchanged.'),
        'AnalyticsResponse',
        'Metric fetched successfully',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      404: { description: 'Unknown metric', content: errors.notFound.content },
      500: errors.internalError,
    },
  },
]);
