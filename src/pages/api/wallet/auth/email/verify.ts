/* POST /api/wallet/auth/email/verify — exchange an emailed code for a sign-in.

   The code finishes both an email sign-in and a Google/GitHub sign-in that landed on an
   existing account (the claim answered `verify_email`). Wrong codes are counted and lock
   the attempt after a few. Outcomes ride in `data.status` with HTTP 200 — `ready`,
   `invalid`, `expired`, `locked` — like POST /api/wallet/link/verify. */
import { ApiStatus, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { clientIp } from "@/lib/geo";
import { verifyEmailLogin } from "@/lib/wallet-auth";
import { walletAuthEmailVerifyBodySchema } from "@/schemas/wallet-auth";
import type { APIRoute } from "astro";

const MESSAGES: Record<string, string> = {
  ready: "Signed in.",
  invalid: "Incorrect code.",
  expired: "This code expired — ask for a new one.",
  locked: "Too many attempts — ask for a new code.",
};

export const POST: APIRoute = async (ctx) => {
  const body = await parseJson(ctx.request, walletAuthEmailVerifyBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  const result = await verifyEmailLogin({
    claimToken: body.data.claimToken,
    code: body.data.code,
    clientIp: clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown",
  }).catch(() => null);

  if (!result) {
    return jsonError({ message: "Could not complete the sign-in", code: 500, status: ApiStatus.INTERNAL_ERROR });
  }
  if (result.status === "rate_limited") {
    return jsonError({ message: "Too many attempts — wait a moment and try again.", code: 429, status: ApiStatus.BAD_REQUEST });
  }
  return jsonSuccess({ data: result, message: MESSAGES[result.status] ?? "OK" });
};
