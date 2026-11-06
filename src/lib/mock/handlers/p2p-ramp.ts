/* The P2P ramps, for the dashboard's On-ramp and Off-ramp views in mock mode: buying stablecoins
   with local money (/api/onramp/p2p, proxied to the Payments API's /v1/onramp/p2p) and selling them
   for it (/api/offramp/p2p, to /v1/offramp/p2p). Each side has its market, a firm quote and the
   sessions it opened. The markets are trimmed copies of the marketplace's public answers
   (2026-11-05); a session is stored per environment and side with the widget URL the real API
   builds, so opening one in mock mode opens the real hosted window (the sandbox's in dev). */
import { badRequest, created, notFound, ok, page, route, str, type MockEnv, type MockRoute } from "@/lib/mock/http";
import { mockEnvStore } from "@/lib/mock/store";
import { nowIso } from "@/lib/mock/fixtures";

type Side = "buy" | "sell";
interface P2pToken { symbol: string; address: string; decimals: number }
interface P2pMethod { id: string; name: string }
interface P2pCurrency { id: string; name: string; price: string; minAmount: string; paymentMethods: P2pMethod[] }
/** A recorded currency: both sides' price and minimum (buy: local money; sell: stablecoin). */
interface Recorded { id: string; name: string; buy?: [string, string]; sell?: [string, string]; methods: P2pMethod[] }

const METHODS: Record<string, P2pMethod[]> = {
  ARS: [{ id: "bank_tx_ar", name: "CVU/CBU o Alias (ARS)" }],
  COP: [{ id: "bank_bancolombia", name: "Bancolombia (COP)" }, { id: "app_nequi_co", name: "Nequi (COP)" }, { id: "app_llave_co", name: "Llave Bre-B (COP)" }],
  BRL: [{ id: "app_pix_brl", name: "PIX (BRL)" }],
  USD: [{ id: "app_zelle", name: "Zelle (USD)" }, { id: "app_paypal", name: "Paypal (USD)" }, { id: "app_zinli_us", name: "Zinli (USD)" }],
  PEN: [{ id: "app_yape_pe", name: "Yape (PEN)" }, { id: "app_plin_pe", name: "Plin (PEN)" }, { id: "bank_creditbank_pe", name: "Banco de Crédito del Perú (PEN)" }],
};

const HOSTS: Record<MockEnv, { widget: string; chainId: number; chain: string; tokens: P2pToken[]; currencies: Recorded[] }> = {
  prod: {
    widget: "https://widget.eldorado.io",
    chainId: 42161,
    chain: "arbitrum",
    tokens: [
      { symbol: "USDC", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
      { symbol: "USDT", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6 },
    ],
    currencies: [
      { id: "ARS", name: "Argentine Pesos", buy: ["1676.45", "8382.25"], sell: ["1625.11", "5"], methods: METHODS.ARS },
      { id: "BRL", name: "Reals", buy: ["6.003", "30.015"], sell: ["4.88", "5"], methods: METHODS.BRL },
      { id: "COP", name: "Colombian Pesos", buy: ["3240", "16200"], sell: ["3144.005", "5"], methods: METHODS.COP },
      { id: "PEN", name: "Soles", buy: ["3.555", "17.775"], sell: ["3.4115", "5"], methods: METHODS.PEN },
      { id: "USD", name: "Dollars", buy: ["1.09", "5.45"], sell: ["0.977", "5"], methods: METHODS.USD },
    ],
  },
  dev: {
    widget: "https://widget-testnet.eldorado.io",
    chainId: 421614,
    chain: "arbitrum-sepolia",
    tokens: [{ symbol: "USDT", address: "0x25f5D414F85b7f4668ADe4E557ef234023208771", decimals: 18 }],
    currencies: [
      { id: "ARS", name: "Argentine Pesos", buy: ["990.86", "4954.30"], sell: ["1000", "5"], methods: METHODS.ARS },
      { id: "BRL", name: "Reals", buy: ["12", "60"], sell: ["5.646123", "5"], methods: METHODS.BRL },
      { id: "COP", name: "Colombian Pesos", buy: ["12", "60"], sell: ["4344.0705", "5"], methods: METHODS.COP },
      // The sandbox lists no buy price for PEN: it can only be sold there.
      { id: "PEN", name: "Soles", sell: ["4.248101", "5"], methods: METHODS.PEN },
      { id: "USD", name: "Dollars", buy: ["1", "5"], sell: ["1", "5"], methods: METHODS.USD },
    ],
  },
};

interface P2pSession {
  id: string; side: Side; network: string; currency: string; paymentMethod: string; amount: string; token: string;
  tokenAddress: string; chainId: number; address: string; estimatedAmountOut: string; reference: string;
  widgetUrl: string; createdAt: string;
}

const sessions = (env: MockEnv, side: Side) => mockEnvStore<P2pSession[]>(`p2p-${side}-sessions`, env, () => []);

/** One side's market, as the Payments API answers it: only the currencies with a price on that side. */
function market(env: MockEnv, side: Side) {
  const h = HOSTS[env];
  const currencies: P2pCurrency[] = h.currencies.flatMap((c) => {
    const pm = c[side];
    return pm ? [{ id: c.id, name: c.name, price: pm[0], minAmount: pm[1], paymentMethods: c.methods }] : [];
  });
  return { chainId: h.chainId, chain: h.chain, tokens: h.tokens, currencies };
}

/** The same checks the Payments API runs, with its messages. */
function readOrder(env: MockEnv, side: Side, body: Record<string, unknown> | null) {
  const order = {
    currency: str(body, "currency") ?? "",
    paymentMethod: str(body, "paymentMethod") ?? "",
    token: str(body, "token") ?? "",
    amount: str(body, "amount") ?? "",
    address: str(body, "address") ?? "",
  };
  if (!/^0x[a-fA-F0-9]{40}$/.test(order.address)) return { error: "address must be an EVM address (0x and 40 hex digits)" };
  if (!/^(0|[1-9]\d{0,14})(\.\d{1,2})?$/.test(order.amount)) return { error: "amount must be a decimal string with at most two decimals" };
  const m = market(env, side);
  const verb = side === "buy" ? "bought" : "sold";
  const currency = m.currencies.find((c) => c.id === order.currency);
  if (!currency) return { error: `currency ${order.currency} cannot be ${verb} (offered: ${m.currencies.map((c) => c.id).join(", ")})` };
  if (!currency.paymentMethods.some((x) => x.id === order.paymentMethod)) return { error: `paymentMethod ${order.paymentMethod} does not pay in ${currency.id}` };
  const token = m.tokens.find((t) => t.symbol === order.token);
  if (!token) return { error: `token ${order.token} is not delivered on this network (offered: ${m.tokens.map((t) => t.symbol).join(", ")})` };
  if (Number(order.amount) < Number(currency.minAmount)) {
    return { error: `amount is below the minimum of ${currency.minAmount} ${side === "buy" ? currency.id : token.symbol}` };
  }
  return { order, currency, token };
}

/** What the order is about worth at the market price, rounded down to the cent. */
const estimate = (side: Side, amount: string, price: string) => {
  const out = side === "buy" ? Number(amount) / Number(price) : Number(amount) * Number(price);
  return (Math.floor(out * 100) / 100).toFixed(2);
};

function sideRoutes(side: Side): MockRoute[] {
  const base = side === "buy" ? "/api/onramp/p2p" : "/api/offramp/p2p";
  return [
    route("GET", `${base}/market`, (req) => ok(market(req.env, side), "OK")),

    route("POST", `${base}/quotes`, (req) => {
      const read = readOrder(req.env, side, req.body);
      if ("error" in read) return badRequest(read.error);
      const { order, currency } = read;
      // A sample quote: the market price with about 2% of fees, as the marketplace prices it.
      const price = Number(currency.price);
      const gross = side === "buy" ? Number(order.amount) / price : Number(order.amount) * price;
      const fee = gross * 0.02;
      const feeToken = side === "buy" ? fee : fee / price;
      return created({
        quoteId: `q-${Date.now()}`,
        currency: order.currency,
        token: order.token,
        chainId: HOSTS[req.env].chainId,
        amountIn: order.amount,
        amountOut: (gross - fee).toFixed(2),
        minAmountOut: ((gross - fee) * 0.98).toFixed(2),
        exchangeRate: currency.price,
        fee: { amountInToken: feeToken.toFixed(2), amountInFiat: (feeToken * price).toFixed(2) },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      }, "Created");
    }),

    route("POST", `${base}/sessions`, (req) => {
      const read = readOrder(req.env, side, req.body);
      if ("error" in read) return badRequest(read.error);
      const { order, currency, token } = read;
      const h = HOSTS[req.env];
      const list = sessions(req.env, side);
      const id = `clzp2p${side === "buy" ? "b" : "s"}${String(list.length + 1).padStart(4, "0")}`;
      const reference = `cp-${crypto.randomUUID()}`;
      const url = new URL("/exchange", h.widget);
      for (const [k, v] of Object.entries({
        operation: side === "buy" ? "BUY" : "SELL", token: token.address, chain: String(h.chainId), currency: order.currency,
        paymentMethod: order.paymentMethod, amount: order.amount,
        // Only a purchase fixes the account: a seller connects the wallet that sends.
        ...(side === "buy" ? { address: order.address } : {}),
        externalReferenceId: reference,
      })) url.searchParams.set(k, v);
      const session: P2pSession = {
        id, side, network: req.env === "prod" ? "public" : "testnet", currency: currency.id, paymentMethod: order.paymentMethod,
        amount: order.amount, token: token.symbol, tokenAddress: token.address, chainId: h.chainId, address: order.address,
        estimatedAmountOut: estimate(side, order.amount, currency.price), reference, widgetUrl: url.toString(), createdAt: nowIso(),
      };
      list.unshift(session);
      return created(session, "Created");
    }),

    route("GET", `${base}/sessions`, (req) => ok(page(sessions(req.env, side), req.url, 100), "OK")),

    route("GET", `${base}/sessions/:id`, (req) => {
      const s = sessions(req.env, side).find((x) => x.id === req.params.id);
      return s ? ok(s, "OK") : notFound(side === "buy" ? "P2P on-ramp session not found" : "P2P off-ramp session not found");
    }),
  ];
}

export const routes: MockRoute[] = [...sideRoutes("buy"), ...sideRoutes("sell")];
