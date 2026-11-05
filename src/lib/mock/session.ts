/* The sample account every visitor is signed in as in mock mode, in the shapes Better Auth hands
   the middleware (`Astro.locals.user` / `session`) and `/api/auth/get-session` answers. Signing out
   sets a cookie that makes the next requests anonymous, and /login clears it, so the signed-out
   pages and the sign-in round trip can be looked at too. */
import type { Session, User } from "better-auth";
import type { MockUser } from "@/lib/mock/http";

export const MOCK_USER_ID = "mock-user-0001";

/** Set by a mock sign-out; while it is there the visitor is anonymous. */
export const MOCK_SIGNED_OUT_COOKIE = "cosmos-mock-signed-out";

const CREATED = new Date("2025-03-14T12:00:00.000Z");

export const MOCK_USER: MockUser = {
  id: MOCK_USER_ID,
  name: "Emanuel Demo",
  email: "demo@cosmospay.lat",
  image: null,
};

export function mockAuthUser(): User {
  return {
    id: MOCK_USER.id,
    name: MOCK_USER.name,
    email: MOCK_USER.email,
    emailVerified: true,
    image: MOCK_USER.image,
    createdAt: CREATED,
    updatedAt: CREATED,
  };
}

export function mockAuthSession(): Session {
  const now = new Date();
  return {
    id: "mock-session-0001",
    userId: MOCK_USER.id,
    token: "mock-session-token",
    expiresAt: new Date(now.getTime() + 7 * 24 * 3_600_000),
    createdAt: now,
    updatedAt: now,
    ipAddress: "127.0.0.1",
    userAgent: "mock",
  };
}

/** Whether this request's cookies say the visitor signed out of the mock. */
export function mockSignedOut(cookieHeader: string | null): boolean {
  return !!cookieHeader && cookieHeader.split(";").some((c) => c.trim().startsWith(`${MOCK_SIGNED_OUT_COOKIE}=1`));
}
