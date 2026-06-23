/* invitations.ts — email-based organization invitations with magic-link tokens.
   An owner/admin invites by email; we create a single-use token that expires after
   3 days and email the invitee a magic link (/invite/:token). They accept by visiting
   the link while signed in with the invited email. Seats are per-organization and
   governed by the org OWNER's plan; pending invitations count against the seat limit. */
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { planLimits } from "@/lib/plans";
import { getProfile } from "@/lib/profile";
import { sendMail, isMailConfigured } from "@/lib/mailer";
import { renderInvitationEmail } from "@/lib/emails";
import { sanitizePermissions } from "@/lib/org-permissions";
import { BETTER_AUTH_URL } from "astro:env/server";

export const INVITE_TTL_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export type InviteRole = "admin" | "member";

export interface InvitationSummary {
  id: string;
  email: string;
  role: InviteRole;
  permissions: string[];
  expiresAt: Date;
  createdAt: Date;
}

function newToken(): string {
  return randomBytes(32).toString("hex");
}

function serialize(inv: { id: string; email: string; role: string; permissions?: string[]; expiresAt: Date; createdAt: Date }): InvitationSummary {
  return {
    id: inv.id,
    email: inv.email,
    role: inv.role === "admin" ? "admin" : "member",
    permissions: Array.isArray(inv.permissions) ? inv.permissions : [],
    expiresAt: inv.expiresAt,
    createdAt: inv.createdAt,
  };
}

function inviteUrl(token: string): string {
  const base = (BETTER_AUTH_URL || "").replace(/\/+$/, "");
  return `${base}/invite/${token}`;
}

/* Seats are per-organization, governed by the org OWNER's plan. Usage counts current
   members PLUS still-pending (un-expired, un-accepted) invitations. limit null = unlimited. */
export async function seatUsage(orgId: string): Promise<{ limit: number | null; used: number; members: number; pending: number }> {
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { ownerId: true } });
  const ownerProfile = org ? await getProfile(org.ownerId).catch(() => null) : null;
  const limit = planLimits(ownerProfile?.plan).maxSeats;
  const members = await prisma.organizationMember.count({ where: { orgId } });
  const pending = await prisma.organizationInvitation.count({ where: { orgId, acceptedAt: null, expiresAt: { gt: new Date() } } });
  return { limit, used: members + pending, members, pending };
}

/* Pending (un-accepted, un-expired) invitations for an org, newest first. */
export async function listPendingInvitations(orgId: string): Promise<InvitationSummary[]> {
  const rows = await prisma.organizationInvitation.findMany({
    where: { orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serialize);
}

export type CreateInviteResult =
  | { ok: true; invitation: InvitationSummary }
  | { ok: false; reason: "exists" | "pending" | "seat_limit" | "mail_not_configured" | "mail_failed" };

export async function createInvitation(
  orgId: string,
  email: string,
  role: InviteRole,
  permissions: string[],
  invitedById: string,
  inviterName: string,
  orgName: string,
): Promise<CreateInviteResult> {
  const e = email.trim().toLowerCase();
  const perms = role === "admin" ? [] : sanitizePermissions(permissions);

  if (!isMailConfigured()) return { ok: false, reason: "mail_not_configured" };

  // Already a member?
  const existingUser = await prisma.user.findFirst({ where: { email: { equals: e, mode: "insensitive" } }, select: { id: true } });
  if (existingUser) {
    const m = await prisma.organizationMember.findUnique({ where: { orgId_userId: { orgId, userId: existingUser.id } } });
    if (m) return { ok: false, reason: "exists" };
  }
  // Pending invite already out for this email?
  const pendingExisting = await prisma.organizationInvitation.findFirst({ where: { orgId, email: e, acceptedAt: null, expiresAt: { gt: new Date() } } });
  if (pendingExisting) return { ok: false, reason: "pending" };
  // Seat limit (members + pending) — null = unlimited.
  const usage = await seatUsage(orgId);
  if (usage.limit != null && usage.used >= usage.limit) return { ok: false, reason: "seat_limit" };

  const token = newToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * DAY_MS);
  const inv = await prisma.organizationInvitation.create({
    data: { orgId, email: e, role: role === "admin" ? "admin" : "member", permissions: perms, token, invitedById, expiresAt },
  });

  // Send the email; if it fails, drop the row so the seat isn't held by an invite no one received.
  try {
    await sendInvitationEmail({ to: e, token, inviterName, orgName, expiresAt });
  } catch (err) {
    await prisma.organizationInvitation.delete({ where: { id: inv.id } }).catch(() => {});
    return { ok: false, reason: "mail_failed" };
  }
  return { ok: true, invitation: serialize(inv) };
}

export async function revokeInvitation(orgId: string, invitationId: string): Promise<boolean> {
  const res = await prisma.organizationInvitation.deleteMany({ where: { id: invitationId, orgId } });
  return res.count > 0;
}

export async function getInvitationByToken(token: string) {
  return prisma.organizationInvitation.findUnique({ where: { token }, include: { org: { select: { id: true, name: true } } } });
}

/* Pending invitations addressed to a signed-in user's email — surfaced inside their
   dashboard so they can join without digging up the email. */
export async function listInvitationsForUserEmail(email: string): Promise<Array<InvitationSummary & { orgId: string; orgName: string }>> {
  const e = (email || "").trim().toLowerCase();
  if (!e) return [];
  const rows = await prisma.organizationInvitation.findMany({
    where: { email: e, acceptedAt: null, expiresAt: { gt: new Date() } },
    include: { org: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({ ...serialize(r), orgId: r.orgId, orgName: r.org?.name ?? "" }));
}

export type AcceptResult =
  | { ok: true; orgId: string; orgName: string }
  | { ok: false; reason: "invalid" | "expired" | "accepted" | "mismatch" | "seat_limit"; email?: string };

type LoadedInvitation = { id: string; orgId: string; email: string; role: string; permissions: string[]; expiresAt: Date; acceptedAt: Date | null; org: { id: string; name: string } };

async function finalizeAcceptance(inv: LoadedInvitation, user: { id: string; email?: string | null }): Promise<AcceptResult> {
  if (inv.acceptedAt) return { ok: false, reason: "accepted", email: inv.email };
  if (inv.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired", email: inv.email };
  // The invitation is tied to the invited email — the signed-in account must match.
  if ((user.email || "").trim().toLowerCase() !== inv.email.toLowerCase()) return { ok: false, reason: "mismatch", email: inv.email };

  const existing = await prisma.organizationMember.findUnique({ where: { orgId_userId: { orgId: inv.orgId, userId: user.id } } });
  if (existing) {
    await prisma.organizationInvitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
    return { ok: true, orgId: inv.orgId, orgName: inv.org.name };
  }
  // Re-check the seat limit at accept time (the owner may have downgraded since inviting).
  const usage = await seatUsage(inv.orgId);
  if (usage.limit != null && usage.members >= usage.limit) return { ok: false, reason: "seat_limit", email: inv.email };

  const role = inv.role === "admin" ? "admin" : "member";
  const permissions = role === "admin" ? [] : sanitizePermissions(inv.permissions);
  await prisma.organizationMember.create({ data: { orgId: inv.orgId, userId: user.id, role, permissions } });
  await prisma.organizationInvitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
  return { ok: true, orgId: inv.orgId, orgName: inv.org.name };
}

/* Accept via the emailed magic-link token. */
export async function acceptInvitation(token: string, user: { id: string; email?: string | null }): Promise<AcceptResult> {
  const inv = await getInvitationByToken(token);
  if (!inv) return { ok: false, reason: "invalid" };
  return finalizeAcceptance(inv as LoadedInvitation, user);
}

/* Accept from inside the dashboard (the invite belongs to the signed-in user's email). */
export async function acceptInvitationById(invitationId: string, user: { id: string; email?: string | null }): Promise<AcceptResult> {
  const inv = await prisma.organizationInvitation.findUnique({ where: { id: invitationId }, include: { org: { select: { id: true, name: true } } } });
  if (!inv) return { ok: false, reason: "invalid" };
  return finalizeAcceptance(inv as LoadedInvitation, user);
}

/* ---------------- email ---------------- */
async function sendInvitationEmail(opts: { to: string; token: string; inviterName: string; orgName: string; expiresAt: Date }): Promise<void> {
  const { subject, html, text } = renderInvitationEmail({
    org: opts.orgName,
    inviter: opts.inviterName || "A teammate",
    url: inviteUrl(opts.token),
    email: opts.to,
    days: INVITE_TTL_DAYS,
  });
  await sendMail({ to: opts.to, subject, html, text });
}
