/* console-call.ts — who may call the console legs, decided with nothing but node:*.

   The wallet's sign-in and both recovery servers run on the community server now; this
   console keeps only the legs that service calls BACK into (src/lib/wallet-auth-console.ts):
   delivering the codes it mints and minting the keys it cannot. Every one of those legs is a
   way to make this platform email a stranger or create an account, so the decision of who is
   calling is the whole of their authorization — and it lives here, free of `astro:env` and
   the database, so tests/unit/consoleCall.test.ts reaches all of it. The route handlers only
   supply the configured values, which is the half a unit test cannot see. */
import { timingSafeEqual } from "node:crypto";

/**
 * The header APISIX strips from everything it proxies, so only a backend can present it,
 * and the header carrying the shared secret. Both are read by
 * `src/lib/wallet-auth-console.ts`; they live here so the decision below is reachable from
 * a unit test, which is the rule the whole of this file exists to follow.
 */
export const CONSOLE_INTERNAL_HEADER = "x-cosmos-internal";
export const CONSOLE_SECRET_HEADER = "x-gateway-secret";

/**
 * The header a recovery server presents when it asks for a recovery code to be delivered.
 * Its own name rather than `x-gateway-secret`: the recovery servers are separate
 * deployments with their own operators, and a secret one of them holds must never be the
 * one that also mints accounts through `provision`.
 */
export const RECOVERY_SECRET_HEADER = "x-cosmos-recovery-secret";

/**
 * The shortest recovery-console secret this platform will honour. A configured entry below
 * it is IGNORED rather than accepted: a short value is a typo or a placeholder, and one that
 * guessable would be a way for anyone to have this platform send "recover your wallet" mail
 * in its own name.
 */
export const RECOVERY_SECRET_MIN_CHARS = 32;

/** Values that mean "not internal" even when the marker is present. */
const CONSOLE_FALSY = new Set(["", "0", "false", "no"]);

/** Constant-time equality over two strings; unequal lengths answer false without a compare. */
function sameSecret(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Is this call from the community server, which is where the wallet's sign-in now runs?
 *
 * Both signals are required and each answers a different question: the secret says WHO, and
 * the stripped marker says the call did not arrive from a client through the gateway. One
 * without the other is not a weaker check but a different one — a leaked secret presented
 * by a browser still fails, and a forged marker with no secret still fails.
 *
 * It FAILS CLOSED on an unconfigured secret. That is the case worth stating: with `configured`
 * empty, a length-and-bytes comparison against an absent header would be a match, and a
 * platform that had never heard of the community server would be minting accounts for
 * anyone who found the route.
 *
 * Constant time, because the comparison is over a secret and the timing of a byte-wise early
 * exit is exactly what that leaks.
 */
export function isConsoleCall(headers: Headers, configured: string): boolean {
  const secret = configured.trim();
  if (!secret) return false;

  const marker = headers.get(CONSOLE_INTERNAL_HEADER)?.trim().toLowerCase() ?? "";
  if (!marker || CONSOLE_FALSY.has(marker)) return false;

  return sameSecret(headers.get(CONSOLE_SECRET_HEADER)?.trim() ?? "", secret);
}

/**
 * The recovery-console secrets a deployment accepts, from the comma-separated env value.
 *
 * A LIST because there are two recovery servers, each a separate deployment with its own
 * operator — sharing one secret between them would let either impersonate the other to this
 * mailer, and would make rotating one a coordinated change to both. Entries shorter than
 * `RECOVERY_SECRET_MIN_CHARS` are dropped, never honoured.
 */
export function recoverySecrets(configured: string): string[] {
  return configured
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length >= RECOVERY_SECRET_MIN_CHARS);
}

/**
 * Is this call from one of the recovery servers, asking for a recovery code to be emailed?
 *
 * The secret alone is the check, with no internal marker beside it: a recovery server is a
 * separate deployment that may reach this console directly rather than through our APISIX,
 * so the marker APISIX strips is not something it can be relied on to present.
 *
 * It FAILS CLOSED exactly like `isConsoleCall`: an empty list admits nobody, and an absent
 * header never compares equal to anything, because an empty string is never an accepted
 * entry. Every configured entry is compared, and in constant time, so neither which entry
 * matched nor how far a guess got is visible in the timing.
 */
export function isRecoveryConsoleCall(headers: Headers, configured: string): boolean {
  const accepted = recoverySecrets(configured);
  if (accepted.length === 0) return false;

  const presented = headers.get(RECOVERY_SECRET_HEADER)?.trim() ?? "";
  if (!presented) return false;

  let ok = false;
  for (const secret of accepted) ok = sameSecret(presented, secret) || ok;
  return ok;
}

/** A display name when the provider gave none. */
export function fallbackName(email: string, name?: string | null): string {
  return name?.trim() || email.split("@")[0] || "Cosmos user";
}
