/* The challenges a wallet signs to be connected to an organization (prisma model
   WalletProofChallenge; src/lib/org-wallets.ts says what a challenge is). Server-only.
   - issue: 32 random bytes as the nonce, for one member, organization, network and address (none
     on TON), valid for CHALLENGE_TTL_MS; at most MAX_OPEN_CHALLENGES open per member and
     organization. Rows expired a day ago are cleared on the way.
   - find: the challenge a connect request names, whoever it was issued to (the route compares).
   - consume: marks it used, only if it is still unused and alive, in one statement, so two
     requests racing with one proof cannot both connect. */
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { NetworkId } from "@/lib/chains";
import { CHALLENGE_TTL_MS, MAX_OPEN_CHALLENGES, normalizeWalletAddress, type WalletChallenge } from "@/lib/org-wallets";

export class TooManyChallengesError extends Error {}

const CLEAR_AFTER_MS = 24 * 60 * 60_000;

type Row = { nonce: string; orgId: string; userId: string; chain: string; address: string | null; issuedAt: Date; expiresAt: Date; usedAt: Date | null };

export interface StoredChallenge extends WalletChallenge {
  userId: string;
  usedAt: string | null;
}

const view = (r: Row): StoredChallenge => ({
  orgId: r.orgId,
  userId: r.userId,
  chain: r.chain as NetworkId,
  address: r.address,
  nonce: r.nonce,
  issuedAt: r.issuedAt.toISOString(),
  expiresAt: r.expiresAt.toISOString(),
  usedAt: r.usedAt ? r.usedAt.toISOString() : null,
});

export async function issueChallenge(input: { orgId: string; userId: string; chain: NetworkId; address: string | null }, now: Date = new Date()): Promise<StoredChallenge> {
  await prisma.walletProofChallenge.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - CLEAR_AFTER_MS) } } }).catch(() => undefined);
  const open = await prisma.walletProofChallenge.count({ where: { orgId: input.orgId, userId: input.userId, usedAt: null, expiresAt: { gt: now } } });
  if (open >= MAX_OPEN_CHALLENGES) throw new TooManyChallengesError("Too many wallet challenges are open. Wait a few minutes and try again.");
  const row = await prisma.walletProofChallenge.create({
    data: {
      nonce: randomBytes(32).toString("hex"),
      orgId: input.orgId,
      userId: input.userId,
      chain: input.chain,
      address: input.address ? normalizeWalletAddress(input.chain, input.address) : null,
      issuedAt: now,
      expiresAt: new Date(now.getTime() + CHALLENGE_TTL_MS),
    },
  });
  return view(row);
}

export async function findChallenge(nonce: string): Promise<StoredChallenge | null> {
  const row = await prisma.walletProofChallenge.findUnique({ where: { nonce } });
  return row ? view(row) : null;
}

/** Whether this request used the challenge up (false: already used, or expired meanwhile). */
export async function consumeChallenge(nonce: string, now: Date = new Date()): Promise<boolean> {
  const res = await prisma.walletProofChallenge.updateMany({ where: { nonce, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
  return res.count === 1;
}
