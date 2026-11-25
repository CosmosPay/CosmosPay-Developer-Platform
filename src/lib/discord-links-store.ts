/* The Discord link in the database (prisma models DiscordInstallRequest and DiscordLink;
   src/lib/discord-link.ts says what each is). Server-only.
   - createInstallRequest: a new single-use request for one member, organization, environment,
     wallet and asset, valid INSTALL_TTL_MS; at most MAX_OPEN_INSTALLS open per member and
     organization. Rows expired a day ago are cleared on the way.
   - takeInstallRequest: the request a callback names, used up in one statement only when it is
     this member's, unused and alive, so a replay (or two callbacks racing) finds it used.
   - the links: listed per organization with who linked each, replaced per server only within the
     organization that holds it (another organization's link is refused, LinkedElsewhereError). */
import { prisma } from "@/lib/prisma";
import { INSTALL_TTL_MS, MAX_OPEN_INSTALLS, installRequestProblem, newInstallState, type LinkEnvironment } from "@/lib/discord-link";

export class TooManyInstallsError extends Error {}
/** The server is linked to another organization: it must be unlinked there first. */
export class LinkedElsewhereError extends Error {}

const CLEAR_AFTER_MS = 24 * 60 * 60_000;

export interface InstallRequest {
  state: string;
  orgId: string;
  userId: string;
  environment: LinkEnvironment;
  walletId: string;
  asset: string;
  expiresAt: Date;
}

export async function createInstallRequest(
  input: { orgId: string; userId: string; environment: LinkEnvironment; walletId: string; asset: string },
  now: Date = new Date(),
): Promise<InstallRequest> {
  await prisma.discordInstallRequest.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - CLEAR_AFTER_MS) } } }).catch(() => undefined);
  const open = await prisma.discordInstallRequest.count({ where: { orgId: input.orgId, userId: input.userId, usedAt: null, expiresAt: { gt: now } } });
  if (open >= MAX_OPEN_INSTALLS) throw new TooManyInstallsError("Too many Discord link requests are open. Wait a few minutes and try again.");
  const row = await prisma.discordInstallRequest.create({
    data: { state: newInstallState(), ...input, createdAt: now, expiresAt: new Date(now.getTime() + INSTALL_TTL_MS) },
  });
  return { ...row, environment: row.environment === "prod" ? "prod" : "dev" };
}

/**
 * The install request `state` names, used up by this call, or why it cannot be: unknown, another
 * member's, used already (a replay) or expired.
 */
export async function takeInstallRequest(
  state: string,
  userId: string,
  now: Date = new Date(),
): Promise<{ ok: true; request: InstallRequest } | { ok: false; problem: "missing" | "other_user" | "used" | "expired" }> {
  const row = await prisma.discordInstallRequest.findUnique({ where: { state } });
  const problem = installRequestProblem(row, userId, now);
  if (problem || !row) return { ok: false, problem: problem ?? "missing" };
  // One statement: only an unused, live request of this member is marked, so of two callbacks
  // with the same state only one goes on.
  const used = await prisma.discordInstallRequest.updateMany({ where: { state, userId, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
  if (used.count !== 1) return { ok: false, problem: "used" };
  return { ok: true, request: { ...row, environment: row.environment === "prod" ? "prod" : "dev" } };
}

/* ---------------- links ---------------- */

type LinkRow = {
  id: string;
  orgId: string;
  guildId: string;
  guildName: string;
  environment: string;
  apiKeyId: string;
  apiKeySha256: string | null;
  chain: string;
  address: string;
  asset: string;
  discordUserId: string | null;
  discordUsername: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

/** A link as the API answers it: never the key's secret (it is not stored), only its id. */
export interface DiscordLinkView {
  id: string;
  guildId: string;
  guildName: string;
  environment: LinkEnvironment;
  chain: string;
  address: string;
  asset: string;
  apiKeyId: string;
  discordUserId: string | null;
  discordUsername: string | null;
  createdBy: { id: string; name: string | null; email: string | null };
  createdAt: string;
  updatedAt: string;
}

export type StoredDiscordLink = LinkRow & { environment: LinkEnvironment };

const stored = (row: LinkRow): StoredDiscordLink => ({ ...row, environment: row.environment === "prod" ? "prod" : "dev" });

export async function listDiscordLinks(orgId: string): Promise<DiscordLinkView[]> {
  const rows = await prisma.discordLink.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } });
  const ids = [...new Set(rows.map((r) => r.createdById))];
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } }) : [];
  const byId = new Map(users.map((u) => [u.id, u]));
  return rows.map((row) => {
    const user = byId.get(row.createdById);
    return {
      id: row.id,
      guildId: row.guildId,
      guildName: row.guildName,
      environment: row.environment === "prod" ? "prod" : "dev",
      chain: row.chain,
      address: row.address,
      asset: row.asset,
      apiKeyId: row.apiKeyId,
      discordUserId: row.discordUserId,
      discordUsername: row.discordUsername,
      createdBy: { id: row.createdById, name: user?.name || null, email: user?.email || null },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

export async function findDiscordLink(orgId: string, id: string): Promise<StoredDiscordLink | null> {
  const row = await prisma.discordLink.findFirst({ where: { id, orgId } });
  return row ? stored(row) : null;
}

/** The link a server has, in any organization, or null. */
export async function findDiscordLinkByGuild(guildId: string): Promise<StoredDiscordLink | null> {
  const row = await prisma.discordLink.findUnique({ where: { guildId } });
  return row ? stored(row) : null;
}

/** Every link of an organization, as stored (what deleting the organization unlinks). */
export async function storedDiscordLinks(orgId: string): Promise<StoredDiscordLink[]> {
  const rows = await prisma.discordLink.findMany({ where: { orgId } });
  return rows.map(stored);
}

/** The organization's links that pay to one of its wallets (what removing the wallet unlinks). */
export async function discordLinksToWallet(orgId: string, chain: string, address: string): Promise<StoredDiscordLink[]> {
  const rows = await prisma.discordLink.findMany({ where: { orgId, chain, address } });
  return rows.map(stored);
}

/**
 * Stores the server's link, replacing the one it had in this organization in the same
 * transaction; a link of another organization is never replaced (LinkedElsewhereError: the
 * callback refuses that before minting a key, this holds it against a race). Answers the new row
 * and the one it replaced, whose key the caller revokes.
 */
export async function saveDiscordLink(input: {
  orgId: string;
  guildId: string;
  guildName: string;
  environment: LinkEnvironment;
  apiKeyId: string;
  apiKeySha256: string;
  chain: string;
  address: string;
  asset: string;
  discordUserId: string | null;
  discordUsername: string | null;
  createdById: string;
}): Promise<{ link: StoredDiscordLink; replaced: StoredDiscordLink | null }> {
  return prisma.$transaction(async (tx) => {
    const previous = await tx.discordLink.findUnique({ where: { guildId: input.guildId } });
    if (previous && previous.orgId !== input.orgId) throw new LinkedElsewhereError("The Discord server is linked to another organization");
    const { guildId, ...fields } = input;
    const row = previous
      ? await tx.discordLink.update({ where: { guildId }, data: { ...fields, createdAt: new Date() } })
      : await tx.discordLink.create({ data: input });
    return { link: stored(row), replaced: previous ? stored(previous) : null };
  });
}

/** Whether the row was deleted (false: the organization has no link with that id any more). */
export async function deleteDiscordLink(orgId: string, id: string): Promise<boolean> {
  const res = await prisma.discordLink.deleteMany({ where: { id, orgId } });
  return res.count > 0;
}
