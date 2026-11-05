/* The P2P on-ramp (/api/onramp/p2p, proxied to the Payments API's /v1/onramp/p2p): the market,
   a firm quote and the purchase sessions, for the dashboard's P2P on-ramp view in mock mode.
   The market is a trimmed copy of the marketplace's public answer (2026-11-05); a session is
   stored per environment with the widget URL the real API builds, so opening one in mock mode
   opens the real hosted purchase (the sandbox's in dev). */
import { badRequest, created, notFound, ok, page, route, str, type MockEnv, type MockRoute } from "@/lib/mock/http";
import { mockEnvStore } from "@/lib/mock/store";
import { nowIso } from "@/lib/mock/fixtures";

interface P2pToken { symbol: string; address: string; decimals: number }
interface P2pCurrency { id: string; name: string; price: string; minAmount: string; paymentMethods: { id: string; name: string }[] }

const HOSTS: Record<MockEnv, { widget: string; chainId: number; chain: string; tokens: P2pToken[]; currencies: P2pCurrency[] }> = {
  prod: {
    widget: "https://widget.eldorado.io",
    chainId: 42161,
    chain: "arbitrum",
    tokens: [
      { symbol: "USDC", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
      { symbol: "USDT", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6 },
    ],
    currencies: [
      { id: "ARS", name: "Argentine Pesos", price: "1677.89", minAmount: "8389.45", paymentMethods: [{ id: "bank_tx_ar", name: "Bank Transfer (ARS)" }] },
      { id: "COP", name: "Colombian Pesos", price: "3240", minAmount: "16200", paymentMethods: [{ id: "bank_bancolombia", name: "Bancolombia (COP)" }, { id: "app_nequi_co", name: "Nequi (COP)" }] },
      { id: "BRL", name: "Brazilian Reais", price: "6.003", minAmount: "30.015", paymentMethods: [{ id: "app_pix_brl", name: "PIX" }] },
      { id: "USD", name: "US Dollars", price: "1.09", minAmount: "5.45", paymentMethods: [{ id: "app_zelle", name: "Zelle" }, { id: "app_paypal", name: "PayPal" }] },
      { id: "PEN", name: "Peruvian Soles", price: "3.56", minAmount: "17.8", paymentMethods: [{ id: "app_yape_pe", name: "Yape" }, { id: "app_plin_pe", name: "Plin" }] },
    ],
  },
  dev: {
    widget: "https://widget-testnet.eldorado.io",
    chainId: 421614,
    chain: "arbitrum-sepolia",
    tokens: [{ symbol: "USDT", address: "0x25f5D414F85b7f4668ADe4E557ef234023208771", decimals: 18 }],
    currencies: [
      { id: "ARS", name: "Argentine Pesos", price: "990.86", minAmount: "4954.30", paymentMethods: [{ id: "bank_tx_ar", name: "Bank Transfer (ARS)" }] },
      { id: "BRL", name: "Brazilian Reais", price: "12", minAmount: "60", paymentMethods: [{ id: "app_pix_brl", name: "PIX" }] },
      { id: "USD", name: "US Dollars", price: "1", minAmount: "5", paymentMethods: [{ id: "app_zelle", name: "Zelle" }] },
    ],
  },
};

interface P2pSession {
  id: string; network: string; currency: string; paymentMethod: string; amount: string; token: string;
  tokenAddress: string; chainId: number; address: string; estimatedAmountOut: string; reference: string;
  widgetUrl: string; createdAt: string;
}

const sessions = (env: MockEnv) => mockEnvStore<P2pSession[]>("p2p-onramp-sessions", env, () => []);

const market = (env: MockEnv) => {
  const h = HOSTS[env];
  return { chainId: h.chainId, chain: h.chain, tokens: h.tokens, currencies: h.currencies };
};

/** The same checks the Payments API runs, with its messages. */
function readOrder(env: MockEnv, body: Record<string, unknown> | null) {
  const order = {
    currency: str(body, "currency") ?? "",
    paymentMethod: str(body, "paymentMethod") ?? "",
    token: str(body, "token") ?? "",
    amount: str(body, "amount") ?? "",
    address: str(body, "address") ?? "",
  };
  if (!/^0x[a-fA-F0-9]{40}$/.test(order.address)) return { error: "address must be an EVM address (0x and 40 hex digits)" };
  if (!/^(0|[1-9]\d{0,14})(\.\d{1,2})?$/.test(order.amount)) return { error: "amount must be a decimal string with at most two decimals" };
  const h = HOSTS[env];
  const currency = h.currencies.find((c) => c.id === order.currency);
  if (!currency) return { error: `currency ${order.currency} cannot be bought (offered: ${h.currencies.map((c) => c.id).join(", ")})` };
  if (!currency.paymentMethods.some((m) => m.id === order.paymentMethod)) return { error: `paymentMethod ${order.paymentMethod} does not pay in ${currency.id}` };
  const token = h.tokens.find((t) => t.symbol === order.token);
  if (!token) return { error: `token ${order.token} is not delivered on this network (offered: ${h.tokens.map((t) => t.symbol).join(", ")})` };
  if (Number(order.amount) < Number(currency.minAmount)) return { error: `amount is below the minimum of ${currency.minAmount} ${currency.id}` };
  return { order, currency, token };
}

const estimate = (amount: string, price: string) => (Math.floor((Number(amount) / Number(price)) * 100) / 100).toFixed(2);

export const routes: MockRoute[] = [
  route("GET", "/api/onramp/p2p/market", (req) => ok(market(req.env), "OK")),

  route("POST", "/api/onramp/p2p/quotes", (req) => {
    const read = readOrder(req.env, req.body);
    if ("error" in read) return badRequest(read.error);
    const { order, currency } = read;
    // A sample quote: the market price with about 2% of fees, as the marketplace prices it.
    const gross = Number(order.amount) / Number(currency.price);
    const fee = gross * 0.02;
    return created({
      quoteId: `q-${Date.now()}`,
      currency: order.currency,
      token: order.token,
      chainId: HOSTS[req.env].chainId,
      amountIn: order.amount,
      amountOut: (gross - fee).toFixed(2),
      minAmountOut: ((gross - fee) * 0.98).toFixed(2),
      exchangeRate: currency.price,
      fee: { amountInToken: fee.toFixed(2), amountInFiat: (fee * Number(currency.price)).toFixed(2) },
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    }, "Created");
  }),

  route("POST", "/api/onramp/p2p/sessions", (req) => {
    const read = readOrder(req.env, req.body);
    if ("error" in read) return badRequest(read.error);
    const { order, currency, token } = read;
    const h = HOSTS[req.env];
    const list = sessions(req.env);
    const id = `clzp2p${String(list.length + 1).padStart(4, "0")}`;
    const reference = `cp-${crypto.randomUUID()}`;
    const url = new URL("/exchange", h.widget);
    for (const [k, v] of Object.entries({
      operation: "BUY", token: token.address, chain: String(h.chainId), currency: order.currency,
      paymentMethod: order.paymentMethod, amount: order.amount, address: order.address, externalReferenceId: reference,
    })) url.searchParams.set(k, v);
    const session: P2pSession = {
      id, network: req.env === "prod" ? "public" : "testnet", currency: currency.id, paymentMethod: order.paymentMethod,
      amount: order.amount, token: token.symbol, tokenAddress: token.address, chainId: h.chainId, address: order.address,
      estimatedAmountOut: estimate(order.amount, currency.price), reference, widgetUrl: url.toString(), createdAt: nowIso(),
    };
    list.unshift(session);
    return created(session, "Created");
  }),

  route("GET", "/api/onramp/p2p/sessions", (req) => ok(page(sessions(req.env), req.url, 100), "OK")),

  route("GET", "/api/onramp/p2p/sessions/:id", (req) => {
    const s = sessions(req.env).find((x) => x.id === req.params.id);
    return s ? ok(s, "OK") : notFound("P2P on-ramp session not found");
  }),
];
