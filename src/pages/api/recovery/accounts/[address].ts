/* /api/recovery/accounts/{address} — SEP-30's account resource.

   POST registers the account with the identities that may recover it, PUT replaces those
   identities, GET describes it, DELETE forgets it. See src/lib/recovery.ts for what this
   server will and will not sign afterwards.

   WHO MAY DO WHAT is the whole of the design here: registering and changing identities need
   a SEP-10 token — you must still hold the key — because an identity that could add itself
   would be a way in rather than a way back. Reading needs either credential. */
import { ApiStatus, jsonCreated, jsonError, jsonSuccess, parseJson } from "@/lib/http";
import { clientIp } from "@/lib/geo";
import { allow } from "@/lib/rate-limit";
import { actorFrom } from "@/lib/recovery-auth";
import { recoveryConfig } from "@/lib/recovery-config";
import { deleteAccount, getAccount, mayAct, putAccount } from "@/lib/recovery";
import { recoveryAddressParamSchema, recoveryIdentitiesBodySchema } from "@/schemas/recovery";
import type { APIRoute, APIContext } from "astro";

const WINDOW_MS = 10 * 60 * 1000;

type Setup =
  | { ok: false; response: Response }
  | { ok: true; cfg: NonNullable<ReturnType<typeof recoveryConfig>>; actor: NonNullable<ReturnType<typeof actorFrom>>; address: string };

function setup(ctx: APIContext, bucket: string, limit: number): Setup {
  const cfg = recoveryConfig();
  if (!cfg) {
    return {
      ok: false,
      response: jsonError({ message: "This deployment is not a recovery server.", code: 503, status: ApiStatus.INTERNAL_ERROR }),
    };
  }
  const ip = clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown";
  if (!allow(bucket, ip, { limit, windowMs: WINDOW_MS })) {
    return { ok: false, response: jsonError({ message: "Too many requests — wait a moment.", code: 429, status: ApiStatus.BAD_REQUEST }) };
  }
  const params = recoveryAddressParamSchema.safeParse(ctx.params);
  if (!params.success) {
    return { ok: false, response: jsonError({ message: "Invalid account", code: 400, status: ApiStatus.BAD_REQUEST }) };
  }
  const actor = actorFrom(ctx.request, cfg);
  if (!actor) return { ok: false, response: jsonError({ message: "Unauthorized", code: 401, status: ApiStatus.UNAUTHORIZED }) };
  return { ok: true, cfg, actor, address: params.data.address };
}

/** Registering and changing identities are for the key holder alone. */
const notTheKeyHolder = () =>
  jsonError({ message: "This needs the account's own key.", code: 403, status: ApiStatus.FORBIDDEN });

export const POST: APIRoute = async (ctx) => {
  const s = setup(ctx, "recovery:register", 30);
  if (!s.ok) return s.response;
  if (s.actor.kind !== "address" || s.actor.address !== s.address) return notTheKeyHolder();

  const body = await parseJson(ctx.request, recoveryIdentitiesBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }
  const account = await putAccount(s.cfg, s.address, body.data.identities);
  return jsonCreated({ data: account, message: "Registered for recovery." });
};

export const PUT: APIRoute = async (ctx) => {
  const s = setup(ctx, "recovery:update", 30);
  if (!s.ok) return s.response;
  if (s.actor.kind !== "address" || s.actor.address !== s.address) return notTheKeyHolder();

  const body = await parseJson(ctx.request, recoveryIdentitiesBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: ApiStatus.BAD_REQUEST });
  }
  const account = await putAccount(s.cfg, s.address, body.data.identities);
  return jsonSuccess({ data: account, message: "Identities updated." });
};

export const GET: APIRoute = async (ctx) => {
  const s = setup(ctx, "recovery:read", 120);
  if (!s.ok) return s.response;
  if (!(await mayAct(s.cfg, s.address, s.actor))) {
    return jsonError({ message: "Not found", code: 404, status: ApiStatus.NOT_FOUND });
  }
  const account = await getAccount(s.cfg, s.address, s.actor);
  if (!account) return jsonError({ message: "Not found", code: 404, status: ApiStatus.NOT_FOUND });
  return jsonSuccess({ data: account, message: "OK" });
};

export const DELETE: APIRoute = async (ctx) => {
  const s = setup(ctx, "recovery:delete", 30);
  if (!s.ok) return s.response;
  if (s.actor.kind !== "address" || s.actor.address !== s.address) return notTheKeyHolder();
  const gone = await deleteAccount(s.cfg, s.address);
  if (!gone) return jsonError({ message: "Not found", code: 404, status: ApiStatus.NOT_FOUND });
  // The signer stays on chain until the account removes it: this server simply stops
  // answering for it, which is what "forget me" can mean from here.
  return jsonSuccess({ data: { address: s.address, deleted: true }, message: "Forgotten." });
};
