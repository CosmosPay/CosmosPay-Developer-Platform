/* OpenAPI registration for an organization's receiving wallets
   (src/pages/api/organizations/[id]/wallets/**; auto-loaded by src/lib/openapi/auto-load.ts).

   Connecting proves the wallet: it signs the message src/lib/org-wallets.ts builds from the
   organization, the network, the address and `issuedAt`, and the route checks that signature
   against the address. Payment links and private payments created from the dashboard must send
   to one of these wallets. A caller who is not a member is answered 404, as on every
   organization route. */
import { errors, jsonCreated, jsonOk, registerRoutes, sessionSecurity } from "@/lib/openapi/route-helpers";
import { z } from "@/lib/openapi/zod";
import { connectWalletBodySchema, renameWalletBodySchema } from "@/schemas/org-wallets";
import { jsonBody, pathParam } from "@/schemas/shared/openapi-params";

const TAG = "Organizations";
const orgIdParam = pathParam("id", "org_123", "Organization id.");
const walletParams = orgIdParam.extend(pathParam("walletId", "clx9z8a1b0000wllt1234abcd", "Wallet id.").shape);

const walletSchema = z
  .object({
    id: z.string().openapi({ example: "clx9z8a1b0000wllt1234abcd" }),
    chain: z.enum(["stellar", "solana", "monad"]).openapi({ example: "stellar" }),
    address: z.string().openapi({ example: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG", description: "As the chain writes it; EVM addresses lower-cased." }),
    label: z.string().nullable().openapi({ example: "Treasury" }),
    provider: z.enum(["freighter", "phantom", "solflare", "evm"]).nullable().openapi({ example: "freighter", description: "The wallet that proved the address." }),
    createdAt: z.string().openapi({ example: "2026-10-25T20:00:00.000Z" }),
  })
  .openapi("OrganizationWallet", { description: "A wallet the organization receives payments in." });

const connectBody = connectWalletBodySchema.openapi("ConnectOrganizationWalletBody", {
  description:
    "`signature` is the wallet's signature over the proof message for this organization, network, address and `issuedAt` (at most 10 minutes old): SEP-53 base64 on Stellar, Ed25519 base64 on Solana, personal_sign 0x-hex on Monad. On Stellar, `signedXdr` instead (no `provider`): the proof transaction carrying that message (a manageData entry, sequence 1, never valid, public network passphrase), signed by the address in any wallet.",
  example: {
    chain: "stellar",
    address: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG",
    provider: "freighter",
    label: "Treasury",
    issuedAt: "2026-10-25T20:00:00.000Z",
    signature: "q5mX1b0rC2vJ3cQwM9h2c0Q4pG8sYxkS2t1Q0mN6aWv7Yk3h8e2Lr5Z9u4o1i0p3s6d8f2g7h1j4k9l0m3n5b2v8==",
  },
});
const renameBody = renameWalletBodySchema.openapi("RenameOrganizationWalletBody", { example: { label: "Store payouts" } });

registerRoutes([
  {
    method: "get",
    path: "/api/organizations/{id}/wallets",
    tags: [TAG],
    summary: "List the organization's wallets",
    description: "Any member may read them: every payment form offers them as the receiving address.",
    security: sessionSecurity,
    request: { params: orgIdParam },
    responses: {
      200: jsonOk(z.array(walletSchema), "ListOrganizationWalletsResponse", "Wallets loaded"),
      401: errors.unauthorized,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: "post",
    path: "/api/organizations/{id}/wallets",
    tags: [TAG],
    summary: "Connect a wallet",
    description:
      "Needs `wallets:create`. The signature must come from the address and the proof must be recent; an organization holds at most 25 wallets. 409 when the wallet is already connected.",
    security: sessionSecurity,
    request: { params: orgIdParam, ...jsonBody(connectBody) },
    responses: {
      201: jsonCreated(walletSchema, "ConnectOrganizationWalletResponse", "Wallet connected"),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      409: { description: "The wallet is already connected to this organization", content: errors.badRequest.content },
      500: errors.internalError,
    },
  },
  {
    method: "patch",
    path: "/api/organizations/{id}/wallets/{walletId}",
    tags: [TAG],
    summary: "Rename a wallet",
    description: "Needs `wallets:edit`. An empty label clears it.",
    security: sessionSecurity,
    request: { params: walletParams, ...jsonBody(renameBody) },
    responses: {
      200: jsonOk(walletSchema, "RenameOrganizationWalletResponse", "Wallet renamed"),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: "delete",
    path: "/api/organizations/{id}/wallets/{walletId}",
    tags: [TAG],
    summary: "Remove a wallet",
    description: "Needs `wallets:delete`. Payment links already created keep their address; new ones can no longer choose it.",
    security: sessionSecurity,
    request: { params: walletParams },
    responses: {
      200: jsonOk(z.object({ id: z.string().openapi({ example: "clx9z8a1b0000wllt1234abcd" }) }), "RemoveOrganizationWalletResponse", "Wallet removed"),
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
]);
