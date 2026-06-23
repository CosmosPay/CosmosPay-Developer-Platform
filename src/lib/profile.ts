/* profile.ts — Cosmos Pay per-account data (role, region/country/language defaults)
   and sign-in location capture. Profiles are created lazily on first authenticated
   request so headers (geo) are available. */
import { prisma } from "@/lib/prisma";
import { clientLanguage, geoLocate } from "@/lib/geo";
import { safeNotify } from "@/lib/notifications";
import type { APIContext } from "astro";

export type AccountRole = "user" | "admin" | "owner" | "support";

export async function getProfile(userId: string) {
  return prisma.profile.findUnique({ where: { userId } });
}

/* Record that the user was just active (any authenticated request). Throttled: only
   writes when the last update is older than ~2 minutes, so it's cheap on every request. */
const LAST_SEEN_THROTTLE_MS = 2 * 60 * 1000;
export async function touchLastSeen(userId: string) {
  const cutoff = new Date(Date.now() - LAST_SEEN_THROTTLE_MS);
  return prisma.profile.updateMany({
    where: { userId, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: cutoff } }] },
    data: { lastSeenAt: new Date() },
  });
}

/* The very first account (oldest user) is the platform owner, so support/admin features
   are reachable on a fresh install without manually seeding a staff role in the DB. */
async function isFirstUser(userId: string): Promise<boolean> {
  const first = await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  return !!first && first.id === userId;
}

export async function getRole(userId: string): Promise<AccountRole> {
  const p = await prisma.profile.findUnique({ where: { userId }, select: { role: true } });
  const r = p?.role;
  if (r === "owner" || r === "admin" || r === "support") return r;
  if (await isFirstUser(userId).catch(() => false)) return "owner";
  return "user";
}

export function canCreateNotifications(role: AccountRole): boolean {
  return role === "owner" || role === "admin";
}

/* Staff = anyone who can read & answer support conversations. */
export function isStaff(role: AccountRole): boolean {
  return role === "owner" || role === "admin" || role === "support";
}

/* Who can assign roles / plans to other accounts. */
export function canManageUsers(role: AccountRole): boolean {
  return role === "owner" || role === "admin";
}

/* Update the signed-in account's own (mock) plan. */
export async function setOwnPlan(userId: string, plan: string) {
  return prisma.profile.upsert({ where: { userId }, update: { plan }, create: { userId, plan } });
}

/* Update the signed-in account's own editable profile fields (display name, bio, avatar).
   `null` clears a field (falling back to the OAuth/SSO value for name + photo). Only the
   keys provided are touched. */
export async function updateOwnProfile(
  userId: string,
  data: { displayName?: string | null; bio?: string | null; avatarUrl?: string | null },
) {
  const patch: { displayName?: string | null; bio?: string | null; avatarUrl?: string | null } = {};
  if (data.displayName !== undefined) patch.displayName = data.displayName;
  if (data.bio !== undefined) patch.bio = data.bio;
  if (data.avatarUrl !== undefined) patch.avatarUrl = data.avatarUrl;
  return prisma.profile.upsert({ where: { userId }, update: patch, create: { userId, ...patch } });
}

/* Admin: list all accounts with their role + plan. */
export async function listUsersWithProfile(limit = 200) {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { profile: { select: { role: true, plan: true, lastSeenAt: true } } },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    createdAt: u.createdAt,
    role: u.profile?.role ?? "user",
    plan: u.profile?.plan ?? "community",
    lastSeenAt: u.profile?.lastSeenAt ?? null,
  }));
}

/* Admin: set a user's role and/or plan. */
export async function setUserRolePlan(userId: string, data: { role?: string; plan?: string }) {
  const patch: { role?: string; plan?: string } = {};
  if (data.role !== undefined) patch.role = data.role;
  if (data.plan !== undefined) patch.plan = data.plan;
  return prisma.profile.upsert({ where: { userId }, update: patch, create: { userId, ...patch } });
}

/* Create the profile on first sight, seeding region/country/language from the request
   (CDN headers + MaxMind fallback). */
export async function ensureProfile(userId: string, ctx: APIContext) {
  const existing = await prisma.profile.findUnique({ where: { userId } });
  if (existing) return existing;
  const loc = await geoLocate(ctx.request.headers, ctx.clientAddress).catch(() => null);
  const language = clientLanguage(ctx.request.headers) || "en";
  return prisma.profile.create({
    data: { userId, country: loc?.country ?? null, region: loc?.region ?? null, language, locale: language.toUpperCase() },
  });
}

/* Refresh last-sign-in location once per new session and emit a sign-in notification. */
export async function recordLogin(auth: { user: { id: string }; session: { id: string } }, ctx: APIContext) {
  const userId = auth.user.id;
  const profile = await ensureProfile(userId, ctx);
  if (profile.lastSessionId === auth.session.id) return; // already recorded this session

  const loc = await geoLocate(ctx.request.headers, ctx.clientAddress).catch(() => null);
  const ip = loc?.ip ?? null;
  const country = loc?.country ?? profile.country ?? null;
  const region = loc?.region ?? profile.region ?? null;
  const origin = loc?.origin ?? (ip || "unknown");
  const now = new Date();

  await prisma.profile.update({
    where: { userId },
    data: { lastSessionId: auth.session.id, lastLoginIp: ip, lastLoginCountry: country, lastLoginRegion: region, lastLoginAt: now },
  });

  safeNotify({
    userId,
    type: "auth.login",
    title: "New sign-in",
    message: `Signed in from ${origin}`,
    origin,
    country,
    region,
    ipAddress: ip,
    metadata: { at: now.toISOString(), city: loc?.city ?? null, publicIp: loc?.publicIp ?? null, userAgent: loc?.userAgent ?? null, local: loc?.isLocal ?? false },
  });
}
