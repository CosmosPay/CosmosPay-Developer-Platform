/* OpenAPI registration for an organization's receiving wallets
   (src/pages/api/organizations/[id]/wallets/**; auto-loaded by src/lib/openapi/auto-load.ts).

   Connecting proves the wallet: the member asks for a challenge (a nonce, ten minutes, one use),
   the wallet signs it as its network's wallets sign (src/lib/org-wallets.ts, WALLET_PROVIDERS),
   and the route checks that signature against the address before it uses the challenge up. Payment links and private payments created from the dashboard must send
   to one of these wallets. A caller who is not a member is answered 404, as on every
   organization route. */
import { errors, jsonCreated, jsonOk, registerRoutes, sessionSecurity } from "@/lib/openapi/route-helpers";
import { z } from "@/lib/openapi/zod";
import { connectWalletBodySchema, renameWalletBodySchema, walletChallengeBodySchema } from "@/schemas/org-wallets";
import { jsonBody, pathParam } from "@/schemas/shared/openapi-params";
import { PAYMENT_NETWORK_IDS, type NetworkId } from "@/lib/chains";
import { WALLET_PROVIDER_IDS } from "@/lib/org-wallets";

const TAG = "Organizations";
const orgIdParam = pathParam("id", "org_123", "Organization id.");
const walletParams = orgIdParam.extend(pathParam("walletId", "clx9z8a1b0000wllt1234abcd", "Wallet id.").shape);

const walletSchema = z
  .object({
    id: z.string().openapi({ example: "clx9z8a1b0000wllt1234abcd" }),
    chain: z.enum(PAYMENT_NETWORK_IDS as [NetworkId, ...NetworkId[]]).openapi({ example: "stellar", description: "Any network a payment link settles on." }),
    address: z.string().openapi({ example: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG", description: "As the network writes it; hex addresses (EVM and the like) lower-cased." }),
    label: z.string().nullable().openapi({ example: "Treasury" }),
    provider: z.enum(WALLET_PROVIDER_IDS).nullable().openapi({ example: "freighter", description: "What proved the address: the wallet that signed (`freighter`, `phantom`, `solflare`, `evm`) or the signature's standard (`tip191`, `tonproof`, `nep413`, `sui`, `aip62`, `snip12`, `cip30`, `xrpl`, `bip322`, `signmessage`); `address` when it was added by its address, with no signature (an address that cannot sign a message); null for a signed Stellar XDR." }),
    createdAt: z.string().openapi({ example: "2026-10-25T20:00:00.000Z" }),
  })
  .openapi("OrganizationWallet", { description: "A wallet the organization receives payments in." });

const challengeBody = walletChallengeBodySchema.openapi("OrganizationWalletChallengeBody", {
  description: "The network and the address to prove. On TON no address: the wallet names it while signing.",
  example: { chain: "tron", address: "TCLBgkbfVkJroVBJVqBEsxtPNQEQMTQCLQ" },
});

const challengeSchema = z
  .object({
    chain: z.enum(PAYMENT_NETWORK_IDS as [NetworkId, ...NetworkId[]]).openapi({ example: "tron" }),
    address: z.string().nullable().openapi({ example: "TCLBgkbfVkJroVBJVqBEsxtPNQEQMTQCLQ", description: "As stored and compared (hex lower-cased); null on TON." }),
    nonce: z.string().openapi({ example: "0f1e2d3c4b5a69788796a5b4c3d2e1f00112233445566778899aabbccddeeff0", description: "32 random bytes, hex. Send it back as `nonce` when connecting." }),
    issuedAt: z.string().openapi({ example: "2026-11-16T12:00:00.000Z" }),
    expiresAt: z.string().openapi({ example: "2026-11-16T12:10:00.000Z", description: "Ten minutes after `issuedAt`; the challenge is good for one connect until then." }),
    message: z.string().nullable().openapi({ description: "The text the wallet signs (every network but TON): the organization, the network, the address, the nonce and the challenge's life, one per line." }),
    domain: z.string().openapi({ example: "dev.cosmospay.lat", description: "The dashboard's host: the domain of TON's ton_proof and the recipient of NEAR's NEP-413 signature." }),
    manifestUrl: z.string().nullable().openapi({ description: "TON only: the TON Connect manifest the wallet reads; its host is `domain`." }),
    typedData: z.record(z.string(), z.unknown()).nullable().openapi({ description: "Starknet only: the SNIP-12 (revision 1) typed data the account signs (domain Cosmos Pay on SN_MAIN; the organization, the nonce cut to 31 bytes, the expiry in seconds)." }),
  })
  .openapi("OrganizationWalletChallenge", { description: "What a wallet signs to be connected to the organization." });

const connectBody = connectWalletBodySchema.openapi("ConnectOrganizationWalletBody", {
  description: [
    "`nonce` names the challenge (POST .../wallets/challenge) and `provider` how it was signed; the proof is `signature` or `proof`.",
    "Stellar: SEP-53 base64 (`freighter`), or `signedXdr` instead (no `provider`): the proof transaction carrying the message (a manageData entry, sequence 1, never valid, public network passphrase), signed by the address in any wallet.",
    "Solana and Fogo: Ed25519 base64 over the message (`phantom`, `solflare`). Monad, Arc and every other EVM network: personal_sign 0x-hex (`evm`).",
    "Tron: TIP-191 signMessageV2 0x-hex (`tip191`). Sui: the serialized personal-message signature, base64 (`sui`).",
    "Bitcoin: BIP-322 simple, the base64 witness (`bip322`), or a BIP-137 compact signature (`signmessage`). Litecoin, Dogecoin, Dash, Zcash (transparent) and Bitcoin Cash: the wallet's signmessage, base64 (`signmessage`).",
    "TON (`tonproof`): `proof` is TON Connect's answer, `{ publicKey, walletStateInit, proof: { timestamp, domain, payload, signature } }`, its payload the nonce and its domain `domain`.",
    "NEAR (`nep413`): `proof` is `{ publicKey, signature }` of NEP-413 over the message, the nonce's 32 bytes and `domain` as recipient; the key must be a full-access key of the account.",
    "Aptos and Movement (`aip62`): `proof` is `{ publicKey, signature, fullMessage }` of AIP-62 signMessage with the message and the nonce; the key must be the account's authentication key.",
    "Starknet (`snip12`): `proof` is `{ signature: [felt, ...] }` over the challenge's `typedData`; the account contract must accept it (is_valid_signature).",
    "Cardano (`cip30`): `proof` is CIP-30 signData's `{ signature, key }` (COSE_Sign1 and COSE_Key, hex) over the message, from the address's payment key.",
    "XRP Ledger (`xrpl`): `proof` is `{ publicKey, signature }`, the keypairs signature of the message's hex.",
    "An address that cannot sign a message (Bitcoin and Litecoin P2WSH, a P2SH address on Dogecoin, Dash, Bitcoin Cash or Zcash, a Zcash unified address): `provider: \"address\"` and `addressConfirm`, the same address typed again, with no nonce or signature.",
  ].join(" "),
  example: {
    chain: "tron",
    address: "TCLBgkbfVkJroVBJVqBEsxtPNQEQMTQCLQ",
    provider: "tip191",
    label: "Treasury",
    nonce: "0f1e2d3c4b5a69788796a5b4c3d2e1f00112233445566778899aabbccddeeff0",
    signature: "0x6a3c9e1f6f2d4b8a1e7c5d3b2a19087f6e5d4c3b2a1908f7e6d5c4b3a291807f6e5d4c3b2a1908f7e6d5c4b3a291807f6e5d4c3b2a1908f7e6d5c4b3a291807f1b",
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
    path: "/api/organizations/{id}/wallets/challenge",
    tags: [TAG],
    summary: "Get a challenge to prove a wallet",
    description: "Needs `wallets:create`. A nonce for this member, organization, network and address, valid ten minutes and good for one connect, with what the wallet signs. 400 for an address that cannot sign a message (it is added by its address instead); 429 when the member already holds 20 open challenges in the organization.",
    security: sessionSecurity,
    request: { params: orgIdParam, ...jsonBody(challengeBody) },
    responses: {
      201: jsonCreated(challengeSchema, "OrganizationWalletChallengeResponse", "Challenge issued"),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      429: { description: "Too many open challenges", content: errors.badRequest.content },
      500: errors.internalError,
    },
  },
  {
    method: "get",
    path: "/api/wallet-proofs/tonconnect-manifest.json",
    tags: [TAG],
    summary: "TON Connect manifest",
    description: "Public. The manifest a TON wallet reads when it proves an address: the platform's origin (the ton_proof domain), its name and its icon.",
    responses: {
      200: {
        description: "The manifest",
        content: {
          "application/json": {
            schema: z
              .object({
                url: z.string().openapi({ example: "https://dev.cosmospay.lat" }),
                name: z.string().openapi({ example: "Cosmos Pay" }),
                iconUrl: z.string().openapi({ example: "https://dev.cosmospay.lat/apple-touch-icon.png" }),
              })
              .openapi("TonConnectManifest"),
          },
        },
      },
    },
  },
  {
    method: "post",
    path: "/api/organizations/{id}/wallets",
    tags: [TAG],
    summary: "Connect a wallet",
    description:
      "Needs `wallets:create`. The signature must come from the address, over a challenge issued to this member for this organization, network and address, still alive and not used (or, for an address that cannot sign a message, the address is typed twice); an organization holds at most 25 wallets. 409 when the wallet is already connected; 503 when the network a proof is checked on (NEAR, Aptos, Movement, Starknet) could not be reached.",
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
      503: { description: "The network the proof is checked on could not be reached", content: errors.badRequest.content },
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
    description:
      "Needs `wallets:delete`. Payment links already created keep their address; new ones can no longer choose it. " +
      "A Discord server linked to pay into the wallet is unlinked first (the bot told, its API key revoked), which also needs the delete permission of that key's environment " +
      "(`apiKeysTest:delete` or `apiKeysLive:delete`): without it the wallet stays and the answer is 409.",
    security: sessionSecurity,
    request: { params: walletParams },
    responses: {
      200: jsonOk(
        z.object({
          id: z.string().openapi({ example: "clx9z8a1b0000wllt1234abcd" }),
          discordUnlinked: z.array(z.string()).openapi({ description: "The Discord links unlinked with the wallet", example: [] }),
        }),
        "RemoveOrganizationWalletResponse",
        "Wallet removed",
      ),
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      409: { description: "A linked Discord server pays into the wallet, and unlinking it needs a permission the member lacks", content: errors.badRequest.content },
      500: errors.internalError,
    },
  },
]);
