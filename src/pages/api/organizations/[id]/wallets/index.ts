import { z } from "zod";
import { requestSession } from "@/lib/request-session";
import { ApiStatus, jsonBadRequest, jsonConflict, jsonCreated, jsonError, jsonForbidden, jsonNotFound, jsonSuccess, jsonUnauthorized, parseJson } from "@/lib/http";
import { getMembership } from "@/lib/organizations";
import { hasOrgPermission } from "@/lib/org-permissions";
import { addedByAddress, isLiveChallenge, MAX_ORG_WALLETS, normalizeWalletAddress } from "@/lib/org-wallets";
import { verifyOwnershipProof } from "@/lib/org-wallets-verify";
import { consumeChallenge, findChallenge } from "@/lib/org-wallet-challenges";
import { proofContext } from "@/lib/wallet-proof-env";
import { ProofNetworkError } from "@/lib/wallet-proofs/rpc";
import { tonFriendlyAddress } from "@/lib/wallet-proofs/ton";
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

/* POST /api/organizations/:id/wallets: connect a wallet (`wallets:create`). The wallet signed the
   challenge this member was issued for this organization, network and address (POST
   .../wallets/challenge; on Stellar the proof transaction carrying it, a signed XDR from any
   wallet, also counts). The signature is checked against the address, the challenge is used up
   (once, while alive) and only then is the wallet stored. An address that cannot sign a message
   (`addedByAddress`) is added by its address, typed twice, and stored as added without a
   signature (`provider: "address"`). */
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
  const { chain, provider, label, nonce, signature, signedXdr, proof } = body.data;
  let address = body.data.address;

  if ((await countOrgWallets(orgId)) >= MAX_ORG_WALLETS) {
    return jsonBadRequest(`An organization can connect at most ${MAX_ORG_WALLETS} wallets.`);
  }

  // The schema already held an address that cannot sign to the address typed twice.
  if (!addedByAddress(chain, address)) {
    const challenge = nonce ? await findChallenge(nonce).catch(() => null) : null;
    const expired = "The wallet's signature has expired. Connect it again.";
    if (!challenge || challenge.orgId !== orgId || challenge.userId !== session.user.id || challenge.chain !== chain) return jsonBadRequest(expired);
    if (challenge.usedAt || !isLiveChallenge(challenge.expiresAt)) return jsonBadRequest(expired);
    if (challenge.address !== null && challenge.address !== normalizeWalletAddress(chain, address)) {
      return jsonBadRequest("The signature was not made by this wallet.");
    }
    let proven: boolean;
    try {
      // The message names the address as the challenge stored it (hex lower-cased); TON's names none.
      proven = await verifyOwnershipProof(challenge, challenge.address ?? address, { provider, signature, signedXdr, proof }, proofContext());
    } catch (err) {
      if (err instanceof ProofNetworkError) return jsonError({ message: "The network could not be reached to check this wallet. Try again in a moment.", code: 503, status: ApiStatus.INTERNAL_ERROR });
      throw err;
    }
    if (!proven) return jsonBadRequest("The signature was not made by this wallet.");
    // Used once: a second request with the same proof finds it used.
    if (!(await consumeChallenge(challenge.nonce).catch(() => false))) return jsonBadRequest(expired);
    if (chain === "ton") address = tonFriendlyAddress(address) ?? address;
  }

  try {
    const wallet = await addOrgWallet({ orgId, chain, address, label, provider: provider ?? null, addedById: session.user.id });
    return jsonCreated({ data: wallet, message: "Wallet connected" });
  } catch (err) {
    if (err instanceof WalletAlreadyConnectedError) return jsonConflict(err.message);
    return jsonError({ message: "Failed to connect the wallet", code: 500, status: "internal_error" });
  }
};
