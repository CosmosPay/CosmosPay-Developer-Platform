import { z } from "zod";
import { requestSession } from "@/lib/request-session";
import { ApiStatus, jsonCreated, jsonError, jsonForbidden, jsonNotFound, jsonUnauthorized, parseJson } from "@/lib/http";
import { getMembership } from "@/lib/organizations";
import { hasOrgPermission } from "@/lib/org-permissions";
import { walletProofMessage } from "@/lib/org-wallets";
import { issueChallenge, TooManyChallengesError } from "@/lib/org-wallet-challenges";
import { proofHost, tonManifestUrl } from "@/lib/wallet-proof-env";
import { starknetProofMessage, starknetTypedData } from "@/lib/wallet-proofs/starknet";
import { walletChallengeBodySchema } from "@/schemas/org-wallets";
import type { APIRoute } from "astro";

const paramsSchema = z.object({ id: z.string().min(1) });

/* POST /api/organizations/:id/wallets/challenge: a challenge to prove a wallet (`wallets:create`).
   A random nonce for this member, organization, network and address, valid ten minutes and good
   for one connect. The answer carries what the wallet signs: the message (every network but TON,
   whose wallet signs a ton_proof over the nonce for this host, named by `manifestUrl`), the host
   (TON's proof domain and NEAR's NEP-413 recipient) and, on Starknet, the SNIP-12 typed data. */
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

  const body = await parseJson(ctx.request, walletChallengeBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: "bad_request" });
  }
  const { chain } = body.data;
  const address = chain === "ton" ? null : body.data.address ?? null;

  try {
    const challenge = await issueChallenge({ orgId, userId: session.user.id, chain, address });
    const { nonce, issuedAt, expiresAt } = challenge;
    return jsonCreated({
      data: {
        chain,
        address: challenge.address,
        nonce,
        issuedAt,
        expiresAt,
        message: challenge.address ? walletProofMessage({ orgId, chain, address: challenge.address, nonce, issuedAt, expiresAt }) : null,
        domain: proofHost(),
        manifestUrl: chain === "ton" ? tonManifestUrl() : null,
        typedData: chain === "starknet" ? starknetTypedData(starknetProofMessage(challenge)) : null,
      },
      message: "Challenge issued",
    });
  } catch (err) {
    if (err instanceof TooManyChallengesError) return jsonError({ message: err.message, code: 429, status: ApiStatus.BAD_REQUEST });
    return jsonError({ message: "Failed to issue the challenge", code: 500, status: "internal_error" });
  }
};
