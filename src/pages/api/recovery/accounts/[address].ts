/* /api/recovery/accounts/{address} — SEP-30's account resource.

   POST registers the account with the identities that may recover it, PUT replaces those
   identities, GET describes it, DELETE forgets it. See src/lib/recovery.ts for what this
   server will and will not sign afterwards.

   WHO MAY DO WHAT is the whole of the design here: registering and changing identities need
   a SEP-10 token — you must still hold the key — because an identity that could add itself
   would be a way in rather than a way back. Reading needs either credential.

   The bodies here are SEP-30's own, not this API's envelope — see src/lib/sep-http.ts. */
import { parseJson } from "@/lib/http";
import { clientIp } from "@/lib/geo";
import { allow } from "@/lib/rate-limit";
import { actorFrom } from "@/lib/recovery-auth";
import { recoveryConfig } from "@/lib/recovery-config";
import { accountExists, deleteAccount, getAccount, mayAct, putAccount } from "@/lib/recovery";
import {
  sepError,
  sepJson,
  sepNotAServer,
  sepNotFound,
  sepNotTheKeyHolder,
  sepRateLimited,
  sepUnauthorized,
} from "@/lib/sep-http";
import { recoveryAddressParamSchema, recoveryIdentitiesBodySchema } from "@/schemas/recovery";
import type { APIRoute, APIContext } from "astro";

const WINDOW_MS = 10 * 60 * 1000;

type Setup =
  | { ok: false; response: Response }
  | { ok: true; cfg: NonNullable<ReturnType<typeof recoveryConfig>>; actor: NonNullable<ReturnType<typeof actorFrom>>; address: string };

function setup(ctx: APIContext, bucket: string, limit: number): Setup {
  const cfg = recoveryConfig();
  if (!cfg) return { ok: false, response: sepNotAServer() };
  const ip = clientIp(ctx.request.headers, ctx.clientAddress) ?? "unknown";
  if (!allow(bucket, ip, { limit, windowMs: WINDOW_MS })) return { ok: false, response: sepRateLimited() };
  const params = recoveryAddressParamSchema.safeParse(ctx.params);
  if (!params.success) return { ok: false, response: sepError("Invalid account.", 400) };
  const actor = actorFrom(ctx.request, cfg);
  if (!actor) return { ok: false, response: sepUnauthorized() };
  return { ok: true, cfg, actor, address: params.data.address };
}

/** The identities from the body, or the refusal to answer with. */
async function identitiesOf(request: Request) {
  const body = await parseJson(request, recoveryIdentitiesBodySchema).catch(() => null);
  if (!body || !body.ok) return { ok: false as const, response: sepError("Invalid request.", 400) };
  return { ok: true as const, identities: body.data.identities };
}

export const POST: APIRoute = async (ctx) => {
  const s = setup(ctx, "recovery:register", 30);
  if (!s.ok) return s.response;
  if (s.actor.kind !== "address" || s.actor.address !== s.address) return sepNotTheKeyHolder();

  const body = await identitiesOf(ctx.request);
  if (!body.ok) return body.response;

  // 409, not a silent overwrite. SEP-30 gives registering and updating separate verbs, and
  // a POST that quietly replaced the identity list would let a client that believes it is
  // creating an account change who may recover one that already exists — and never find
  // out. Changing them is PUT, which says so.
  if (await accountExists(s.cfg, s.address)) {
    return sepError("This account is already registered for recovery.", 409);
  }
  return sepJson(await putAccount(s.cfg, s.address, body.identities), 201);
};

export const PUT: APIRoute = async (ctx) => {
  const s = setup(ctx, "recovery:update", 30);
  if (!s.ok) return s.response;
  if (s.actor.kind !== "address" || s.actor.address !== s.address) return sepNotTheKeyHolder();

  const body = await identitiesOf(ctx.request);
  if (!body.ok) return body.response;
  // Upserts, unlike POST: SEP-30's PUT is "these are the identities now", and a caller
  // that says so about an account this server has not seen is not making a mistake.
  return sepJson(await putAccount(s.cfg, s.address, body.identities));
};

export const GET: APIRoute = async (ctx) => {
  const s = setup(ctx, "recovery:read", 120);
  if (!s.ok) return s.response;
  if (!(await mayAct(s.cfg, s.address, s.actor))) return sepNotFound();
  const account = await getAccount(s.cfg, s.address, s.actor);
  return account ? sepJson(account) : sepNotFound();
};

export const DELETE: APIRoute = async (ctx) => {
  const s = setup(ctx, "recovery:delete", 30);
  if (!s.ok) return s.response;
  if (s.actor.kind !== "address" || s.actor.address !== s.address) return sepNotTheKeyHolder();

  // Read it before it goes: SEP-30 answers a delete with the account it deleted, which is
  // the only moment a client can still be told which signer it needs to take off the
  // ledger. This server stops answering for the account; the signer stays on chain until
  // the account itself removes it, and that is all "forget me" can mean from here.
  const account = await getAccount(s.cfg, s.address, s.actor);
  const gone = await deleteAccount(s.cfg, s.address);
  if (!gone || !account) return sepNotFound();
  return sepJson(account);
};
