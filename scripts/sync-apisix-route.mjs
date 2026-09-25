/* sync-apisix-route.mjs — point the APISIX routes' upstream at COSMOS_API_URL from .env.
   Standalone (reads .env itself, no server needed). Run:  node scripts/sync-apisix-route.mjs
   Useful to fix a stale route immediately without restarting the app.

   EVERY route is patched: the main one, and the keyless siblings — `-oauth-callbacks` (the
   Pollar and wallet sign-in callbacks a browser lands on), `-sep` (stellar.toml, SEP-10,
   SEP-30), and `-sep-recovery-{a,b}` when COSMOS_RECOVERY_{A,B}_UPSTREAM is set, each to its
   OWN upstream (see src/utils/apisix.ts). Patching only the first is how a tunnel change
   leaves social login or recovery pointing at an upstream that moved — with the rest of the
   API working perfectly, so nothing says which half is stale. The siblings are created by
   the app at boot; a 404 here just means one does not exist yet.

   This only moves upstreams. Routes, plugins and hosts are defined in one place, the app's
   sync; duplicating that here would be a second copy of the plugin stack to drift.

   Each upstream may be a comma-separated list of `host:port` replicas, balanced round-robin
   at weight 1 — the same parsing as upstreamNodes() in src/lib/apisix-upstream.ts, repeated
   here because this script runs under plain Node with no TypeScript or `@/` alias. */
import { readFileSync } from "node:fs";

function loadEnv(path = ".env") {
  const env = {};
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    // strip an inline comment that is NOT inside quotes
    if (!/^["']/.test(val)) val = val.replace(/\s+#.*$/, "");
    val = val.replace(/^["']|["']$/g, "");
    env[key] = val;
  }
  return env;
}

function normalizeHost(u) {
  const t = String(u).trim().replace(/^["']|["']$/g, "");
  try {
    const { hostname, port, protocol } = new URL(t.includes("://") ? t : `http://${t}`);
    if (!hostname) return t;
    const dp = protocol === "https:" ? "443" : "80";
    return port ? `${hostname}:${port}` : `${hostname}:${dp}`;
  } catch {
    return t;
  }
}

function nodesOf(value) {
  const nodes = {};
  for (const part of String(value ?? "").replace(/^["']|["']$/g, "").split(",")) {
    if (!part.trim()) continue;
    nodes[normalizeHost(part)] = 1;
  }
  return nodes;
}

const env = loadEnv();
const base = (env.APISIX_URL || "").replace(/\/+$/, "");
const routeId = env.APISSIX_ROUTE_ID;
const mainNodes = nodesOf(env.COSMOS_API_URL);

if (!base || !routeId || !env.APISIX_ADMIN_KEY) {
  console.error("Missing APISIX_URL / APISSIX_ROUTE_ID / APISIX_ADMIN_KEY in .env");
  process.exit(1);
}

if (Object.keys(mainNodes).length === 0) {
  console.error("COSMOS_API_URL is empty in .env");
  process.exit(1);
}

async function patchRoute(id, nodes, { optional = false } = {}) {
  const url = `${base}/routes/${id}`;
  const list = Object.keys(nodes).join(", ");
  console.log(`Patching ${url} -> upstream ${list}`);

  // PATCH on the `upstream/nodes` SUB-PATH, not on the route: APISIX merges a route-level
  // PATCH into what is there, so a replica dropped from the list would stay in rotation,
  // while a sub-path PATCH replaces that value outright.
  const res = await fetch(`${url}/upstream/nodes`, {
    method: "PATCH",
    headers: { "X-API-KEY": env.APISIX_ADMIN_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(nodes),
  });

  const text = await res.text();
  if (res.ok) {
    console.log(`✓ Route "${id}" synced (${res.status}). Upstream is now ${list}.`);
    return true;
  }
  if (optional && res.status === 404) {
    console.warn(`- Route "${id}" does not exist yet; the app creates it at boot.`);
    return true;
  }
  console.error(`✗ APISIX returned ${res.status} for "${id}": ${text}`);
  return false;
}

const results = [
  await patchRoute(routeId, mainNodes),
  await patchRoute(`${routeId}-oauth-callbacks`, mainNodes, { optional: true }),
  // The Pollar-only route the callbacks route replaced; the app deletes it at boot.
  await patchRoute(`${routeId}-pollar-callback`, mainNodes, { optional: true }),
  await patchRoute(`${routeId}-sep`, mainNodes, { optional: true }),
];
for (const role of ["a", "b"]) {
  const nodes = nodesOf(env[`COSMOS_RECOVERY_${role.toUpperCase()}_UPSTREAM`]);
  if (Object.keys(nodes).length === 0) continue;
  results.push(await patchRoute(`${routeId}-sep-recovery-${role}`, nodes, { optional: true }));
}
if (results.includes(false)) process.exit(1);
