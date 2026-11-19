/* types.ts: the P2P market as the Payments API answers it (`/v1/p2p/*`, the community server's
   `src/p2p` module), for the dashboard's P2P views, the hosted charge page and the public P2P app.
   Amounts: token amounts are base-unit strings where the field says `Units`, otherwise decimal
   strings; local money is always a decimal string. Dates are ISO strings.

   The server's own shapes differ in places (base units, token addresses, flat deadlines, nested
   rails): src/lib/p2p/normalize.ts turns its answers into these and the screens' requests into its
   bodies, so the screens read one vocabulary. */

export type P2pTier = "mainnet" | "testnet";

/** One token the market trades on a network. */
export interface P2pToken {
  symbol: string;
  address: string;
  decimals: number;
}

/** One EVM network the market contract is deployed on. */
export interface P2pNetwork {
  /* The Payments API's network id (base, arb, monad...). */
  id: string;
  name: string;
  chainId: number;
  contract: string;
  explorer?: string | null;
  /* What a wallet needs to add the network when it does not know it. */
  rpcUrl?: string | null;
  nativeSymbol?: string | null;
  tokens: P2pToken[];
}

/** A rail as the market lists it: its currency and the fields an account on it takes. */
export interface P2pMarketRail {
  id: string;
  currency: string;
  fields: { key: string; required: boolean }[];
}

export interface P2pMarket {
  tier: P2pTier;
  networks: P2pNetwork[];
  currencies: { code: string; rails: string[] }[];
  rails: P2pMarketRail[];
  protocolFeeBps: number;
  /* Seconds: how long a buyer has to pay, a merchant to accept a bonded order, and a sale's
     settle window. */
  windows: { paymentSeconds: number; acceptSeconds: number; settleSeconds: number };
  sellBondBps: number;
  /* Cosmos Pay's matcher: the address a merchant authorises to open orders on its balance. */
  matcher: string;
  maxPayoutItems?: number;
}

export type P2pMerchantStatus = "ACTIVE" | "PAUSED" | "SUSPENDED";

export interface P2pMerchantStats {
  completed: number;
  cancelled: number;
  disputesLost: number;
  medianReleaseSeconds: number | null;
  lastActiveAt: string | null;
}

export interface P2pMerchantProfile {
  displayName: string | null;
  status: P2pMerchantStatus;
  stats: P2pMerchantStats;
}

/** A bot (operator) the account authorised on a network, with its permission bitmask. */
export interface P2pOperator {
  address: string;
  perms: number;
}

/** What the contract holds for an account on one network (read live). */
export interface P2pAccountChain {
  network: string;
  balances: { token: string; symbol: string; decimals: number; freeUnits: string; lockedUnits: string }[];
  matcher: { maxPerOrderUnits: string; autoSettle: boolean } | null;
  operators: P2pOperator[];
}

/** A wallet the organization registered with a signature: it holds liquidity, receives payouts
    and charges, and is the merchant on the orders matched to its offers. */
export interface P2pAccount {
  id: string;
  address: string;
  label: string | null;
  verifiedAt: string;
  createdAt: string;
  merchant: P2pMerchantProfile | null;
  /* Only on `GET /v1/p2p/accounts/{id}`. */
  chains?: P2pAccountChain[];
}

export interface P2pChallenge {
  id: string;
  message: string;
  expiresAt: string;
}

export interface P2pPaymentMethod {
  id: string;
  accountId: string;
  currency: string;
  rail: string;
  label: string | null;
  holderName: string;
  document: string | null;
  details: Record<string, string>;
  active: boolean;
  createdAt: string;
  /* The server's masked one-line description of the account ("alias ana.gomez.mp"). */
  summary?: string;
}

export type P2pOfferSide = "SELL_TOKEN" | "BUY_TOKEN";

export interface P2pOffer {
  id: string;
  accountId: string;
  side: P2pOfferSide;
  network: string;
  token: string;
  currency: string;
  rails: string[];
  price: string;
  priceUpdatedAt: string;
  priceTtlSeconds: number;
  minFiat: string;
  maxFiat: string;
  active: boolean;
  createdAt: string;
}

/** What a quote shows of the merchant it matched: never its address or account details. */
export interface P2pMerchantSummary {
  displayName: string;
  completed: number;
  completionRate: number | null;
  medianReleaseSeconds: number | null;
  disputesLost?: number;
}

export type P2pSide = "BUY" | "SELL";

export interface P2pQuote {
  id: string;
  side: P2pSide;
  network: string;
  token: string;
  currency: string;
  rail: string;
  price: string;
  fiatAmount: string;
  tokenAmount: string;
  protocolFee: string;
  integratorFee: string;
  netAmount: string;
  merchant: P2pMerchantSummary;
  expiresAt: string;
}

export type P2pOrderKind = "BUY" | "SELL" | "CHARGE" | "PAYOUT";

export const P2P_ORDER_STATUSES = [
  "pending",
  "awaiting_acceptance",
  "awaiting_payment",
  "paid",
  "disputed",
  "completed",
  "cancelled",
  "expired",
  "resolved",
  "failed",
] as const;
export type P2pOrderStatus = (typeof P2P_ORDER_STATUSES)[number];

/** A bank account as an order shows it to the party who must pay into it. */
export interface P2pBankAccount {
  rail: string;
  holderName: string;
  document?: string | null;
  details: Record<string, string>;
}

/** An unsigned transaction for the person's own wallet: it signs and sends it. */
export interface P2pTransaction {
  chainId: number;
  to: string;
  data: string;
  value: string;
  description?: string;
  /* Which step it is, when a response carries several (`approve`, `openWithDeposit`). */
  action?: string;
}

export interface P2pOrder {
  id: string;
  ref?: string;
  kind: P2pOrderKind;
  status: P2pOrderStatus;
  network: string;
  token: string;
  tokenAmount: string;
  fiatAmount: string;
  currency: string;
  rail: string;
  price: string;
  feeBps?: number;
  integratorFeeBps?: number;
  buyer: string | null;
  seller: string | null;
  bond?: string | null;
  merchant: P2pMerchantSummary | null;
  /* The role of the caller on this order, on the merchant's list (`merchant`) or the client's. */
  role?: "client" | "merchant";
  deadlines: { acceptBy: string | null; payBy: string | null; settleBy: string | null };
  /* Where the money goes: the merchant's account on a purchase (for the payer), the beneficiary's
     on a sale or payout (for the merchant who pays it). Only the party entitled to it sees it. */
  paymentDetails?: P2pBankAccount | null;
  /* Who must send the transfer on a purchase (the merchant checks it comes from them). */
  payer?: { name: string; document: string } | null;
  paidReference?: string | null;
  onchainId?: string | null;
  txs?: Partial<Record<"open" | "accept" | "paid" | "release" | "cancel" | "dispute" | "resolve", string>>;
  /* A sale's unsigned steps (approve, openWithDeposit), while the seller has not sent them. */
  transactions?: P2pTransaction[];
  chargeId?: string | null;
  payoutBatchId?: string | null;
  externalReference?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface P2pTransferMatch {
  order: P2pOrder;
  /* 1 for the amount, plus 1 for the payer's name and 1 for the document. */
  score: number;
  matchedOn?: string[];
  transaction: P2pTransaction;
}

export type P2pChargeStatus = "open" | "paid" | "expired" | "cancelled";

export interface P2pCharge {
  id: string;
  currency: string;
  fiatAmount: string;
  network: string;
  token: string;
  recipient: string;
  description: string | null;
  status: P2pChargeStatus;
  url: string;
  /* The link as a QR code, a PNG data URL. */
  qr?: string | null;
  multiUse: boolean;
  expiresAt: string | null;
  paidAt?: string | null;
  orders?: number;
  createdAt: string;
}

export type P2pPayoutItemStatus = P2pOrderStatus | "rejected";

export interface P2pPayoutItem {
  index: number;
  orderId: string | null;
  status: P2pPayoutItemStatus;
  currency: string;
  fiatAmount: string;
  rail: string;
  beneficiaryName: string;
  externalReference: string | null;
  error?: string | null;
}

export type P2pPayoutBatchStatus = "processing" | "completed" | "partial" | "failed";

export interface P2pPayoutBatch {
  id: string;
  network: string;
  token: string;
  accountId: string;
  status: P2pPayoutBatchStatus;
  items: P2pPayoutItem[];
  /* How many payouts the batch holds (a list answers without its orders). */
  itemCount: number;
  createdAt: string;
}

/** The webhook events the P2P market sends (the existing webhook system's new types). */
export const P2P_WEBHOOK_EVENTS = [
  "P2P_ORDER_CREATED",
  "P2P_ORDER_ACCEPTED",
  "P2P_ORDER_PAID",
  "P2P_ORDER_COMPLETED",
  "P2P_ORDER_CANCELLED",
  "P2P_ORDER_EXPIRED",
  "P2P_ORDER_DISPUTED",
  "P2P_ORDER_RESOLVED",
  "P2P_ORDER_FAILED",
  "P2P_CHARGE_SUCCEEDED",
  "P2P_PAYOUT_BATCH_COMPLETED",
] as const;
export type P2pWebhookEvent = (typeof P2P_WEBHOOK_EVENTS)[number];

/** The on-chain actions the transaction builder makes (`POST /v1/p2p/transactions`). */
export const P2P_TX_ACTIONS = ["approve", "deposit", "withdraw", "setOperator", "setMatcher", "accept", "markPaid", "release", "cancel", "dispute"] as const;
export type P2pTxAction = (typeof P2P_TX_ACTIONS)[number];
