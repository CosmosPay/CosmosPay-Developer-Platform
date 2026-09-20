/* GET|POST /api/sep10/auth — SEP-10 Stellar Web Authentication.

   `GET ?account=G…` hands out a challenge; `POST { transaction }` takes the signed one back
   and answers with the token the recovery routes accept. The rules are in src/lib/sep10.ts,
   including why a challenge can never be submitted and why a recovered account still
   authenticates with the key that replaced the lost one.

   Public, like every SEP-10 endpoint: proving control of the account IS the authentication.
   Only a deployment configured as a recovery server offers it (src/lib/recovery-config.ts);
   anywhere else it answers 503. */
import { ApiStatus, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { clientIp } from "@/lib/geo";
import { allow } from "@/lib/rate-limit";
import { issueJwt } from "@/lib/jwt";
import { accountSigners, recoveryConfig } from "@/lib/recovery-config";
import { buildChallenge, readChallenge, SEP10_JWT_TTL_S, verifyChallenge } from "@/lib/sep10";
import { sep10AccountQuerySchema, sep10TokenBodySchema } from "@/schemas/recovery";
import type { APIRoute } from "astro";

const WINDOW_MS = 10 * 60 * 1000;
const unavailable = () =>
  jsonError({ message: "This deployment is not a recovery server.", code: 503, status: ApiStatus.INTERNAL_ERROR });

export const GET: APIRoute = async (ctx) => {
  const cfg = recoveryConfig();
  if (!cfg) return unavailable();
  const ip = clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown";
  if (!allow("sep10:challenge", ip, { limit: 60, windowMs: WINDOW_MS })) {
    return jsonError({ message: "Too many requests — wait a moment.", code: 429, status: ApiStatus.BAD_REQUEST });
  }

  const params = sep10AccountQuerySchema.safeParse({ account: ctx.url.searchParams.get("account") ?? "" });
  if (!params.success) {
    return jsonError({ message: "Invalid account", code: 400, status: ApiStatus.BAD_REQUEST });
  }
  return jsonSuccess({
    data: {
      transaction: buildChallenge(cfg.sep10, params.data.account),
      network_passphrase: cfg.sep10.networkPassphrase,
    },
    message: "Sign this challenge and post it back.",
  });
};

export const POST: APIRoute = async (ctx) => {
  const cfg = recoveryConfig();
  if (!cfg) return unavailable();
  const ip = clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown";
  if (!allow("sep10:token", ip, { limit: 60, windowMs: WINDOW_MS })) {
    return jsonError({ message: "Too many requests — wait a moment.", code: 429, status: ApiStatus.BAD_REQUEST });
  }

  const body = await parseJson(ctx.request, sep10TokenBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }

  // Structure first, and only then Horizon: a challenge that is not ours — another server's,
  // another domain's, an expired one — is refused without a network call.
  const structure = readChallenge(cfg.sep10, body.data.transaction);
  if (!structure.ok) {
    return jsonError({ message: `Invalid challenge (${structure.error})`, code: 400, status: ApiStatus.BAD_REQUEST });
  }

  // The account's own signers and threshold decide how much signing weight is enough.
  let account: { signers: { key: string; weight: number }[]; threshold: number } | null;
  try {
    account = await accountSigners(cfg, structure.account);
  } catch {
    return jsonError({ message: "Could not read the account", code: 503, status: ApiStatus.INTERNAL_ERROR });
  }

  const verified = verifyChallenge(cfg.sep10, body.data.transaction, account);
  if (!verified.ok) {
    return jsonError({ message: `Invalid challenge (${verified.error})`, code: 401, status: ApiStatus.UNAUTHORIZED });
  }

  const now = Math.floor(Date.now() / 1000);
  return jsonSuccess({
    data: {
      token: issueJwt(
        {
          sub: verified.account,
          aud: cfg.sep10.webAuthDomain,
          iss: cfg.sep10.webAuthDomain,
          iat: now,
          exp: now + SEP10_JWT_TTL_S,
          home_domain: cfg.sep10.homeDomain,
        },
        cfg.jwtSecret,
        cfg.sep10Purpose,
      ),
    },
    message: "Authenticated.",
  });
};
