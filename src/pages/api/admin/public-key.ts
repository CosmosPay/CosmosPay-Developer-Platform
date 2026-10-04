/* GET /api/admin/public-key — mint (or re-read) the shared public key. Owner/admin only.

   Creating API keys is this platform's job, and the shared public key is one: it is minted
   here, once, with `role: 'public'` (see src/lib/public-key.ts). Serving it to wallets is
   NOT this platform's job any more — the community server does that, keyless, at
   `GET /v1/public-key`, from its `PUBLIC_API_KEY_DEV` / `PUBLIC_API_KEY_PROD`. This route is
   where an operator gets the values to put there, so that no wallet request depends on this
   platform being up.

   Session-gated to platform owners/admins: the key is not a secret (it ships inside an
   open-source wallet), but minting accounts and credentials is not an anonymous action. */
import { auth } from "@/lib/auth";
import { ApiStatus, jsonError, jsonForbidden, jsonSuccess, jsonUnauthorized } from "@/lib/http";
import { canManageUsers, getRole } from "@/lib/profile";
import { ensurePublicKeys, PUBLIC_CONSUMER } from "@/lib/public-key";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (ctx) => {
  const session = await auth.api.getSession({ headers: ctx.request.headers });
  if (!session) return jsonUnauthorized("Session required");

  const role = await getRole(session.user.id).catch(() => "user" as const);
  if (!canManageUsers(role)) return jsonForbidden("Admin access required");

  const keys = await ensurePublicKeys().catch(() => null);
  if (!keys) {
    return jsonError({ message: "Could not provision the public key", code: 502, status: ApiStatus.INTERNAL_ERROR });
  }

  const res = jsonSuccess({
    data: {
      consumer: PUBLIC_CONSUMER,
      keys,
      // Where each value goes on the community server.
      env: { APISIX_PUBLIC_CONSUMER: PUBLIC_CONSUMER, PUBLIC_API_KEY_DEV: keys.dev, PUBLIC_API_KEY_PROD: keys.prod },
    },
    message: "Public key ready",
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
};
