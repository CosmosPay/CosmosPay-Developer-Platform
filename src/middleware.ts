import { auth } from "@/lib/auth";
import { recordLogin, touchLastSeen } from "@/lib/profile";
import { ensureCosmosRouteSynced } from "@/lib/apisix-route";
import { defineMiddleware } from "astro:middleware";

// On server start: (re)create the Cosmos API route in APISIX with the current
// COSMOS_API_URL. Runs once per process (idempotent), non-blocking.
ensureCosmosRouteSynced();

export const onRequest = defineMiddleware(async (context, next) => {
  // Belt-and-suspenders: ensure the route was synced (no-op after the first call).
  ensureCosmosRouteSynced();

  const isAuthed = await auth.api
    .getSession({
      headers: context.request.headers,
    })

  if (isAuthed) {
    context.locals.user = isAuthed.user;
    context.locals.session = isAuthed.session;
    // Best-effort: ensure the profile exists and capture sign-in location once per
    // session (emits a sign-in notification). Never blocks or fails the request.
    recordLogin(isAuthed, context).catch(() => {});
    // Track "last online" (throttled write — see touchLastSeen).
    touchLastSeen(isAuthed.user.id).catch(() => {});
  } else {
    context.locals.user = null;
    context.locals.session = null;
  }

  return next();
});