/* apisix-upstream.ts — the pure half of the APISIX route sync (src/utils/apisix.ts).

   Two decisions live here rather than beside the admin calls, because both are the kind that
   fail silently in production and neither needs `astro:env` or a network to be checked:
   tests/unit/apisixUpstream.test.ts reaches them directly.

     - How an upstream env value becomes APISIX `nodes`. One `host:port` is what every
       deployment has always set, and it must keep producing exactly the node it produced
       before; a comma-separated list is how the community server runs as several replicas
       behind the gateway's load balancer.
     - Whether the configured proxy-rewrite would mangle a path that lives OUTSIDE the
       gateway entry. `/.well-known/stellar.toml` has no entry prefix — SEP-1 fixes it at the
       root of the host — so a rewrite pattern broad enough to match it would send discovery
       somewhere the community server does not serve it, and every SEP-10 client would read a
       404 as "this domain runs no recovery server". */

/** `https://x.y` / `x.y:3000` / `"x.y"` -> `x.y:443` / `x.y:3000` / `x.y:80`. */
export function normalizeUpstreamHost(upstreamHost: string): string {
  const trimmed = upstreamHost.trim().replace(/^["']|["']$/g, "");

  try {
    const { hostname, port, protocol } = new URL(trimmed.includes("://") ? trimmed : `http://${trimmed}`);

    if (!hostname) {
      return trimmed;
    }

    const defaultPort = protocol === "https:" ? "443" : "80";

    return port ? `${hostname}:${port}` : `${hostname}:${defaultPort}`;
  } catch {
    return trimmed;
  }
}

/**
 * The APISIX `nodes` map for an upstream env value: one entry per comma-separated
 * `host:port`, each at weight 1, so `roundrobin` spreads requests evenly across replicas.
 *
 * Equal weights on purpose. Replicas of the community server are the same build against the
 * same database — nothing here knows one is bigger than another, and a weight nobody measured
 * is a hot spot somebody has to find later. A duplicated entry collapses into one node rather
 * than silently doubling that replica's share.
 */
export function upstreamNodes(value: string): Record<string, number> {
  const nodes: Record<string, number> = {};
  for (const part of value.replace(/^["']|["']$/g, "").split(",")) {
    if (!part.trim()) continue;
    nodes[normalizeUpstreamHost(part)] = 1;
  }
  return nodes;
}

/**
 * The value for a route's APISIX `host` match: a bare hostname, lowercased.
 *
 * Operators paste URLs (`https://recovery-a.example.com/`) as often as hosts. APISIX compares
 * `host` against the request's Host with no scheme, port or path, so any of those left in
 * would make a route that matches nothing — silently, since the unbound SEP route would go on
 * answering in its place, for the wrong deployment.
 */
export function routeHost(value: string): string {
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  try {
    return new URL(trimmed.includes("://") ? trimmed : `http://${trimmed}`).hostname.toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

/**
 * Does this proxy-rewrite pattern leave `path` untouched?
 *
 * APISIX's `regex_uri` forwards the original URI when the pattern does not match, so "leaves
 * it unchanged" is exactly "does not match". Checked with a JS RegExp: APISIX runs PCRE, but
 * the patterns this deployment uses (`^/cosmos-api/(.*)`) mean the same thing in both, and a
 * pattern JS cannot compile is reported as touching the path — refusing a route on a doubt is
 * cheaper than publishing one that breaks discovery.
 */
export function rewriteLeavesPath(pattern: string, path: string): boolean {
  try {
    return !new RegExp(pattern).test(path);
  } catch {
    return false;
  }
}
