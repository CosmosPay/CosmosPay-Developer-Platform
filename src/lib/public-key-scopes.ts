/* public-key-scopes.ts: what the shared public key may do, kept apart from public-key.ts
   (which provisions it through the database and APISIX) so the list and its drift check
   load in a unit test with neither. */

/**
 * Exactly the scopes the allowlisted routes require, and nothing else.
 *
 * Notably absent: `activity:read` (it would replay every anonymous wallet's
 * telemetry), every `kyc:*` scope (identity documents are per-person by
 * definition), and `webhooks:*` / `products:*` / `customers:*` (merchant
 * configuration).
 *
 * `activity:write` IS here, and it matters: a wallet with no account still
 * crashes, and without this scope its error reports would be refused with a 403,
 * blinding us to exactly the population that meets first-run failures. Events on
 * this key are anonymous by construction, so the wallet strips anything that
 * names an account or a transaction before sending.
 *
 * `swaps:read` is here only because `POST /v1/swaps/quote` requires it. It also
 * unlocks `GET /v1/swaps`, which is why the Payments service does not rely on
 * scopes alone for this key (see PublicKeyGuard).
 *
 * `onramp:*` / `offramp:*` are here for buying and selling with local money from
 * a wallet with no account (`/v1/onramp/p2p`, `/v1/offramp/p2p`): the market, a
 * quote, opening an order and reading that one order back with its record token.
 * The same scopes guard the fiat partner's per-person routes (identity-checked
 * accounts, bank accounts, payouts); none of those handlers admits the shared key
 * (`@AllowPublicKey`), so PublicKeyGuard refuses it there whatever the scopes say,
 * and the P2P list routes stay closed to it the same way. Its P2P orders carry the
 * Payments service's public referral id (`ELDORADO_PUBLIC_REFERRAL_ID`), the one
 * priced at the highest integrator commission: anonymous use pays the most, as
 * with swaps (`community`), and registering is what buys a lower rate.
 */
export const PUBLIC_KEY_SCOPES: readonly string[] = [
  "swaps:read",
  "swaps:write",
  "liquidity:read",
  "liquidity:write",
  "payments:read",
  "payments:write",
  "activity:write",
  "onramp:read",
  "onramp:write",
  "offramp:read",
  "offramp:write",
];

/** One credential of the public consumer, as the drift check reads it. */
export interface PublicCredentialScopes {
  id: string;
  scopes: readonly string[];
}

/**
 * The ids of the credentials whose scopes are not exactly `wanted` (order aside).
 *
 * A credential's scopes are fixed when it is minted, and the public key's value is
 * compiled into every wallet, so it is never rotated just to pick up a scope: adding
 * one to PUBLIC_KEY_SCOPES reaches the existing keys only through this check, which
 * `ensurePublicKeys` runs on every call and answers by re-labelling each id listed.
 */
export function credentialsWithStaleScopes(
  credentials: readonly PublicCredentialScopes[],
  wanted: readonly string[] = PUBLIC_KEY_SCOPES,
): string[] {
  const want = [...new Set(wanted)].sort().join(",");
  return credentials
    .filter((c) => [...new Set(c.scopes)].sort().join(",") !== want)
    .map((c) => c.id);
}
