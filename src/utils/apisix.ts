import axios from "axios";
import {
  APISIX_ADMIN_KEY,
  APISIX_URL,
  COSMOS_API_REWRITE,
  COSMOS_GATEWAY_SECRET,
} from "astro:env/server";
import { randomBytes, randomUUID } from "node:crypto";

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

export async function createRoute(
  routeId: string,
  uri: string,
  upstreamHost: string,
) {
  const exists = await routeExists(routeId);
  const [rewritePattern, rewriteTemplate] = parseRewriteRegex();
  const upstreamNode = normalizeUpstreamHost(upstreamHost);

  const route = {
    id: routeId,

    uri,

    plugins: {
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

      'proxy-rewrite': {
        regex_uri: [rewritePattern, rewriteTemplate],
        headers: {
          // Prove the request came through the gateway (the community server's
          // ApisixGuard checks this when ENFORCE_GATEWAY=true). Only set when configured.
          ...(COSMOS_GATEWAY_SECRET
            ? { set: { 'X-Gateway-Secret': COSMOS_GATEWAY_SECRET } }
            : {}),
          remove: [
            'Authorization',
            'apikey',
            'X-API-KEY',
            // Internal-only marker — never trust a client-supplied copy.
            'X-Cosmos-Internal',
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
    },

    upstream: {
      type: 'roundrobin',
      nodes: {
        [upstreamNode]: 1,
      },
    },
  };

  const response = await apisix.put(
    `/routes/${routeId}`,
    route,
  ).catch(err => {
    return null;
  });

  if (!response) {
    return null;
  }

  return {
    created: !exists,
    updated: exists,
    route: response.data,
  };
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


/* A per-credential APISIX plugin that forwards the key's authorization context to
   the upstream once this key authenticates. The values are baked in at create/update
   time (no runtime label lookup), so the community server's PermissionsGuard can
   enforce `read`/`write` scopes and pick the Stellar network from the env.
   Runs in the `access` phase — after key-auth, before the upstream request. */
function forwardingPlugin(permissions: string[], role: string, environment: Environment) {
  const permsJson = JSON.stringify(permissions ?? []);
  const safeRole = role === 'admin' ? 'admin' : 'user';
  const env = environment === 'prod' ? 'prod' : 'dev';
  return {
    phase: 'access',
    functions: [
      `
return function(conf, ctx)
  ngx.req.set_header("X-Consumer-Permissions", '${permsJson}')
  ngx.req.set_header("X-Consumer-Role", "${safeRole}")
  ngx.req.set_header("X-Consumer-Env", "${env}")
end
`,
    ],
  };
}

export async function createConsumer(
  userId: string
) {

  const username = userId.includes(keyPrefix) ? userId : `${keyPrefix}${userId}`;



  const response = await apisix.put(
    `/consumers/`,
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

  // Preferred payload adds a per-credential function that forwards the key's
  // scopes/role/env downstream after auth.
  const withForwarding: Record<string, unknown> = {
    ...base,
    plugins: {
      ...(base.plugins as Record<string, unknown>),
      'serverless-pre-function': forwardingPlugin(permissions, role, environment),
    },
  };

  const url = `/consumers/${username}/credentials/${randomId}`;
  let response = await apisix.put(url, withForwarding).catch(() => null);
  if (!response) {
    // Some APISIX builds reject extra plugins on a credential — fall back to a
    // plain key so creation still succeeds (downstream scope forwarding stays off
    // until the gateway supports it; the dashboard path is unaffected).
    console.warn('[apisix] credential forwarding plugin rejected; creating key without it');
    response = await apisix.put(url, base).catch(() => null);
  }

  if (!response) {
    return null;
  }

  return {
    username,
    apiKey,
    id: randomId,
    createdAt: response.data.value.create_time,
    updatedAt: response.data.value.update_time,
    permissions: parsePermissionsLabel(response.data.value.labels?.permissions),
    role: parseApiKeyRole(response.data.value.labels?.role),
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

export async function rotateApiKey(
  apiKeyId: string,
  userId: string,
  environment: Environment,
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
      labels: apiKey.value.labels,
    },
  );

  if (!response) {
    return null;
  }

  return {
    apiKeyId,
    apiKey: newApiKey,
    createdAt: response.data.value.create_time,
    updatedAt: response.data.value.update_time,
    permissions: parsePermissionsLabel(response.data.value.labels?.permissions),
    role: parseApiKeyRole(response.data.value.labels?.role),
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

  // Preserve the key's environment + organization (set at creation) and refresh the
  // downstream-forwarding plugin so the new scopes/role take effect immediately.
  const existingEnv: Environment = existing.value.labels?.env === 'prod' ? 'prod' : 'dev';
  const existingOrg = existing.value.labels?.org;

  const payload: Record<string, unknown> = {
    plugins: {
      ...(existing.value.plugins ?? {}),
      'serverless-pre-function': forwardingPlugin(permissions, role, existingEnv),
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

  return {
    apiKeyId,
    permissions,
    role,
    name: nextName,
    description: nextDescription,
    createdAt: response.data.value.create_time,
    updatedAt: response.data.value.update_time,
  };
}