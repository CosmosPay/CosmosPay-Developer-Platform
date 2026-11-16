/* Zod schemas for the dashboard's payment-intents proxy routes.
   The heavy lifting (XDR build, SEP-7 URI, QR, Stellar validation) happens upstream
   in the Payments API; here we only sanity-check the developer's input before
   forwarding it, mirroring the upstream DTOs. */
/* `z` comes from @/lib/openapi/zod, not from "zod": that module applies
   extendZodWithOpenApi, and with zod v4 the extension is NOT retroactive: a schema
   built before it runs has no `.openapi()` at all. These schemas are handed to the
   OpenAPI registration in ./<module>/openapi.ts, and importing the extended `z` here is
   what guarantees the extension has run by the time they are constructed. It is the same
   `z` otherwise, so validation is unchanged. */
import { z } from "@/lib/openapi/zod";
import { CHECKOUT_THEMES } from "@/lib/payments/checkout-themes";
import { ADDRESS_MESSAGES, ADDRESS_PATTERNS, NATIVE_CODES, NETWORK_IDS, isChain, isNetworkAddress, networkAddressMessage, networkName, sameNetworkAddress, type NetworkId } from "@/lib/chains";
import { merchantFeeSchema } from "@/schemas/merchant-fee";

// An account, mint or contract on any network; its shape is checked per network below. Long
// enough for a Cardano base address or a Zcash unified one.
const chainAddress = z.string().trim().min(1).max(1100);
// A token's contract on a network paid through a deposit address: an ERC-20 address, a Sui coin
// type, a NEAR account, a jetton master... The Payments API matches it against the tokens it lists.
const contractString = z.string().trim().min(1).max(200).regex(/^[!-~]+$/, "A token contract has no spaces.");

// A positive decimal; how many places it may carry depends on the chain (below).
const amountString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?$/, "Amount must be a positive decimal.");
/* Decimal places: Stellar's 7; on every other network a token carries its own, up to 18 (the
   Payments API checks the token's real decimals). */
const amountPlaces = (network: NetworkId) => (network === "stellar" ? 7 : 18);

/** Decimal places of an amount string; 0 for none. */
const places = (amount: string | undefined) => amount?.split(".")[1]?.length ?? 0;

const memoString = z.string().trim().regex(/^\d+$/, "Memo must be a numeric MEMO_ID.").max(20);
const assetCode = z.string().trim().regex(/^[a-zA-Z0-9]{1,12}$/, "Asset code must be 1-12 letters or digits.");
const msgString = z.string().trim().max(300);
const callbackString = z.string().trim().max(2048);
// The hosted checkout's design (src/lib/payments/checkout-themes.ts); the server defaults to classic.
const checkoutTheme = z.enum(CHECKOUT_THEMES);

// Which environment (network) the intent targets; maps to the consumer env header.
export const cosmosEnvSchema = z.enum(["dev", "prod"]).default("dev");

/* Unified create body. `chain` is where the payment settles (Stellar unless said): any network
   in NETWORK_IDS. Stellar, Solana and Monad take the environment's network (Solana devnet and Monad
   testnet in the sandbox); every other one is paid through a deposit address made for each
   payment, on mainnet only. `kind` selects:
   - "pay": a payment link, no source, amount optional (e.g. donations) on Stellar and Solana;
   - "tx":  Stellar only: source + amount required, returns an unsigned XDR to sign. */
export const createPaymentIntentBodySchema = z
  .object({
    org: z.string().trim().min(1).max(64),
    environment: cosmosEnvSchema,
    chain: z.enum(NETWORK_IDS as [NetworkId, ...NetworkId[]]).default("stellar"),
    kind: z.enum(["pay", "tx"]).default("pay"),
    source: chainAddress.optional(),
    destination: chainAddress,
    amount: amountString.optional(),
    assetCode: assetCode.optional(),
    assetIssuer: chainAddress.optional(),
    memo: memoString.optional(),
    msg: msgString.optional(),
    callback: callbackString.optional(),
    checkoutTheme: checkoutTheme.optional(),
    merchantFee: merchantFeeSchema.optional(),
  })
  .superRefine((v, ctx) => {
    const chain = v.chain;
    const issue = (key: string, message: string) => ctx.addIssue({ code: "custom", path: [key], message });
    if (places(v.amount) > amountPlaces(chain)) issue("amount", "Amount must have at most " + amountPlaces(chain) + " decimals on " + networkName(chain) + ".");
    if (!isChain(chain)) {
      // Every other network: a payment link paid through a deposit address made for each payment,
      // on mainnet only, for an amount in one of the tokens the network lists (or its coin).
      if (!isNetworkAddress(chain, v.destination)) issue("destination", networkAddressMessage(chain));
      if (v.environment !== "prod") issue("environment", "Payments on " + networkName(chain) + " run on mainnet only: use the production environment.");
      if (v.kind !== "pay") issue("kind", "Transaction intents are Stellar only; use a payment link on " + networkName(chain) + ".");
      if (!v.amount) issue("amount", "An amount is required on " + networkName(chain) + ".");
      if (v.source !== undefined) issue("source", "Stellar only; not used on " + networkName(chain) + ".");
      if (v.callback !== undefined) issue("callback", "Stellar only; not used on " + networkName(chain) + ".");
      if (v.merchantFee) issue("merchantFee", "A merchant fee is not available on " + networkName(chain) + " yet.");
      if (v.assetIssuer !== undefined && !contractString.safeParse(v.assetIssuer).success) issue("assetIssuer", "A token contract has no spaces.");
      return;
    }
    for (const key of ["destination", "source", "assetIssuer"] as const) {
      const value = v[key];
      if (value !== undefined && !ADDRESS_PATTERNS[chain].test(value)) issue(key, ADDRESS_MESSAGES[chain]);
    }
    const native = !v.assetCode || v.assetCode.toUpperCase() === NATIVE_CODES[chain];
    // A merchant fee is a second payment in the same transaction (Stellar, Solana) or a split at
    // the deposit address (Monad), and it needs an amount to take it from. Its wallet is the
    // organization's, on the link's chain (checked by the route).
    if (v.merchantFee) {
      const wallet = v.merchantFee.wallet;
      if (!v.amount) issue("merchantFee", "A merchant fee needs an amount.");
      else if (!ADDRESS_PATTERNS[chain].test(wallet)) issue("merchantFee", ADDRESS_MESSAGES[chain]);
      else if (sameNetworkAddress(chain, wallet, v.destination)) issue("merchantFee", "The fee goes to another wallet than the payment.");
      else if (places(v.merchantFee.fixed) > amountPlaces(chain)) issue("merchantFee", "The fixed fee has too many decimals for " + chain + ".");
    }
    if (chain === "stellar") {
      if (v.kind === "tx" && !v.source) issue("source", "A source account is required for a transaction intent.");
      if (v.kind === "tx" && !v.amount) issue("amount", "An amount is required for a transaction intent.");
      if (!native && !v.assetIssuer) issue("assetIssuer", "A non-native asset requires an issuer.");
      return;
    }
    // Solana and Monad: payment links only; a token is its ticker plus its mint or contract.
    if (v.kind !== "pay") issue("kind", "Transaction intents are Stellar only; use a payment link on " + chain + ".");
    if (v.source !== undefined) issue("source", "Stellar only; not used on " + chain + ".");
    if (v.callback !== undefined) issue("callback", "Stellar only; not used on " + chain + ".");
    if (v.assetIssuer && !v.assetCode) issue("assetCode", "A token needs its ticker (e.g. USDC) beside its address.");
    if (!native && !v.assetIssuer) issue("assetIssuer", chain === "solana" ? "A token needs its SPL mint." : "A token needs its ERC-20 contract.");
    if (chain === "monad") {
      if (!v.amount) issue("amount", "An amount is required on Monad: it is part of how the payment is recognised.");
      if (v.msg !== undefined) issue("msg", "A wallet message is not supported on Monad.");
    }
  });

export const updatePaymentIntentBodySchema = z.object({
  status: z.enum(["PENDING", "SUBMITTED", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"]).optional(),
  txHash: z.string().trim().min(1).max(128).optional(),
  reference: z.string().trim().max(120).optional(),
  checkoutTheme: checkoutTheme.optional(),
});

export const validatePaymentIntentBodySchema = z.object({
  txHash: z.string().trim().min(1).max(128),
});

export type CreatePaymentIntentBody = z.infer<typeof createPaymentIntentBodySchema>;
export type UpdatePaymentIntentBody = z.infer<typeof updatePaymentIntentBodySchema>;
export type ValidatePaymentIntentBody = z.infer<typeof validatePaymentIntentBodySchema>;
