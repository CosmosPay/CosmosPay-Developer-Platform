/* One session read per request. The middleware reads the session for every request (it fills
   Astro.locals.user), and an API route that asks again for the same request gets that same answer
   instead of a second lookup. Keyed by the request's Headers object, which the middleware and the
   route share when nothing rewrites the request (a rewritten one simply reads again); a WeakMap,
   so nothing outlives its request. */
import { auth } from "@/lib/auth";

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

const seen = new WeakMap<Headers, Promise<Session>>();

export function requestSession(headers: Headers): Promise<Session> {
  let session = seen.get(headers);
  if (!session) {
    session = auth.api.getSession({ headers });
    seen.set(headers, session);
  }
  return session;
}
