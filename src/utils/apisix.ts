import axios from "axios";
import {
  APISIX_ADMIN_KEY,
  APISIX_URL,
  COSMOS_API_CORS_ORIGINS,
  COSMOS_API_REWRITE,
  COSMOS_GATEWAY_SECRET,
} from "astro:env/server";
import { randomBytes, randomUUID } from "node:crypto";
import { orgSwapContext } from "@/lib/organizations";

export const keyPrefix = 'cosmos_';

export function parsePermissionsLabel(raw: unknown): string[] {
  if (typeof raw !== 'string' || raw.length === 0) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      !Array.isArray(parsed) ||
      !parsed.every((item) => typeof item === 'string')
    ) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

export function parseApiKeyRole(raw: unknown): 'admin' | 'user' {
  return raw === 'admin' ? 'admin' : 'user';
}

export function parseApiKeyEnv(raw: unknown): 'dev' | 'prod' {
  return raw === 'prod' ? 'prod' : 'dev';
}

export function parseLabelString(raw: unknown): string {
  return typeof raw === 'string' ? raw : '';
}

const apisix = axios.create({
  baseURL: APISIX_URL,
  headers: {
    'X-API-KEY': APISIX_ADMIN_KEY,
  },
});

type Environment = 'dev' | 'prod';

function parseRewriteRegex(): [string, string] {
  try {
    const parsed = JSON.parse(COSMOS_API_REWRITE);

    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      typeof parsed[0] === 'string' &&
      typeof parsed[1] === 'string'
    ) {
      return [parsed[0], parsed[1]];
    }
  } catch {
    return ['^/cosmos-api/(.*)', '/$1'];
  }

  return ['^/cosmos-api/(.*)', '/$1'];
}

function normalizeUpstreamHost(upstreamHost: string): string {
  const trimmed = upstreamHost.trim().replace(/^["']|["']$/g, '');

  try {
    const { hostname, port, protocol } = new URL(
      trimmed.includes('://') ? trimmed : `http://${trimmed}`,
    );

    if (!hostname) {
      return trimmed;
    }

    const defaultPort = protocol === 'https:' ? '443' : '80';

    return port ? `${hostname}:${port}` : `${hostname}:${defaultPort}`;
  } catch {
    return trimmed;
  }
}

//Base router

export async function getRoute(routeId: string) {
  try {



    const response = await apisix.get(`/routes/${routeId}`);

    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }

    return null;
  }
}

export async function routeExists(routeId: string): Promise<boolean> {
  const route = await getRoute(routeId);

  return route !== null;
}

/* -- The Cosmos API routes in APISIX --------------------------------------------
   Two routes, and the second one is what makes social login possible at all.

   Everything under COSMOS_API_ENTRY carries `key-auth`: an API key is the price of
   admission, which is right for every path the wallet or an integrator calls. The
   Pollar OAuth callback is the exception, and not by preference -- the user's BROWSER
   lands there after consenting at Google or GitHub, carrying no key and no way to be
   handed one. Behind key-auth that navigation is a 401 at the gateway: the handshake
   never completes, and the wallet polls a login that can never finish. The community
   server declares that one route `@Public()` for the same reason (the unguessable
   `state` is the credential, and the transition it drives is single-shot).

   So the callback gets its own route -- higher priority, no key-auth, matching the
   exact callback path rather than a prefix of the API, so nothing else loses its
   authentication alongside it. */

/* Where the community server serves the callback, relative to the gateway entry. Keep
   it equal to POLLAR_BRIDGE_CALLBACK_URL over there (the URL also registered with
   Pollar); the bridge appends `/{state}`, which is what the trailing `*` covers. */
const POLLAR_CALLBACK_PATH = '/v1/pollar/oauth/callback';

/* `/cosmos-api/*` -> `/cosmos-api`. The entry is a wildcard URI; the sibling route
   builds its own path under the same prefix. */
function entryPrefix(entry: string): string {
  return entry.trim().replace(/["']/g, '').replace(/\/+\*?$/, '');
}

/* Route id for the public callback. Derived from the main one so a deployment needs no
   extra env var, and so the pair is obvious in the APISIX admin listing. */
export function callbackRouteId(routeId: string): string {
  return `${routeId}-pollar-callback`;
}

/* The gateway URI the callback (and its `/{state}` form) is served on. */
export function callbackRouteUri(entry: string): string {
  return `${entryPrefix(entry)}${POLLAR_CALLBACK_PATH}*`;
}

/* The plugin stack both routes share. `keyAuth: false` drops key-auth AND the header
   normalizer that only exists to feed it -- everything else (CORS, the rewrite, the
   gateway secret, the internal-header scrub, the access log) is identical, so the two
   routes cannot drift into disagreeing about what reaches the upstream. */
function cosmosRoutePlugins(opts: { keyAuth: boolean }) {
  const [rewritePattern, rewriteTemplate] = parseRewriteRegex();

  return {
    // CORS: let the wallet/site (cosmospay.lat) call the gateway from the browser.
    // Runs early (and auto-answers OPTIONS preflight before key-auth), so cross-origin
    // swap calls aren't blocked. Specific origins (not `*`) since credentials are allowed.
    cors: {
      allow_origins: COSMOS_API_CORS_ORIGINS || 'https://cosmospay.lat,https://dev.cosmospay.lat',
      allow_methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      // Idempotency-Key is read by the swap / liquidity / payout routes; a browser
      // cannot send a non-safelisted request header unless preflight allows it here.
      allow_headers: 'Content-Type,Authorization,apikey,Idempotency-Key',
      // A browser hides every response header that is not safelisted, so without this
      // the throttling headers the API already sends are invisible to a web client: it
      // sees a 429 with no idea when to come back, and has to guess an interval against
      // a fixed-window limiter. The Pollar login path is where 429s are ORDINARY --
      // `authorize` is capped because each handshake can fund a Stellar account -- so
      // this is the difference between "retry in 47s" and a retry storm.
      expose_headers: 'Retry-After,RateLimit-Limit,RateLimit-Remaining,RateLimit-Reset',
      allow_credential: true,
      max_age: 86400,
    },

    ...(opts.keyAuth
      ? {
          // Accept the API key in any of three forms and normalize it into the `apikey`
          // header that key-auth reads, BEFORE key-auth runs (phase: rewrite):
          //   - apikey: <key>
          //   - Authorization: <key>
          //   - Authorization: Bearer <key>
          // We only set `apikey` from Authorization when the client didn't already send an
          // `apikey` header, so an explicit apikey always wins. The Bearer prefix is stripped
          // case-insensitively. key-auth (hide_credentials) + proxy-rewrite then drop all of
          // these before the request reaches the upstream.
          'serverless-pre-function': {
            phase: 'rewrite',
            functions: [
              `
return function(conf, ctx)
  if ngx.var.http_apikey and ngx.var.http_apikey ~= "" then
    return
  end
  local auth = ngx.var.http_authorization
  if auth and auth ~= "" then
    local token = string.gsub(auth, "^[Bb][Ee][Aa][Rr][Ee][Rr]%s+", "")
    ngx.req.set_header("apikey", token)
  end
end
`,
            ],
          },

          // API-key auth, APISIX-native: key-auth reads the `apikey` header (fed above from
          // apikey / Authorization / Authorization: Bearer). After a match, the per-credential
          // serverless-pre-function (baked in createApiKey) forwards the key's scopes/role/env
          // downstream as X-Consumer-* headers.
          'key-auth': {
            hide_credentials: true,
          },
        }
      : {}),

    'proxy-rewrite': {
      regex_uri: [rewritePattern, rewriteTemplate],
      headers: {
        // Prove the request came through the gateway (the community server's
        // ApisixGuard always checks this). Only set when configured.
        ...(COSMOS_GATEWAY_SECRET
          ? { set: { 'X-Gateway-Secret': COSMOS_GATEWAY_SECRET } }
          : {}),
        remove: [
          'Authorization',
          'apikey',
          'X-API-KEY',
          // Internal-only markers -- never trust a client-supplied copy. The dev
          // platform sets these server-to-server; X-Cosmos-Admin additionally gates
          // the global owner-only admin endpoints, so it must never come from a client.
          // X-Cosmos-Tos-Cooldown-Ms shortens the KYC email resend limit by dashboard
          // role, so a client must never be able to set it either.
          'X-Cosmos-Internal',
          'X-Cosmos-Admin',
          'X-Cosmos-Tos-Cooldown-Ms',
          // The consumer identity APISIX itself injects after key-auth. Scrubbed on the
          // way in so a client can never supply its own -- which matters most on the
          // keyless callback route, where there is no key-auth step to overwrite them.
          'X-Consumer-Username',
          'X-Consumer-Permissions',
          'X-Consumer-Role',
          'X-Consumer-Env',
          'X-Consumer-Org',
          'X-Consumer-Plan',
          'X-Plan-Swap-Fee-Bps',
        ],
      },
    },

    'serverless-post-function': {
      phase: 'log',
      functions: [
        `
return function(conf, ctx)

  ngx.log(
    ngx.INFO,
    "[ROUTE]",
    ngx.var.uri,
    " STATUS=",
    ngx.status
  )

end
`,
      ],
    },
  };
}

/* Why a call to the APISIX admin API failed, in one short line fit for a log.
   The two failures that actually happen look nothing alike and need telling apart:
   the control plane being unreachable (APISIX/etcd not running, wrong APISIX_URL --
   an axios `code` like ECONNREFUSED and no response), versus APISIX rejecting the
   route definition (a status plus its own `error_msg`, e.g. a bad plugin schema or
   the wrong admin key). Without this the caller could only report "Failed", which
   says nothing about which of the two to go fix. */
export function apisixErrorReason(err: unknown): string {
  const e = err as { code?: string; message?: string; response?: { status?: number; data?: any } };
  const status = e?.response?.status;

  if (status) {
    const data = e.response?.data;
    const detail =
      (data && (data.error_msg || data.message)) ||
      (typeof data === 'string' ? data : null);
    return detail ? `HTTP ${status}: ${detail}` : `HTTP ${status}`;
  }

  return e?.code ? `${e.code} (${APISIX_URL} unreachable)` : e?.message || 'unknown error';
}

/* PUT a route definition, reporting whether it was created or updated -- or, on
   failure, WHY (see apisixErrorReason). Still resolves rather than throwing: route
   sync is best-effort and must not take the request down with it. */
async function putRoute(routeId: string, route: Record<string, unknown>) {
  const exists = await routeExists(routeId);

  const response = await apisix.put(
    `/routes/${routeId}`,
    { id: routeId, ...route },
  ).catch((err: unknown) => ({ __error: apisixErrorReason(err) }) as const);

  if ('__error' in response) {
    return { error: response.__error } as const;
  }

  return {
    created: !exists,
    updated: exists,
    route: response.data,
  };
}

export async function createRoute(
  routeId: string,
  uri: string,
  upstreamHost: string,
) {
  return putRoute(routeId, {
    uri,
    // Explicit, because the callback route below outranks it: APISIX resolves
    // overlapping URIs by priority, highest first.
    priority: 0,
    plugins: cosmosRoutePlugins({ keyAuth: true }),
    upstream: {
      type: 'roundrobin',
      nodes: {
        [normalizeUpstreamHost(upstreamHost)]: 1,
      },
    },
  });
}

/* The keyless sibling, for the Pollar OAuth callback only. GET plus the preflight:
   it serves one browser navigation and nothing else, so anything that is not that
   navigation still meets the authenticated route. */
export async function createCallbackRoute(
  routeId: string,
  entry: string,
  upstreamHost: string,
) {
  return putRoute(callbackRouteId(routeId), {
    uri: callbackRouteUri(entry),
    priority: 10,
    methods: ['GET', 'OPTIONS'],
    plugins: cosmosRoutePlugins({ keyAuth: false }),
    upstream: {
      type: 'roundrobin',
      nodes: {
        [normalizeUpstreamHost(upstreamHost)]: 1,
      },
    },
  });
}

export async function deleteRoute(routeId: string) {
  try {
    const response = await apisix.delete(
      `/routes/${routeId}`,
    );

    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }

    return null;
  }
}

export async function getRoutes() {
  const response = await apisix.get('/routes').catch(err => {
    return null;
  });

  if (!response) {
    return null;
  }


  return response.data;
}

//Api keys routes

function generateApiKey(
  environment: Environment,
): string {
  const token = randomBytes(32).toString('hex');

  return `${environment === 'dev'
    ? 'dv'
    : 'prod'
    }_${token}`;
}


type ForwardEntry = {
  p: string;
  r: 'admin' | 'user';
  e: Environment;
  // Organization the key belongs to, the org's plan, and the plan's swap commission
  // (basis points). Baked from each credential's `org` label + the owner's plan so the
  // Payments API enforces the swap fee per organization — the client can never set or
  // undercut it (the forwarder overwrites these headers on every request).
  o?: string;
  pl?: string;
  f?: number;
};

/* A CONSUMER-level APISIX plugin that forwards each API key's authorization context to
   the upstream, so the community server's PermissionsGuard can enforce `resource:action`
   scopes and pick the Stellar network from the env.

   Why consumer-level (and not per-credential): APISIX credentials only accept auth
   plugins (key-auth/basic-auth/hmac-auth/jwt-auth), so a serverless-pre-function on a
   credential is rejected and never runs. The forwarder therefore lives on the user's
   consumer, where it IS executed for credential-authenticated requests, and switches on
   `ctx.consumer.credential_id` (the key that authenticated) to emit that key's values.
   The map is rebuilt by syncConsumerForwarder() whenever the user's keys change.
   Runs in the `access` phase — after key-auth, before the upstream request. */
function consumerForwardingPlugin(map: Record<string, ForwardEntry>) {
  // Embedded as a Lua long string with a `==` level so JSON quotes/brackets don't need
  // escaping; map values are sanitized in syncConsumerForwarder so they can't contain `]==]`.
  const mapJson = JSON.stringify(map ?? {});
  return {
    phase: 'access',
    functions: [
      `
return function(conf, ctx)
  local cjson = require("cjson.safe")
  local map = cjson.decode([==[${mapJson}]==]) or {}
  local cid = ctx.consumer and ctx.consumer.credential_id
  local entry = cid and map[cid]
  if entry then
    ngx.req.set_header("X-Consumer-Permissions", entry.p or "[]")
    ngx.req.set_header("X-Consumer-Role", entry.r or "user")
    ngx.req.set_header("X-Consumer-Env", entry.e or "dev")
    -- Always set (never append) the org/plan/fee headers so a client-supplied copy is
    -- overwritten — the swap commission is the org plan's rate, enforced server-side.
    ngx.req.set_header("X-Consumer-Org", entry.o or "")
    ngx.req.set_header("X-Consumer-Plan", entry.pl or "")
    ngx.req.set_header("X-Plan-Swap-Fee-Bps", (entry.f ~= nil) and tostring(entry.f) or "")
  end
end
`,
    ],
  };
}

export async function createConsumer(
  userId: string
) {

  const username = userId.includes(keyPrefix) ? userId : `${keyPrefix}${userId}`;

  // Idempotent: never overwrite an existing consumer — it carries the forwarder plugin
  // (syncConsumerForwarder). A blind PUT here would wipe that plugin on every list call.
  const existing = await apisix.get(`/consumers/${username}`).then((r) => r.data).catch(() => null);
  if (existing) {
    return { username };
  }

  const response = await apisix.put(
    `/consumers`,
    {
      username,
    },
  ).catch(err => {
    return null;
  });

  if (!response) {
    return null;
  }

  return {
    username
  };

}

/* Rebuilds the consumer-level forwarder so it reflects the user's CURRENT set of keys.
   Reads every credential's labels (permissions/role/env) and bakes a
   credential_id → context map into a single consumer plugin. APISIX versions the
   per-credential consumer cache by `credential.modifiedIndex .. consumer.modifiedIndex`,
   so updating the consumer here invalidates that cache and the new values take effect on
   the next request — including for credentials created earlier. Best-effort: failures are
   logged but never block the create/update/delete that triggered the sync. */
export async function syncConsumerForwarder(userId: string) {
  const username = userId.includes(keyPrefix) ? userId : `${keyPrefix}${userId}`;

  const credentials = await listUserApiKeys(userId).catch(() => []);

  // Sorted by id so the baked map (and thus the function body) is deterministic — the
  // idempotency check below relies on a stable string for unchanged key sets.
  const sorted = (Array.isArray(credentials) ? credentials : [])
    .slice()
    .sort((a, b) => {
      const ai = a?.value?.id ?? '';
      const bi = b?.value?.id ?? '';
      return ai < bi ? -1 : ai > bi ? 1 : 0;
    });

  // Resolve each org's plan + swap fee once (a user's keys often share an org).
  const orgCtxCache = new Map<string, { plan: string; swapFeeBps: number }>();
  const orgCtx = async (orgId: string) => {
    if (!orgCtxCache.has(orgId)) {
      orgCtxCache.set(
        orgId,
        await orgSwapContext(orgId).catch(() => ({ plan: '', swapFeeBps: 0 })),
      );
    }
    return orgCtxCache.get(orgId)!;
  };

  const map: Record<string, ForwardEntry> = {};
  for (const credential of sorted) {
    const id = credential?.value?.id;
    if (!id) continue;
    const labels = credential.value.labels ?? {};
    // Restrict scopes to a Lua-safe charset so the baked map can never break out of the
    // `[==[ ... ]==]` long string (scopes are `resource:action`, well within this set).
    const permissions = parsePermissionsLabel(labels.permissions).filter((scope) =>
      /^[A-Za-z0-9:_.\-]+$/.test(scope),
    );
    // The key's org (Lua-safe: cuid). When present, bake in the org plan's swap fee so
    // the Payments API charges the right commission for every swap on this key.
    const org =
      typeof labels.org === 'string' && /^[A-Za-z0-9:_.\-]+$/.test(labels.org)
        ? labels.org
        : '';
    const ctx = org ? await orgCtx(org) : null;
    map[id] = {
      p: JSON.stringify(permissions),
      r: parseApiKeyRole(labels.role),
      e: parseApiKeyEnv(labels.env),
      o: org,
      pl: ctx?.plan ?? '',
      f: ctx ? ctx.swapFeeBps : undefined,
    };
  }

  const desired = consumerForwardingPlugin(map);

  // Idempotent: skip the write when the forwarder already matches. This keeps list calls
  // (which sync to self-heal pre-existing keys) cheap and avoids needless consumer
  // revisions that would churn APISIX's per-credential cache.
  const existing = await apisix
    .get(`/consumers/${username}`)
    .then((r) => r.data?.value)
    .catch(() => null);
  const existingFn = existing?.plugins?.['serverless-pre-function']?.functions?.[0];
  if (existing && existingFn === desired.functions[0]) {
    return { username };
  }

  const response = await apisix.put(
    `/consumers`,
    {
      username,
      plugins: {
        'serverless-pre-function': desired,
      },
    },
  ).catch((err) => {
    console.warn('[apisix] failed to sync consumer forwarder', err?.response?.data ?? err?.message);
    return null;
  });

  return response ? { username } : null;
}

export async function createApiKey(
  userId: string,
  environment: Environment,
  permissions: string[],
  role: string,
  name?: string,
  description?: string,
  orgId?: string,
) {

  const username = userId.includes(keyPrefix) ? userId : `${keyPrefix}${userId}`;
  const randomId = keyPrefix + randomUUID();

  const apiKey =
    generateApiKey(environment);

  // permissions/role/org go in labels (constrained: no spaces, <=64 chars); the free-text
  // name/description use APISIX's native `name`/`desc` fields, omitted when empty.
  // `org` scopes the key to an organization so listings can be filtered per workspace.
  const base: Record<string, unknown> = {
    plugins: {
      'key-auth': {
        key: apiKey,
      },
    },
    labels: {
      permissions: JSON.stringify(permissions),
      role: role,
      env: environment,
      ...(orgId ? { org: orgId } : {}),
    },
  };
  if (name && name.trim()) base.name = name.trim();
  if (description && description.trim()) base.desc = description.trim();

  // The credential only holds key-auth + labels. Scope/role/env forwarding is done by a
  // consumer-level plugin (APISIX credentials reject non-auth plugins) refreshed below.
  const url = `/consumers/${username}/credentials/${randomId}`;
  const response = await apisix.put(url, base).catch(() => null);

  if (!response) {
    return null;
  }

  // Rebuild the consumer forwarder so this new key forwards its scopes/role/env downstream.
  await syncConsumerForwarder(userId).catch(() => null);

  return {
    username,
    apiKey,
    id: randomId,
    createdAt: response.data.value.create_time,
    updatedAt: response.data.value.update_time,
    permissions: parsePermissionsLabel(response.data.value.labels?.permissions),
    role: parseApiKeyRole(response.data.value.labels?.role),
    environment: parseApiKeyEnv(response.data.value.labels?.env),
    name: parseLabelString(response.data.value.name),
    description: parseLabelString(response.data.value.desc),
    org: parseLabelString(response.data.value.labels?.org),
  };

}

export async function getApiKey(
  apiKeyId: string,
  userId: string,
) {
  try {
    const username = userId.includes(keyPrefix) ? userId : `${keyPrefix}${userId}`;

    const key = apiKeyId.includes(keyPrefix) ? apiKeyId : `${keyPrefix}${apiKeyId}`;

    const response = await apisix.get(
      `/consumers/${username}/credentials/${key}`,
    );

    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }

    return null;
  }
}

export async function apiKeyExists(
  apiKeyId: string,
  userId: string,
): Promise<boolean> {

  const key = apiKeyId.includes(keyPrefix) ? apiKeyId : `${keyPrefix}${apiKeyId}`;

  const apikey = await getApiKey(key, userId);

  return apikey !== null;
}

export async function listApiKeys() {
  const response = await apisix.get(
    '/consumers',
  ).catch(err => {
    return null;
  });

  if (!response) {
    return null;
  }


  return response.data.list ?? [];
}

export async function listUserApiKeys(
  userId: string,
) {
  const username = userId.includes(keyPrefix) ? userId : `${keyPrefix}${userId}`;


  const response = await apisix.get(
    `/consumers/${username}/credentials`,
  ).catch(err => {
    return null;
  });


  if (!response) {
    return [];
  }


  const consumers =
    response.data.list ?? [];

  return consumers
}

export async function getUserApiKey(
  userId: string,
  apiKeyId: string,
) {

  const key = apiKeyId.includes(keyPrefix) ? apiKeyId : `${keyPrefix}${apiKeyId}`;

  const apiKey =
    await getApiKey(key, userId);

  if (!apiKey) {
    return null;
  }

  return apiKey;
}

export async function deleteApiKey(
  apiKeyId: string,
  userId: string,
) {
  try {
    const key = apiKeyId.includes(keyPrefix) ? apiKeyId : `${keyPrefix}${apiKeyId}`;
    const username = userId.includes(keyPrefix) ? userId : `${keyPrefix}${userId}`;

    const response = await apisix.delete(
      `/consumers/${username}/credentials/${key}`,
    ).catch(err => {
      return null;
    });

    if (!response) {
      return null;
    }

    // Drop the revoked key from the consumer forwarder map.
    await syncConsumerForwarder(userId).catch(() => null);

    return {
      success: true,
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null
    }

    return null;
  }
}

/* Swap a credential's secret, keeping its identity. `permissions` is optional and
   exists for one case: a wallet-provisioned account whose keys were minted before a
   scope existed (`pollar:*`, say). Rotation is the only lever those users have -- the
   dashboard refuses them additional keys -- so re-applying the current scope set here
   is what lets an existing account reach a newly added surface instead of being stuck
   with a key that can never be granted it. Absent, the labels are kept verbatim. */
export async function rotateApiKey(
  apiKeyId: string,
  userId: string,
  environment: Environment,
  permissions?: string[],
) {
  const key = apiKeyId.includes(keyPrefix) ? apiKeyId : `${keyPrefix}${apiKeyId}`;

  const apiKey =
    await getApiKey(apiKeyId, userId).catch(err => {
      return null;
    });

  if (!apiKey) {
    return null;
  }

  const username = userId.includes(keyPrefix) ? userId : `${keyPrefix}${userId}`;

  const newApiKey =
    generateApiKey(environment);

  const response = await apisix.put(
    `/consumers/${username}/credentials/${key}`,
    {
      // Keep the downstream-forwarding plugin (and any others); only swap the key.
      plugins: {
        ...(apiKey.value.plugins ?? {}),
        'key-auth': {
          key: newApiKey,
        },
      },
      labels: permissions
        ? { ...(apiKey.value.labels ?? {}), permissions: JSON.stringify(permissions) }
        : apiKey.value.labels,
    },
  );

  if (!response) {
    return null;
  }

  // The consumer forwarder bakes credential_id -> scopes into a single plugin, so a
  // label change here is invisible downstream until it is rebuilt: the key would work
  // and its new scopes would not. Only needed when the labels actually moved.
  if (permissions) {
    await syncConsumerForwarder(userId).catch(() => null);
  }

  return {
    apiKeyId,
    apiKey: newApiKey,
    username,
    createdAt: response.data.value.create_time,
    updatedAt: response.data.value.update_time,
    permissions: parsePermissionsLabel(response.data.value.labels?.permissions),
    role: parseApiKeyRole(response.data.value.labels?.role),
    environment: parseApiKeyEnv(response.data.value.labels?.env),
    name: parseLabelString(response.data.value.name),
    description: parseLabelString(response.data.value.desc),
  };
}

export async function countUserApiKeys(
  userId: string,
) {
  const keys =
    await listUserApiKeys(userId);

  return keys.length;
}

export async function updateApiKey(
  apiKeyId: string,
  userId: string,
  permissions: string[],
  role: string,
  name?: string,
  description?: string,
) {
  const key = apiKeyId.includes(keyPrefix) ? apiKeyId : `${keyPrefix}${apiKeyId}`;
  const username = userId.includes(keyPrefix) ? userId : `${keyPrefix}${userId}`;

  const existing = await getApiKey(apiKeyId, userId);

  if (!existing?.value?.plugins) {
    return null;
  }

  // Preserve existing name/description (native fields) when not explicitly provided.
  const nextName = (name !== undefined ? name : parseLabelString(existing.value.name)).trim();
  const nextDescription = (description !== undefined ? description : parseLabelString(existing.value.desc)).trim();

  // Preserve the key's environment + organization (set at creation). Scope/role forwarding
  // lives on the consumer (see syncConsumerForwarder), not on the credential.
  const existingEnv: Environment = existing.value.labels?.env === 'prod' ? 'prod' : 'dev';
  const existingOrg = existing.value.labels?.org;

  const payload: Record<string, unknown> = {
    plugins: {
      ...(existing.value.plugins ?? {}),
    },
    labels: {
      permissions: JSON.stringify(permissions),
      role: role,
      env: existingEnv,
      ...(existingOrg ? { org: existingOrg } : {}),
    },
  };
  if (nextName) payload.name = nextName;
  if (nextDescription) payload.desc = nextDescription;

  const response = await apisix.put(
    `/consumers/${username}/credentials/${key}`,
    payload,
  ).catch(err => {
    return null;
  });

  if (!response) {
    return null;
  }

  // Refresh the consumer forwarder so the new scopes/role take effect immediately.
  await syncConsumerForwarder(userId).catch(() => null);

  return {
    apiKeyId,
    permissions,
    role,
    environment: existingEnv,
    name: nextName,
    description: nextDescription,
    createdAt: response.data.value.create_time,
    updatedAt: response.data.value.update_time,
  };
}