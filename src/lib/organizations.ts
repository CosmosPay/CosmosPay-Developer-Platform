/* organizations.ts — workspaces owned by users, with members + org-level roles.
   Plan limits (maxOrgs) are enforced on creation. */
import { prisma } from "@/lib/prisma";
import { planLimits, atLimit } from "@/lib/plans";
import { getProfile } from "@/lib/profile";

export type OrgRole = "owner" | "admin" | "member";

export interface OrgSummary {
  id: string;
  name: string;
  role: OrgRole;
  ownerId: string;
  createdAt: Date;
  permissions: string[]; // the signed-in member's granted per-action permissions
  plan: string; // the org's plan = the OWNER's subscription plan
}

function toRole(r: unknown): OrgRole {
  return r === "owner" || r === "admin" ? r : "member";
}

/* Orgs the user belongs to (oldest first), with their membership role + per-action
   permissions, and the org's plan (the owner's subscription). */
export async function listForUser(userId: string): Promise<OrgSummary[]> {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    include: { org: { include: { owner: { select: { profile: { select: { plan: true } } } } } } },
    orderBy: { createdAt: "asc" },
  });
  return memberships
    .filter((m) => m.org)
    .map((m) => ({
      id: m.org.id,
      name: m.org.name,
      role: toRole(m.role),
      ownerId: m.org.ownerId,
      createdAt: m.org.createdAt,
      permissions: Array.isArray(m.permissions) ? m.permissions : [],
      plan: m.org.owner?.profile?.plan ?? "community",
    }));
}

/* Update a member's role and/or per-action permissions. The owner row is never altered.
   Non-member roles (admin) implicitly hold every permission, so we clear the explicit list. */
export async function updateMember(orgId: string, userId: string, data: { role?: OrgRole; permissions?: string[] }) {
  const existing = await prisma.organizationMember.findUnique({ where: { orgId_userId: { orgId, userId } } });
  if (!existing || existing.role === "owner") return null;
  const patch: { role?: string; permissions?: string[] } = {};
  if (data.role !== undefined) patch.role = data.role === "owner" ? "admin" : data.role;
  if (data.permissions !== undefined) patch.permissions = data.permissions;
  const nextRole = patch.role ?? existing.role;
  if (nextRole !== "member") patch.permissions = [];
  return prisma.organizationMember.update({ where: { orgId_userId: { orgId, userId } }, data: patch });
}

/* Ensure the user always has at least one org (auto-provisioned on first load). */
export async function ensureDefaultOrg(userId: string, displayName?: string | null): Promise<OrgSummary[]> {
  const existing = await listForUser(userId);
  if (existing.length > 0) return existing;
  await createOrg(userId, defaultOrgName(displayName), true);
  return listForUser(userId);
}

function defaultOrgName(displayName?: string | null): string {
  const n = (displayName || "").trim();
  if (!n) return "My organization";
  return n.endsWith("s") ? `${n}’ organization` : `${n}’s organization`;
}

/* Count orgs the user OWNS (the metric the plan limit applies to). */
export async function countOwnedOrgs(userId: string): Promise<number> {
  return prisma.organization.count({ where: { ownerId: userId } });
}

export interface CreateOrgResult {
  ok: boolean;
  reason?: "limit";
  org?: OrgSummary;
}

export async function createOrg(userId: string, name: string, bypassLimit = false, metadata?: unknown): Promise<CreateOrgResult> {
  if (!bypassLimit) {
    const profile = await getProfile(userId).catch(() => null);
    const limits = planLimits(profile?.plan);
    const owned = await countOwnedOrgs(userId);
    if (atLimit(limits.maxOrgs, owned)) return { ok: false, reason: "limit" };
  }
  const org = await prisma.organization.create({ data: { name: name.trim(), ownerId: userId, metadata: (metadata ?? undefined) as never } });
  await prisma.organizationMember.create({ data: { orgId: org.id, userId, role: "owner" } });
  const ownerProfile = await getProfile(userId).catch(() => null);
  return { ok: true, org: { id: org.id, name: org.name, role: "owner", ownerId: org.ownerId, createdAt: org.createdAt, permissions: [], plan: ownerProfile?.plan ?? "community" } };
}

export async function getMembership(orgId: string, userId: string) {
  return prisma.organizationMember.findUnique({ where: { orgId_userId: { orgId, userId } } });
}

/* An organization's resource limits (API keys, seats, …) are governed by the org OWNER's
   plan — NOT the plan of whoever happens to be acting. This keeps keys/seats per
   organization rather than per account. */
export async function orgOwnerPlanLimits(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { ownerId: true } });
  const ownerProfile = org ? await getProfile(org.ownerId).catch(() => null) : null;
  return planLimits(ownerProfile?.plan);
}

export function canManageOrg(role: OrgRole): boolean {
  return role === "owner" || role === "admin";
}

export async function renameOrg(orgId: string, name: string) {
  return prisma.organization.update({ where: { id: orgId }, data: { name: name.trim() } });
}

export async function deleteOrg(orgId: string) {
  return prisma.organization.delete({ where: { id: orgId } });
}

export async function listMembers(orgId: string) {
  const members = await prisma.organizationMember.findMany({
    where: { orgId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });
  return members.map((m) => ({ userId: m.userId, role: toRole(m.role), permissions: Array.isArray(m.permissions) ? m.permissions : [], name: m.user?.name ?? null, email: m.user?.email ?? null, image: m.user?.image ?? null }));
}

export type AddMemberResult =
  | { ok: true; member: { userId: string; role: OrgRole; name: string | null; email: string | null } }
  | { ok: false; reason: "not_found" | "exists" | "seat_limit" };

/* Members allowed in an org are governed by the org OWNER's plan (the owner counts
   as one seat). Returns true when adding one more would exceed that limit. */
export async function seatLimitReached(orgId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { ownerId: true } });
  if (!org) return false;
  const ownerProfile = await getProfile(org.ownerId).catch(() => null);
  const limit = planLimits(ownerProfile?.plan).maxSeats;
  if (limit == null) return false;
  const count = await prisma.organizationMember.count({ where: { orgId } });
  return count >= limit;
}

export async function addMemberByEmail(orgId: string, email: string, role: OrgRole = "member"): Promise<AddMemberResult> {
  if (await seatLimitReached(orgId)) return { ok: false, reason: "seat_limit" };
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, name: true, email: true } });
  if (!user) {
    // emails are stored as-entered in some flows; try a case-insensitive fallback
    const alt = await prisma.user.findFirst({ where: { email: { equals: email.trim(), mode: "insensitive" } }, select: { id: true, name: true, email: true } });
    if (!alt) return { ok: false, reason: "not_found" };
    return addExisting(orgId, alt, role);
  }
  return addExisting(orgId, user, role);
}

async function addExisting(orgId: string, user: { id: string; name: string | null; email: string | null }, role: OrgRole): Promise<AddMemberResult> {
  const existing = await prisma.organizationMember.findUnique({ where: { orgId_userId: { orgId, userId: user.id } } });
  if (existing) return { ok: false, reason: "exists" };
  await prisma.organizationMember.create({ data: { orgId, userId: user.id, role: role === "owner" ? "admin" : role } });
  return { ok: true, member: { userId: user.id, role: role === "owner" ? "admin" : role, name: user.name, email: user.email } };
}

export async function removeMember(orgId: string, userId: string) {
  return prisma.organizationMember.deleteMany({ where: { orgId, userId } });
}
