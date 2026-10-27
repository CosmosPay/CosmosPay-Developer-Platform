/* Zod schemas for the dashboard's swaps proxy routes.
   The Payments API does the real work (the Stellar DEX, Jupiter on Solana, Kuru Flow on
   Monad; NEAR Intents between chains). We only sanity-check input before forwarding,
   mirroring the upstream DTOs.

   NOTE: there is deliberately NO fee/commission field here. The swap commission is the
   calling organization's plan rate, resolved server-side (orgSwapContext) and injected
   into the gateway headers; it can never be passed as a parameter. */
/* `z` comes from @/lib/openapi/zod, not from "zod": that module applies
   extendZodWithOpenApi, and with zod v4 the extension is NOT retroactive: a schema
   built before it runs has no `.openapi()` at all. These schemas are handed to the
   OpenAPI registration in ./<module>/openapi.ts, and importing the extended `z` here is
   what guarantees the extension has run by the time they are constructed. It is the same
   `z` otherwise, so validation is unchanged. */
import { z } from "@/lib/openapi/zod";
import { ADDRESS_MESSAGES, ADDRESS_PATTERNS, CHAINS, NETWORK_IDS, isChain, type Chain } from "@/lib/chains";

export const SWAP_CHAINS = CHAINS;
export type SwapChain = Chain;

const STELLAR_ADDRESS = ADDRESS_PATTERNS.stellar;
const SOLANA_ADDRESS = ADDRESS_PATTERNS.solana;
const EVM_ADDRESS = ADDRESS_PATTERNS.monad;

/* What an account address looks like on each chain (shape only; the Payments API checks
   the checksum). A missing chain is Stellar, as upstream. */
const ADDRESS_RULES: Record<SwapChain, { re: RegExp; message: string }> = {
  stellar: { re: ADDRESS_PATTERNS.stellar, message: ADDRESS_MESSAGES.stellar },
  solana: { re: ADDRESS_PATTERNS.solana, message: ADDRESS_MESSAGES.solana },
  monad: { re: ADDRESS_PATTERNS.monad, message: ADDRESS_MESSAGES.monad },
};

/* How each chain spells a swap asset: a Stellar code, or the native ticker / `native` /
   the SPL mint / the ERC-20 address. */
const ASSET_RULES: Record<SwapChain, (v: string) => boolean> = {
  stellar: (v) => /^[a-zA-Z0-9]{1,12}$/.test(v),
  solana: (v) => ["sol", "native"].includes(v.toLowerCase()) || SOLANA_ADDRESS.test(v),
  monad: (v) => ["mon", "native"].includes(v.toLowerCase()) || EVM_ADDRESS.test(v),
};

/* Decimal places an amount may carry: Stellar's 7, a token's own up to 18 elsewhere. */
const AMOUNT_PLACES: Record<SwapChain, number> = { stellar: 7, solana: 18, monad: 18 };

const stellarAddress = z.string().trim().regex(STELLAR_ADDRESS, ADDRESS_RULES.stellar.message);
const decimalString = z.string().trim().regex(/^\d+(\.\d+)?$/, "Amount must be a positive decimal.");
const assetString = z.string().trim().min(1).max(64);
const memoString = z.string().trim().regex(/^\d+$/, "Memo must be a numeric MEMO_ID.").max(20);
const slippageBps = z.number().int().min(0).max(10000);
/* One key per intended swap: a retry with the same key and request answers the swap already
   built instead of building a second one (the Payments API keeps it per consumer). */
const idempotencyKey = z.string().trim().min(1).max(255);

export const cosmosEnvSchema = z.enum(["dev", "prod"]).default("dev");
export const swapChainSchema = z.enum(SWAP_CHAINS);

/* Shared quote fields (sell `amount` of the source asset for the destination asset). */
const swapQuoteShape = {
  org: z.string().trim().min(1).max(64),
  environment: cosmosEnvSchema,
  chain: swapChainSchema.optional(),
  amount: decimalString,
  sourceAssetCode: assetString.optional(),
  sourceAssetIssuer: stellarAddress.optional(),
  destAssetCode: assetString,
  destAssetIssuer: stellarAddress.optional(),
  slippageBps: slippageBps.optional(),
};

type QuoteLike = {
  chain?: SwapChain;
  amount: string;
  sourceAssetCode?: string;
  sourceAssetIssuer?: string;
  destAssetCode: string;
  destAssetIssuer?: string;
  source?: string;
  destination?: string;
  memo?: string;
};

/* The per-chain rules zod cannot express field by field: they depend on `chain`. */
function checkChain(v: QuoteLike, ctx: z.RefinementCtx) {
  const chain: SwapChain = v.chain ?? "stellar";
  const places = v.amount.split(".")[1]?.length ?? 0;
  if (places > AMOUNT_PLACES[chain]) {
    ctx.addIssue({ code: "custom", path: ["amount"], message: `Amount must have at most ${AMOUNT_PLACES[chain]} decimals on ${chain}.` });
  }
  for (const key of ["sourceAssetCode", "destAssetCode"] as const) {
    const value = v[key];
    if (value !== undefined && !ASSET_RULES[chain](value)) {
      ctx.addIssue({ code: "custom", path: [key], message: `Not an asset of ${chain}.` });
    }
  }
  for (const key of ["source", "destination"] as const) {
    const value = v[key];
    if (value !== undefined && !ADDRESS_RULES[chain].re.test(value)) {
      ctx.addIssue({ code: "custom", path: [key], message: ADDRESS_RULES[chain].message });
    }
  }
  if (chain === "stellar") {
    const dest = v.destAssetCode.toLowerCase();
    if (dest !== "xlm" && dest !== "native" && !v.destAssetIssuer) {
      ctx.addIssue({ code: "custom", path: ["destAssetIssuer"], message: "A non-native destination asset requires an issuer." });
    }
    return;
  }
  // Issuers, a memo and a separate destination only mean something on Stellar.
  for (const key of ["sourceAssetIssuer", "destAssetIssuer", "memo"] as const) {
    if (v[key] !== undefined) ctx.addIssue({ code: "custom", path: [key], message: `Stellar only; not used on ${chain}.` });
  }
  if (!v.sourceAssetCode) {
    ctx.addIssue({ code: "custom", path: ["sourceAssetCode"], message: `Required on ${chain}.` });
  }
  if (v.destination !== undefined && v.destination !== v.source) {
    ctx.addIssue({ code: "custom", path: ["destination"], message: `On ${chain} the output goes to the source.` });
  }
}

export const quoteSwapBodySchema = z.object(swapQuoteShape).superRefine(checkChain);

export const createSwapBodySchema = z
  .object({
    ...swapQuoteShape,
    // Validated per chain in checkChain.
    source: z.string().trim().min(1).max(64),
    destination: z.string().trim().min(1).max(64).optional(),
    memo: memoString.optional(),
    idempotencyKey: idempotencyKey.optional(),
  })
  .superRefine(checkChain);

/* A Stellar swap is submitted as `signedXdr`, a Solana or Monad one as
   `signedTransaction`: exactly one of the two. */
export const submitSwapBodySchema = z
  .object({
    signedXdr: z.string().trim().min(1).max(100000).optional(),
    signedTransaction: z.string().trim().min(1).max(100000).optional(),
  })
  .refine((v) => (v.signedXdr === undefined) !== (v.signedTransaction === undefined), {
    message: "Send exactly one of signedXdr (Stellar) or signedTransaction (Solana, Monad).",
    path: ["signedXdr"],
  });

export type QuoteSwapBody = z.infer<typeof quoteSwapBodySchema>;
export type CreateSwapBody = z.infer<typeof createSwapBodySchema>;
export type SubmitSwapBody = z.infer<typeof submitSwapBodySchema>;

/* ---- Cross-chain swaps (NEAR Intents) ---- */

/* Every network NEAR Intents reaches through the Payments API (src/lib/chains.ts NETWORK_IDS). */
export const crossChainNetworkSchema = z.enum(NETWORK_IDS as [string, ...string[]]);
/* An address on a network this app has no rule for: one word of address characters, the
   Payments API checks the network's real format. */
const LOOSE_ADDRESS = /^[A-Za-z0-9:._-]{2,128}$/;
/* The most decimals any NEAR Intents token carries (wNEAR's 24). */
const NEAR_MAX_PLACES = 24;

const crossChainShape = {
  org: z.string().trim().min(1).max(64),
  environment: cosmosEnvSchema,
  originChain: crossChainNetworkSchema,
  originAsset: z.string().trim().min(1).max(128),
  destinationChain: crossChainNetworkSchema,
  destinationAsset: z.string().trim().min(1).max(128),
  amount: decimalString,
  recipient: z.string().trim().min(1).max(128),
  refundTo: z.string().trim().min(1).max(128),
  slippageBps: slippageBps.optional(),
};

function checkCrossChain(
  v: { originChain: string; destinationChain: string; recipient: string; refundTo: string; amount: string },
  ctx: z.RefinementCtx,
) {
  // Within Stellar, Solana or Monad their own market settles a swap (POST /api/swaps); within
  // any other network NEAR Intents may.
  if (v.originChain === v.destinationChain && isChain(v.originChain)) {
    ctx.addIssue({ code: "custom", path: ["destinationChain"], message: `A swap within ${v.originChain} goes through its own market: use /api/swaps.` });
  }
  const check = (chain: string, value: string, key: "recipient" | "refundTo") => {
    if (isChain(chain) ? !ADDRESS_RULES[chain].re.test(value) : !LOOSE_ADDRESS.test(value)) {
      ctx.addIssue({ code: "custom", path: [key], message: isChain(chain) ? ADDRESS_RULES[chain].message : `Must be an address on ${chain}.` });
    }
  };
  check(v.destinationChain, v.recipient, "recipient");
  check(v.originChain, v.refundTo, "refundTo");
  const places = v.amount.split(".")[1]?.length ?? 0;
  const max = isChain(v.originChain) ? AMOUNT_PLACES[v.originChain] : NEAR_MAX_PLACES;
  if (places > max) {
    ctx.addIssue({ code: "custom", path: ["amount"], message: `Amount must have at most ${max} decimals on ${v.originChain}.` });
  }
}

export const quoteCrossChainSwapBodySchema = z.object(crossChainShape).superRefine(checkCrossChain);
export const createCrossChainSwapBodySchema = z
  .object({ ...crossChainShape, idempotencyKey: idempotencyKey.optional() })
  .superRefine(checkCrossChain);

/* The deposit transaction id, in the origin chain's own spelling. */
export const reportDepositBodySchema = z.object({
  txHash: z.string().trim().min(1).max(128),
});

export type QuoteCrossChainSwapBody = z.infer<typeof quoteCrossChainSwapBodySchema>;
export type CreateCrossChainSwapBody = z.infer<typeof createCrossChainSwapBodySchema>;
