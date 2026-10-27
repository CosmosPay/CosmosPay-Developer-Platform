import { z } from "zod";
import { requestSession } from "@/lib/request-session";
import { jsonBadRequest, jsonConflict, jsonCreated, jsonError, jsonForbidden, jsonNotFound, jsonSuccess, jsonUnauthorized, parseJson } from "@/lib/http";
import { getMembership } from "@/lib/organizations";
import { hasOrgPermission } from "@/lib/org-permissions";
import { isFreshProof, MAX_ORG_WALLETS, walletProofMessage } from "@/lib/org-wallets";
import { verifyWalletProof } from "@/lib/org-wallets-verify";
import { checkWalletProofXdr } from "@/lib/wallets/wallet-proof-xdr";
import { addOrgWallet, countOrgWallets, listOrgWallets, WalletAlreadyConnectedError } from "@/lib/org-wallets-store";
import { connectWalletBodySchema } from "@/schemas/org-wallets";
import type { APIRoute } from "astro";

const paramsSchema = z.object({ id: z.string().min(1) });

/* GET /api/organizations/:id/wallets: the organization's receiving wallets (any member: every
   payment form offers them). */
export const GET: APIRoute = async (ctx) => {
  const session = await requestSession(ctx.request.headers);
  if (!session) return jsonUnauthorized("Session required");

  const params = paramsSchema.safeParse(ctx.params);
  if (!params.success) return jsonNotFound("Organization not found");

  const membership = await getMembership(params.data.id, session.user.id).catch(() => null);
  if (!membership) return jsonNotFound("Organization not found");

  const wallets = await listOrgWallets(params.data.id).catch(() => null);
  if (!wallets) return jsonError({ message: "Failed to load wallets", code: 500, status: "internal_error" });
  return jsonSuccess({ data: wallets, message: "Wallets loaded" });
};

/* POST /api/organizations/:id/wallets: connect a wallet (`wallets:create`). The wallet signed
   walletProofMessage for this organization, network and address within the last minutes, or, on
   Stellar, the proof transaction carrying it (a signed XDR from any wallet); the signature is
   checked against the address before anything is stored. */
export const POST: APIRoute = async (ctx) => {
  const session = await requestSession(ctx.request.headers);
  if (!session) return jsonUnauthorized("Session required");

  const params = paramsSchema.safeParse(ctx.params);
  if (!params.success) return jsonNotFound("Organization not found");
  const orgId = params.data.id;

  const membership = await getMembership(orgId, session.user.id).catch(() => null);
  if (!membership) return jsonNotFound("Organization not found");
  if (!hasOrgPermission(membership.role, membership.permissions, "wallets:create")) {
    return jsonForbidden("You don't have permission to connect wallets to this organization.");
  }

  const body = await parseJson(ctx.request, connectWalletBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: "bad_request" });
  }
  const { chain, address, provider, label, issuedAt, signature, signedXdr } = body.data;

  if (!isFreshProof(issuedAt)) return jsonBadRequest("The wallet's signature has expired. Connect it again.");
  const proven = signedXdr
    ? checkWalletProofXdr({ orgId, address, issuedAt }, signedXdr).ok
    : verifyWalletProof(chain, address, walletProofMessage({ orgId, chain, address, issuedAt }), signature!);
  if (!proven) {
    return jsonBadRequest("The signature was not made by this wallet.");
  }
  if ((await countOrgWallets(orgId)) >= MAX_ORG_WALLETS) {
    return jsonBadRequest(`An organization can connect at most ${MAX_ORG_WALLETS} wallets.`);
  }

  try {
    const wallet = await addOrgWallet({ orgId, chain, address, label, provider: provider ?? null, addedById: session.user.id });
    return jsonCreated({ data: wallet, message: "Wallet connected" });
  } catch (err) {
    if (err instanceof WalletAlreadyConnectedError) return jsonConflict(err.message);
    return jsonError({ message: "Failed to connect the wallet", code: 500, status: "internal_error" });
  }
};
