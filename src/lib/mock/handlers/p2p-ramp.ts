/* The P2P ramps, for the dashboard's On-ramp and Off-ramp views in mock mode: buying any token the
   marketplace lists, on any of its networks, with local money (/api/onramp/p2p, proxied to the
   Payments API's /v1/onramp/p2p) and selling one for it (/api/offramp/p2p, to /v1/offramp/p2p).
   Each side has its market (currencies, networks, the default token), the token search per
   network, a firm quote and the sessions it opened. The market is the marketplace's public one
   recorded in p2p-ramp-market.ts; a session is stored per environment and side with the widget URL
   the real API builds, so opening one in mock mode opens the real hosted window (the sandbox's in
   dev). The checks and messages are the Payments API's.

   The on-ramp side also answers the seller's charges in local money shown as a QR (Fiat > QR
   charges: /api/onramp/p2p/payment-requests, the Payments API's /v1/onramp/p2p/payment-requests),
   kept in src/lib/mock/fiat-requests.ts with the payer page's, so a charge created in the
   dashboard opens on the local payer page and turns paid there. */
import { badRequest, conflict, created, intParam, notFound, ok, route, str, type MockEnv, type MockRoute } from "@/lib/mock/http";
import { mockEnvStore } from "@/lib/mock/store";
import { nowIso } from "@/lib/mock/fixtures";
import { RECORDED_MARKET } from "@/lib/mock/handlers/p2p-ramp-market";
import { cancelFiatRequest, createFiatRequest, getFiatRequest, listFiatRequests } from "@/lib/mock/fiat-requests";
import { getTransferAccount, startTransferAccount, transferAccountApproved } from "@/lib/mock/transfer-account";
import { TRANSFER_ACCOUNT_TYPES, taxIdProblem, transferAccountBody, type TransferAccountType } from "@/lib/transfer-account";
import { DEFAULT_EXPIRY, chargeAmountProblem, descriptionProblem, evmAddressProblem, expiryOk, toChecksumAddress } from "@/lib/qr-charges";

type Side = "buy" | "sell";
interface P2pToken { chainId: number; address: string; symbol: string; decimals: number; priceUsd: string | null; logoUrl: string | null; main: boolean }

const NETWORK_NAMES: Record<number, string> = {
  1: "Ethereum", 10: "Optimism", 56: "BNB Chain", 130: "Unichain", 137: "Polygon", 480: "World Chain", 8453: "Base",
  42161: "Arbitrum", 42220: "Celo", 43114: "Avalanche", 81457: "Blast", 421614: "Arbitrum Sepolia",
};
const DEFAULT_TOKEN: Record<MockEnv, Pick<P2pToken, "chainId" | "address" | "symbol" | "decimals">> = {
  prod: { chainId: 42161, address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT0", decimals: 6 },
  dev: { chainId: 421614, address: "0x25f5D414F85b7f4668ADe4E557ef234023208771", symbol: "USDT", decimals: 18 },
};
const WIDGET: Record<MockEnv, string> = { prod: "https://widget.eldorado.io", dev: "https://widget-testnet.eldorado.io" };
/** USD stablecoins: worth a dollar when the marketplace lists no price (the sandbox's test USDT). */
const USD_STABLE = new Set(["USDT", "USDT0", "USDC", "USDC.e", "DAI", "USDS"]);
const ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const AMOUNT = /^(0|[1-9]\d{0,17})(\.\d{1,18})?$/;

const tokensOf = (env: MockEnv, chainId: number): P2pToken[] =>
  (RECORDED_MARKET[env].tokens[String(chainId)] ?? []).map(([address, symbol, decimals, priceUsd, logoUrl, main]) => ({ chainId, address, symbol, decimals, priceUsd, logoUrl, main }));
const usdOf = (t: P2pToken) => (t.priceUsd !== null ? Number(t.priceUsd) : USD_STABLE.has(t.symbol) ? 1 : null);
const sessions = (env: MockEnv, side: Side) => mockEnvStore<any[]>(`p2p-${side}-sessions`, env, () => []);

/** One side's market, as the Payments API answers it. */
function market(env: MockEnv, side: Side) {
  const rec = RECORDED_MARKET[env];
  const home = DEFAULT_TOKEN[env].chainId;
  return {
    currencies: rec.currencies.flatMap((c) => {
      const pm = c[side];
      return pm ? [{ id: c.id, name: c.name, price: pm[0], minAmount: pm[1], paymentMethods: c.methods }] : [];
    }),
    networks: rec.networks
      .map((n) => ({ chainId: n.chainId, name: NETWORK_NAMES[n.chainId] ?? `Chain ${n.chainId}`, tokenCount: n.tokenCount }))
      .sort((a, b) => Number(b.chainId === home) - Number(a.chainId === home) || b.tokenCount - a.tokenCount),
    defaultToken: DEFAULT_TOKEN[env],
  };
}

/** Rounded down: 2 decimals from 1 up (and always for local money), 6 below. */
const floorTo = (n: number, fiat = false) => {
  const d = fiat || n >= 1 ? 2 : 6;
  return (Math.floor(n * 10 ** d) / 10 ** d).toFixed(d);
};

function readOrder(env: MockEnv, side: Side, body: Record<string, unknown> | null) {
  const order = {
    currency: str(body, "currency") ?? "",
    paymentMethod: str(body, "paymentMethod") ?? "",
    chainId: Number(body?.chainId),
    token: str(body, "token") ?? "",
    amount: str(body, "amount") ?? "",
    address: str(body, "address") ?? "",
  };
  if (!ADDRESS.test(order.address)) return { error: "address must be an EVM address (0x and 40 hex digits)" };
  if (!ADDRESS.test(order.token)) return { error: "token must be a token contract address (0x and 40 hex digits)" };
  if (!AMOUNT.test(order.amount)) return { error: "amount must be a positive decimal string" };
  const m = market(env, side);
  const verb = side === "buy" ? "bought" : "sold";
  const currency = m.currencies.find((c) => c.id === order.currency);
  if (!currency) return { error: `currency ${order.currency} cannot be ${verb} (offered: ${m.currencies.map((c) => c.id).join(", ")})` };
  if (!currency.paymentMethods.some((x) => x.id === order.paymentMethod)) {
    return { error: `paymentMethod ${order.paymentMethod} does not ${side === "buy" ? "pay in" : "pay out"} ${currency.id}` };
  }
  if (!m.networks.some((n) => n.chainId === order.chainId)) return { error: `chainId ${order.chainId} is not offered (offered: ${m.networks.map((n) => n.chainId).join(", ")})` };
  const token = tokensOf(env, order.chainId).find((t) => t.address.toLowerCase() === order.token.toLowerCase());
  const prefix = side === "buy" ? "onramp" : "offramp";
  if (!token) return { error: `token ${order.token} is not offered on chain ${order.chainId}; list them with GET /v1/${prefix}/p2p/tokens?chainId=${order.chainId}` };
  const decimals = (order.amount.split(".")[1] ?? "").length;
  if (side === "buy" && decimals > 2) return { error: "amount must have at most two decimals when buying (local money)" };
  if (side === "sell" && decimals > token.decimals) return { error: `amount must have at most ${token.decimals} decimals for ${token.symbol}` };
  const usd = usdOf(token);
  if (side === "buy" && Number(order.amount) < Number(currency.minAmount)) return { error: `amount is below the minimum of ${currency.minAmount} ${currency.id}` };
  if (side === "sell" && usd !== null && Number(order.amount) * usd < Number(currency.minAmount)) {
    return { error: `amount is below the minimum of ${currency.minAmount} USD (about ${floorTo(Number(currency.minAmount) / usd)} ${token.symbol})` };
  }
  return { order, currency, token, usd };
}

const estimate = (side: Side, amount: string, price: string, usd: number | null) => {
  if (usd === null || !usd) return null;
  return side === "buy" ? floorTo(Number(amount) / Number(price) / usd) : floorTo(Number(amount) * usd * Number(price), true);
};

function sideRoutes(side: Side): MockRoute[] {
  const base = side === "buy" ? "/api/onramp/p2p" : "/api/offramp/p2p";
  return [
    route("GET", `${base}/market`, (req) => ok(market(req.env, side), "OK")),

    route("GET", `${base}/tokens`, (req) => {
      const chainId = Number(req.url.searchParams.get("chainId"));
      const m = market(req.env, side);
      if (!m.networks.some((n) => n.chainId === chainId)) return badRequest(`chainId ${req.url.searchParams.get("chainId")} is not offered (offered: ${m.networks.map((n) => n.chainId).join(", ")})`);
      const q = (req.url.searchParams.get("q") ?? "").trim().toLowerCase();
      const all = tokensOf(req.env, chainId);
      const rows = q ? all.filter((t) => t.symbol.toLowerCase().includes(q) || t.address.toLowerCase() === q) : all;
      const take = intParam(req.url, "take", 100, 200);
      const skip = Math.max(0, Math.trunc(Number(req.url.searchParams.get("skip"))) || 0);
      // The recorded list is each chain's first tokens; the real one has them all.
      const total = q ? rows.length : m.networks.find((n) => n.chainId === chainId)!.tokenCount;
      return ok({ data: rows.slice(skip, skip + take), total, take, skip }, "OK");
    }),

    route("POST", `${base}/quotes`, (req) => {
      const read = readOrder(req.env, side, req.body);
      if ("error" in read) return badRequest(read.error);
      const { order, currency, token, usd } = read;
      // A sample quote: the market price with about 2% of fees, as the marketplace prices it.
      const price = Number(currency.price);
      const u = usd ?? 1;
      const gross = side === "buy" ? Number(order.amount) / price / u : Number(order.amount) * u * price;
      const fee = gross * 0.02;
      const feeToken = side === "buy" ? fee : fee / price / u;
      return created({
        quoteId: `q-${Date.now()}`,
        currency: order.currency,
        token: token.symbol,
        tokenAddress: token.address,
        chainId: order.chainId,
        amountIn: order.amount,
        amountOut: floorTo(gross - fee, side === "sell"),
        minAmountOut: floorTo((gross - fee) * 0.98, side === "sell"),
        exchangeRate: currency.price,
        fee: { amountInToken: floorTo(feeToken), amountInFiat: floorTo(feeToken * u * price, true) },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      }, "Created");
    }),

    route("POST", `${base}/sessions`, (req) => {
      const read = readOrder(req.env, side, req.body);
      if ("error" in read) return badRequest(read.error);
      const { order, currency, token, usd } = read;
      const list = sessions(req.env, side);
      const id = `clzp2p${side === "buy" ? "b" : "s"}${String(list.length + 1).padStart(4, "0")}`;
      const reference = `cp-${crypto.randomUUID()}`;
      const url = new URL("/exchange", WIDGET[req.env]);
      for (const [k, v] of Object.entries({
        operation: side === "buy" ? "BUY" : "SELL", token: token.address, chain: String(order.chainId), currency: order.currency,
        paymentMethod: order.paymentMethod, amount: order.amount,
        // Only a purchase fixes the account: a seller connects the wallet that sends.
        ...(side === "buy" ? { address: order.address } : {}),
        externalReferenceId: reference,
      })) url.searchParams.set(k, v);
      const session = {
        id, side, network: req.env === "prod" ? "public" : "testnet", currency: currency.id, paymentMethod: order.paymentMethod,
        amount: order.amount, token: token.symbol, tokenAddress: token.address, chainId: order.chainId, address: order.address,
        estimatedAmountOut: estimate(side, order.amount, currency.price, usd), reference, widgetUrl: url.toString(), createdAt: nowIso(),
      };
      list.unshift(session);
      return created(session, "Created");
    }),

    route("GET", `${base}/sessions`, (req) => {
      const list = sessions(req.env, side);
      const take = intParam(req.url, "take", 100, 100);
      const skip = Math.max(0, Math.trunc(Number(req.url.searchParams.get("skip"))) || 0);
      return ok({ data: list.slice(skip, skip + take), total: list.length, take, skip }, "OK");
    }),

    route("GET", `${base}/sessions/:id`, (req) => {
      const s = sessions(req.env, side).find((x) => x.id === req.params.id);
      return s ? ok(s, "OK") : notFound(side === "buy" ? "P2P on-ramp session not found" : "P2P off-ramp session not found");
    }),
  ];
}

/* ---- charges in local money shown as a QR (the on-ramp's payment requests) ---- */

/** The create body checked as the Payments API checks it: the terms of a purchase against the live
    market (currency, amount in local money with two decimals at most and at least the currency's
    minimum, network, token), the seller's EVM address, an optional one-line description and the
    minutes it can be paid (5 to 43200, a day by default). */
function readCharge(env: MockEnv, body: Record<string, unknown> | null) {
  const terms = {
    currency: str(body, "currency") ?? "",
    amount: typeof body?.amount === "string" ? body.amount : "",
    chainId: Number(body?.chainId),
    token: str(body, "token") ?? "",
    address: str(body, "address") ?? "",
  };
  if (evmAddressProblem(terms.address) !== null) return { error: "address must be an EVM address (0x and 40 hex digits, EIP-55 when mixed case)" };
  if (!ADDRESS.test(terms.token)) return { error: "token must be a token contract address (0x and 40 hex digits)" };
  const m = market(env, "buy");
  const currency = m.currencies.find((c) => c.id === terms.currency);
  if (!currency) return { error: `currency ${terms.currency} cannot be bought (offered: ${m.currencies.map((c) => c.id).join(", ")})` };
  const amountProblem = chargeAmountProblem(terms.amount, currency.minAmount);
  if (amountProblem === "empty" || amountProblem === "shape") return { error: "amount must be a positive decimal string with at most two decimals (local money)" };
  if (amountProblem === "min") return { error: `amount is below the minimum of ${currency.minAmount} ${currency.id}` };
  if (!m.networks.some((n) => n.chainId === terms.chainId)) return { error: `chainId ${terms.chainId} is not offered (offered: ${m.networks.map((n) => n.chainId).join(", ")})` };
  const token = tokensOf(env, terms.chainId).find((t) => t.address.toLowerCase() === terms.token.toLowerCase());
  if (!token) return { error: `token ${terms.token} is not offered on chain ${terms.chainId}; list them with GET /v1/onramp/p2p/tokens?chainId=${terms.chainId}` };
  let description: string | null = null;
  if (body?.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string" || !body.description.trim() || descriptionProblem(body.description) !== null) {
      return { error: "description must be one line of 1 to 140 characters, without control or bidirectional characters" };
    }
    description = body.description.trim();
  }
  const expires = body?.expiresInMinutes === undefined ? DEFAULT_EXPIRY : body.expiresInMinutes;
  if (!expiryOk(expires)) return { error: "expiresInMinutes must be an integer from 5 to 43200" };
  return { terms, currency, token, description, expiresInMinutes: expires as number };
}

const CHARGES = "/api/onramp/p2p/payment-requests";

const chargeRoutes: MockRoute[] = [
  route("GET", CHARGES, (req) => {
    const list = listFiatRequests(req.env);
    const take = intParam(req.url, "take", 100, 100);
    const skip = Math.max(0, Math.trunc(Number(req.url.searchParams.get("skip"))) || 0);
    return ok({ data: list.slice(skip, skip + take), total: list.length, take, skip }, "OK");
  }),

  route("POST", CHARGES, (req) => {
    const read = readCharge(req.env, req.body);
    if ("error" in read) return badRequest(read.error);
    const { terms, currency, token, description, expiresInMinutes } = read;
    return created(createFiatRequest(req.env, {
      currency: currency.id,
      amount: terms.amount,
      chainId: terms.chainId,
      token: token.symbol,
      tokenAddress: token.address,
      tokenDecimals: token.decimals,
      address: toChecksumAddress(terms.address),
      description,
      estimatedAmountOut: estimate("buy", terms.amount, currency.price, usdOf(token)),
      paymentMethods: currency.paymentMethods,
      expiresInMinutes,
      transferAccount: transferAccountApproved(req.env, req.org),
    }), "Created");
  }),

  route("GET", `${CHARGES}/:id`, (req) => {
    const charge = getFiatRequest(req.env, req.params.id);
    return charge ? ok(charge, "OK") : notFound("Payment request not found");
  }),

  route("POST", `${CHARGES}/:id/cancel`, (req) => {
    const done = cancelFiatRequest(req.env, req.params.id);
    if ("charge" in done) return ok(done.charge, "OK");
    return done.error === "not_found" ? notFound("Payment request not found") : conflict("The payment request is closed");
  }),
];

/* The organization's bank-transfer account (`/v1/onramp/transfer/account`): read it, or activate it
   (src/lib/mock/transfer-account.ts). Refused as the server refuses: a tax id that is not a CUIT/CUIL
   for that kind of holder, another field the provider would not take, an account already under way. */
const TRANSFER_ACCOUNT = "/api/onramp/transfer/account";

const transferAccountRoutes: MockRoute[] = [
  route("GET", TRANSFER_ACCOUNT, (req) => ok(getTransferAccount(req.env, req.org), "OK")),

  route("POST", TRANSFER_ACCOUNT, (req) => {
    const b = req.body ?? {};
    const text = (k: string) => (typeof b[k] === "string" ? (b[k] as string) : "");
    const type = TRANSFER_ACCOUNT_TYPES.includes(b.type as TransferAccountType) ? (b.type as TransferAccountType) : null;
    if (!type) return badRequest("type must be person or company");
    if (taxIdProblem(text("taxId"), type) !== null) return badRequest("invalid_tax_id: taxId must be a valid CUIT/CUIL (companies: a CUIT)");
    const body = transferAccountBody({
      type, name: text("name"), taxId: text("taxId"), email: text("email"), phone: text("phone"),
      address: text("address"), city: text("city"), postalCode: text("postalCode"), dateOfBirth: text("dateOfBirth"),
    });
    if (!body) return badRequest("name, email, phone, address, city, postalCode and, for a person, dateOfBirth are required");
    const done = startTransferAccount(req.env, req.org, body);
    return "account" in done ? created(done.account, "Created") : conflict("account_exists: a bank-transfer account is already under way");
  }),
];

export const routes: MockRoute[] = [...sideRoutes("buy"), ...sideRoutes("sell"), ...chargeRoutes, ...transferAccountRoutes];
