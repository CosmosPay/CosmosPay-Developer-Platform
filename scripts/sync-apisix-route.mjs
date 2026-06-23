/* sync-apisix-route.mjs — point the APISIX route's upstream at COSMOS_API_URL from .env.
   Standalone (reads .env itself, no server needed). Run:  node scripts/sync-apisix-route.mjs
   Useful to fix a stale route immediately without restarting the app. */
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

const env = loadEnv();
const base = (env.APISIX_URL || "").replace(/\/+$/, "");
const routeId = env.APISSIX_ROUTE_ID;
const node = normalizeHost(env.COSMOS_API_URL);

if (!base || !routeId || !env.APISIX_ADMIN_KEY) {
  console.error("Missing APISIX_URL / APISSIX_ROUTE_ID / APISIX_ADMIN_KEY in .env");
  process.exit(1);
}

const url = `${base}/routes/${routeId}`;
console.log(`Patching ${url} -> upstream ${node}`);

const res = await fetch(url, {
  method: "PATCH",
  headers: { "X-API-KEY": env.APISIX_ADMIN_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ upstream: { type: "roundrobin", nodes: { [node]: 1 } } }),
});

const text = await res.text();
if (res.ok) {
  console.log(`✓ Route synced (${res.status}). Upstream is now ${node}.`);
} else {
  console.error(`✗ APISIX returned ${res.status}: ${text}`);
  process.exit(1);
}
