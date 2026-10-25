/* The organization's wallets in the database (prisma model OrganizationWallet). Server-only.
   `orgHasWallet` is what the payment routes ask before creating anything: the receiving address
   must be one of these (src/pages/api/payment-intents, src/pages/api/zk-payments). */
import { prisma } from "@/lib/prisma";
import type { Chain } from "@/lib/chains";
import { normalizeWalletAddress, type OrgWallet, type WalletProvider } from "@/lib/org-wallets";

type Row = { id: string; chain: string; address: string; label: string | null; provider: string | null; createdAt: Date };

const view = (w: Row): OrgWallet => ({
  id: w.id,
  chain: w.chain as Chain,
  address: w.address,
  label: w.label,
  provider: (w.provider as WalletProvider | null) ?? null,
  createdAt: w.createdAt.toISOString(),
});

export class WalletAlreadyConnectedError extends Error {}

export async function listOrgWallets(orgId: string): Promise<OrgWallet[]> {
  const rows = await prisma.organizationWallet.findMany({ where: { orgId }, orderBy: { createdAt: "asc" } });
  return rows.map(view);
}

export async function countOrgWallets(orgId: string): Promise<number> {
  return prisma.organizationWallet.count({ where: { orgId } });
}

export async function addOrgWallet(input: { orgId: string; chain: Chain; address: string; label?: string | null; provider: WalletProvider; addedById: string }): Promise<OrgWallet> {
  const address = normalizeWalletAddress(input.chain, input.address);
  try {
    const row = await prisma.organizationWallet.create({
      data: { orgId: input.orgId, chain: input.chain, address, label: input.label?.trim() || null, provider: input.provider, addedById: input.addedById },
    });
    return view(row);
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") throw new WalletAlreadyConnectedError("This wallet is already connected to the organization");
    throw err;
  }
}

/** The renamed wallet, or null when the organization has no wallet with that id. */
export async function renameOrgWallet(orgId: string, id: string, label: string): Promise<OrgWallet | null> {
  const found = await prisma.organizationWallet.findFirst({ where: { id, orgId } });
  if (!found) return null;
  const row = await prisma.organizationWallet.update({ where: { id }, data: { label: label.trim() || null } });
  return view(row);
}

/** Whether a wallet was removed (false: the organization has none with that id). */
export async function removeOrgWallet(orgId: string, id: string): Promise<boolean> {
  const res = await prisma.organizationWallet.deleteMany({ where: { id, orgId } });
  return res.count > 0;
}

export async function orgHasWallet(orgId: string, chain: Chain, address: string): Promise<boolean> {
  const n = await prisma.organizationWallet.count({ where: { orgId, chain, address: normalizeWalletAddress(chain, address) } });
  return n > 0;
}
