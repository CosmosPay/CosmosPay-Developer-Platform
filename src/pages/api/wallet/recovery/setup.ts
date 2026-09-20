/* POST /api/wallet/recovery/setup — the operator pays the reserve for an account's recovery
   signers, and hands back the transaction that adds them.

   This is the half of SEP-30 registration an account with no spare lumens cannot do for
   itself: two signer entries cost 0.5 XLM of reserve each. The operator sponsors them (and
   can reclaim them later), builds the transaction and signs as sponsor — the ACCOUNT's own
   signature is deliberately missing, because the wallet adds it only after its guard has
   decoded every operation. See src/lib/recovery-setup.ts for the shape and the weights.

   It lives here rather than on a recovery server on purpose: the sponsor key is the
   operator's money, and the recovery servers are the two things that must not also be able
   to spend it. `Authorization: Bearer <sessionToken>` from a wallet sign-in, plus a
   signature by the account over the canonical setup challenge — so the operator only pays
   for accounts whose key is in the hands of someone who just signed in. */
import { Keypair, Networks } from "@stellar/stellar-sdk";
import {
  BETTER_AUTH_SECRET,
  RECOVERY_HORIZON_URL,
  RECOVERY_NETWORK_PASSPHRASE,
  RECOVERY_SPONSOR_SECRET,
} from "astro:env/server";
import { ApiStatus, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { clientIp } from "@/lib/geo";
import { withinBudget } from "@/lib/rate-limit";
import { verifyStellarSignature } from "@/lib/stellar-verify";
import { readSessionToken, recoverySetupMessage, signedAtFresh } from "@/lib/wallet-auth-core";
import { buildRecoverySetup } from "@/lib/recovery-setup";
import { recoverySetupBodySchema } from "@/schemas/recovery";
import type { APIRoute } from "astro";

const WINDOW_MS = 10 * 60 * 1000;

export const POST: APIRoute = async (ctx) => {
  if (!RECOVERY_SPONSOR_SECRET) {
    return jsonError({
      message: "Sponsored recovery setup is not available here.",
      code: 503,
      status: ApiStatus.INTERNAL_ERROR,
    });
  }
  const ip = clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown";
  // Tight, and global as well as per address: every call this admits costs the operator XLM.
  if (!withinBudget("recovery:setup", ip, { limit: 5, windowMs: WINDOW_MS }, { limit: 200, windowMs: WINDOW_MS })) {
    return jsonError({ message: "Too many requests — wait a moment.", code: 429, status: ApiStatus.BAD_REQUEST });
  }

  const token = /^Bearer\s+(\S+)$/i.exec(ctx.request.headers.get("authorization") ?? "")?.[1];
  const identity = token ? readSessionToken(token, BETTER_AUTH_SECRET) : null;
  if (!identity) return jsonError({ message: "Sign in first.", code: 401, status: ApiStatus.UNAUTHORIZED });

  const body = await parseJson(ctx.request, recoverySetupBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }
  const { stellarAddress, signers, signedAt, signature } = body.data;
  if (!signedAtFresh(signedAt)) {
    return jsonError({ message: "Invalid or stale signature.", code: 401, status: ApiStatus.UNAUTHORIZED });
  }
  if (!verifyStellarSignature(stellarAddress, recoverySetupMessage(stellarAddress, signers, signedAt), signature)) {
    return jsonError({ message: "Invalid or stale signature.", code: 401, status: ApiStatus.UNAUTHORIZED });
  }

  const horizon = (RECOVERY_HORIZON_URL || "https://horizon.stellar.org").replace(/\/+$/, "");
  let sequence: string;
  try {
    const res = await fetch(`${horizon}/accounts/${encodeURIComponent(stellarAddress)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404) {
      // Signers are entries on an account that exists; an unfunded one has nothing to add
      // them to, and saying so is more useful than a transaction that would bounce.
      return jsonError({ message: "This account does not exist on the network yet.", code: 409, status: ApiStatus.CONFLICT });
    }
    if (!res.ok) throw new Error(String(res.status));
    sequence = String((await res.json()).sequence);
  } catch {
    return jsonError({ message: "Could not read the account.", code: 503, status: ApiStatus.INTERNAL_ERROR });
  }

  const sponsor = Keypair.fromSecret(RECOVERY_SPONSOR_SECRET);
  const xdr = buildRecoverySetup({
    account: stellarAddress,
    signers: [signers[0], signers[1]],
    networkPassphrase: RECOVERY_NETWORK_PASSPHRASE || Networks.PUBLIC,
    sequence,
    sponsor,
  });

  return jsonSuccess({
    data: { transaction: xdr, sponsor: sponsor.publicKey(), network_passphrase: RECOVERY_NETWORK_PASSPHRASE || Networks.PUBLIC },
    message: "Sign it with the account's key and submit it.",
  });
};
