/* The public P2P app (payments.cosmospay.lat/p2p, "like p2p.me"): buy USDC with local money or sell
   it for local money, with no account. The visitor connects an EVM wallet (every wallet the browser
   announces, EIP-6963) and signs one message that binds this tab's session to it; the page then
   talks only to its own server route (/p2p/api/*, src/lib/p2p/app-api.ts), which holds Cosmos
   Pay's integrator key. Cosmos Pay picks the merchant: the visitor types an amount and gets one
   price.

   The form is the swap widget's (product owner: "take the swap as the example"): Buy / Sell tabs,
   the two wells (local money with its flag, the token with its network), the price with the
   merchant, its fee and how long it holds, the payment method, and one button that says what is
   missing. Then who pays (a purchase) or the account the money goes to (a sale), then the order
   (P2pOrderPanel.tsx), kept in the address (?order=<id>) so a reload follows it. The wallet's
   orders are listed under it. */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { fmt, initLang, useLang, useT } from "@/lib/i18n/index";
import { Modal } from "@/components/cosmos/shared";
import { Select } from "@/components/cosmos/dashboard/components/Select";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { Sk } from "@/components/cosmos/dashboard/components/Skeleton";
import { StatusIcon } from "@/components/cosmos/dashboard/components/StatusIcon";
import { TokenMark } from "@/components/cosmos/dashboard/components/TokenMark";
import { CurrencyMark } from "@/components/cosmos/dashboard/components/RampWidget";
import { WalletSign } from "@/components/cosmos/dashboard/components/WalletSign";
import { DI } from "@/components/cosmos/dashboard/icons";
import { AppApiError, appApi, type AppSessionInfo } from "@/lib/p2p/app-api";
import { checkAccount, checkEmail, checkHolderName, checkPayerDocument, fiatDecimals, isRailId, normalizeDetails, RAILS, type FieldError } from "@/lib/p2p/rails";
import { parseDecimal } from "@/lib/p2p/amounts";
import { orderTone } from "@/lib/p2p/orders";
import type { P2pMarket, P2pNetwork, P2pOrder, P2pQuote, P2pSide, P2pToken } from "@/lib/p2p/types";
import { P2pOrderPanel } from "@/components/cosmos/p2p/P2pOrderPanel";
import { AccountFields, NBSP, currencyName, emptyAccount, errorText, money, shortAddress, timeLeft, units, useNow, type AccountDraft } from "@/components/cosmos/p2p/p2p-ui";

type Step = "form" | "details";
type QuoteState = { status: "idle" | "loading" | "ready" | "error"; key: string; data: P2pQuote | null };

const ORDER_PARAM = "order";
const orderFromUrl = () => {
  try { return new URLSearchParams(window.location.search).get(ORDER_PARAM); } catch { return null; }
};
const setOrderUrl = (id: string | null, push: boolean) => {
  try {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set(ORDER_PARAM, id); else url.searchParams.delete(ORDER_PARAM);
    window.history[push ? "pushState" : "replaceState"](window.history.state, "", url);
  } catch { /* an address the browser will not change: the order stays on screen */ }
};
const hexOf = (text: string) => `0x${[...new TextEncoder().encode(text)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;

export default function P2pApp({ lang }: { lang: string }) {
  initLang(lang);
  const t = useT();
  const L = useLang();
  const a = (t.p2pPublic as any).app;
  const p = t.p2p as any;
  const api = useRef(appApi()).current;

  // undefined while it loads, null when the session is not there.
  const [session, setSession] = useState<AppSessionInfo | null | undefined>(undefined);
  const [market, setMarket] = useState<P2pMarket | null | undefined>(undefined);
  const [unavailable, setUnavailable] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [notice, setNotice] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [history, setHistory] = useState<P2pOrder[] | null | undefined>(undefined);

  const sessionEnded = useCallback(() => { setSession(null); setNotice(a.wallet.expired); }, [a]);

  const loadMarket = useCallback(() => {
    setMarket(undefined);
    api.market()
      .then((m) => { setMarket(m); setUnavailable(false); })
      .catch((e) => { setUnavailable(e instanceof AppApiError && e.status === 503); setMarket(null); });
  }, [api]);

  // Who is signed in (the cookie is HttpOnly, so the server says), then the market.
  useEffect(() => {
    setOrderId(orderFromUrl());
    api.session()
      .then((s) => setSession(s))
      .catch((e) => { setSession(null); if (e instanceof AppApiError && e.status === 503) setUnavailable(true); });
    const onPop = () => setOrderId(orderFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [api]);
  // The market is public: it shows before a wallet is connected (a price needs the wallet).
  useEffect(() => { loadMarket(); }, [loadMarket]);

  const loadHistory = useCallback(() => {
    if (!session) { setHistory(undefined); return; }
    api.orders().then(setHistory).catch((e) => { if (e instanceof AppApiError && e.status === 401) sessionEnded(); else setHistory(null); });
  }, [api, session, sessionEnded]);
  useEffect(loadHistory, [loadHistory, orderId]);

  const openOrder = (id: string | null, push = true) => { setOrderId(id); setOrderUrl(id, push); };

  /* Sign in: the wallet signs the server's challenge (EIP-191); the cookie that comes back binds
     this browser to that address. */
  const signIn = async (wallet, address: string, progress: (s: string) => void) => {
    if (wallet.ecosystem !== "evm") return;
    const ch = await api.challenge(address);
    progress(fmt(a.wallet.signing, { wallet: wallet.name }));
    const signature = String(await wallet.provider.request({ method: "personal_sign", params: [hexOf(ch.message), address] }));
    progress(a.wallet.checking);
    const s = await api.signIn(ch.id, signature);
    setSession(s);
    setNotice("");
    setConnecting(false);
  };
  const signOut = () => { api.signOut().catch(() => {}); setSession(null); setHistory(undefined); openOrder(null, false); };

  const networksCount = market?.networks.length ?? 0;

  return (
    <div className="pswap p2pa">
      <section className="pswap-hero wrap has-head" aria-labelledby="p2pa-title">
        <div className="pswap-head">
          <h1 id="p2pa-title" className="pswap-title">{a.title}</h1>
          <p className="pswap-lede">{a.lede}</p>
        </div>
        <div className="pswap-widget">
          {session && (
            <div className="p2pa-wallet">
              <span className="p2pa-wallet-l">{a.wallet.connected}</span>
              <code title={session.address}>{shortAddress(session.address)}</code>
              <button type="button" className="p2pa-link" onClick={signOut}>{a.wallet.signOut}</button>
            </div>
          )}
          {session && orderId && market
            ? <P2pOrderPanel key={orderId} id={orderId} address={session.address} market={market} onNew={() => openOrder(null)} onSessionEnded={sessionEnded} onStatus={loadHistory} />
            : (
              <P2pForm
                market={market} session={session ?? null} unavailable={unavailable} onRetry={loadMarket}
                onConnect={() => setConnecting(true)} onOpened={(o) => openOrder(o.id)} onSessionEnded={sessionEnded}
              />
            )}
          {notice && <p className="swap-hint is-error" role="alert">{notice}</p>}
        </div>
        <div className="pswap-copy">
          <ul className="pswap-facts" role="list">
            <li><b>{a.facts.walletTitle}</b><span>{a.facts.walletBody}</span></li>
            <li><b>{a.facts.protectedTitle}</b><span>{a.facts.protectedBody}</span></li>
            <li><b>{a.facts.merchantsTitle}</b><span>{a.facts.merchantsBody}</span></li>
            {networksCount > 0 && <li><b>{networksCount === 1 ? a.facts.networksOne : fmt(a.facts.networksTitle, { n: networksCount })}</b><span>{a.facts.networksBody}</span></li>}
          </ul>
        </div>
      </section>

      {session && (
        <section className="wrap p2pa-history" aria-labelledby="p2pa-hist-h">
          <h2 id="p2pa-hist-h">{a.history.title}</h2>
          {history === undefined && <div className="p2pa-hist-sk" aria-busy="true">{[0, 1, 2].map((i) => <Sk key={i} w={`${70 - i * 12}%`} />)}</div>}
          {history === null && <p className="swap-hint is-error" role="alert">{a.history.loadError}</p>}
          {history && history.length > 0 && (
            <ul className="p2pa-hist" role="list" aria-label={a.history.label}>
              {history.map((o) => {
                const buy = o.kind === "BUY";
                const tone = orderTone(o.status);
                return (
                  <li key={o.id}>
                    <button type="button" className={`p2pa-hist-row${o.id === orderId ? " on" : ""}`} onClick={() => openOrder(o.id)} aria-label={fmt(a.history.open, { id: o.id.slice(0, 8) })}>
                      <TokenMark symbol={o.token} chain={o.network} chainName={market?.networks.find((n) => n.id === o.network)?.name ?? o.network} size={30} />
                      <span className="p2pa-hist-main">
                        <b>{p.kinds[o.kind]} · {buy ? units(L, o.tokenAmount, o.token) : money(L, o.fiatAmount, o.currency)}</b>
                        <span>{buy ? money(L, o.fiatAmount, o.currency) : units(L, o.tokenAmount, o.token)} · {new Date(o.createdAt).toLocaleString(L, { dateStyle: "medium", timeStyle: "short" })}</span>
                      </span>
                      <span className={`pill-st ${tone === "ok" ? "ok" : tone === "fail" ? "fail" : tone === "off" ? "ref" : "pend"}`}><StatusIcon tone={tone} size={16} />{p.status[o.status] ?? o.status}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {connecting && (
        <Modal onClose={() => setConnecting(false)} label={a.wallet.title}>
          <div className="modal-body p2pa-connect">
            <h3>{a.wallet.title}</h3>
            <p className="p2pa-muted">{a.wallet.body}</p>
            <ConnectWallets onUse={signIn} none={a.wallet.none} title={a.wallet.signWith} />
          </div>
        </Modal>
      )}
    </div>
  );
}

/* The wallet list for signing in, or a line saying none was found (WalletSign draws nothing then). */
function ConnectWallets({ onUse, none, title }: { onUse: (w: any, address: string, progress: (s: string) => void) => Promise<void>; none: string; title: string }) {
  const [found, setFound] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    import("@/lib/wallets/find").then(({ findWallets }) => findWallets("evm")).then((list) => { if (alive) setFound(list.length > 0); }).catch(() => { if (alive) setFound(false); });
    return () => { alive = false; };
  }, []);
  if (found === false) return <p className="swap-hint is-error" role="alert">{none}</p>;
  return <WalletSign ecosystem="evm" chainName="EVM" title={title} onUse={onUse} />;
}

/* --- The form: what to buy or sell, the price, then who pays or where the money goes. --- */

function P2pForm({ market, session, unavailable, onRetry, onConnect, onOpened, onSessionEnded }: {
  market: P2pMarket | null | undefined;
  session: AppSessionInfo | null;
  unavailable: boolean;
  onRetry: () => void;
  onConnect: () => void;
  onOpened: (o: P2pOrder) => void;
  onSessionEnded: () => void;
}) {
  const t = useT();
  const L = useLang();
  const a = (t.p2pPublic as any).app;
  const p = t.p2p as any;
  const api = useRef(appApi()).current;
  const [side, setSide] = useState<P2pSide>("BUY");
  const [currency, setCurrency] = useState("");
  const [rail, setRail] = useState("");
  const [pick, setPick] = useState<{ network: string; token: string } | null>(null);
  const [amount, setAmount] = useState("");
  const [picker, setPicker] = useState<null | "currency" | "token">(null);
  const [details, setDetails] = useState(false);
  const [inverse, setInverse] = useState(false);
  const [quote, setQuote] = useState<QuoteState>({ status: "idle", key: "", data: null });
  const [step, setStep] = useState<Step>("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [payer, setPayer] = useState({ name: "", document: "", email: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [account, setAccount] = useState<AccountDraft>(emptyAccount(""));

  // Defaults once the market is in: pesos when they are offered, the first network's first token.
  useEffect(() => {
    if (!market) return;
    setCurrency((c) => (market.currencies.some((x) => x.code === c) ? c : (market.currencies.find((x) => x.code === "ARS") ?? market.currencies[0])?.code ?? ""));
    setPick((k) => (k && market.networks.some((n) => n.id === k.network && n.tokens.some((tk) => tk.symbol === k.token)) ? k : market.networks[0] ? { network: market.networks[0].id, token: market.networks[0].tokens[0].symbol } : null));
  }, [market]);
  const cur = market?.currencies.find((c) => c.code === currency) ?? null;
  useEffect(() => {
    if (cur && !cur.rails.includes(rail)) setRail(cur.rails[0] ?? "");
  }, [cur, rail]);
  useEffect(() => { setAccount(emptyAccount(rail)); }, [rail]);

  const network: P2pNetwork | null = market?.networks.find((n) => n.id === pick?.network) ?? null;
  const token: P2pToken | null = network?.tokens.find((x) => x.symbol === pick?.token) ?? null;
  const tokenSymbol = token?.symbol ?? "USDC";
  const decimals = side === "BUY" ? fiatDecimals(currency || "ARS") : Math.min(token?.decimals ?? 6, 6);
  const parsed = amount ? parseDecimal(amount, decimals) : null;
  const amountOk = parsed !== null && Number(parsed) > 0;
  const complete = !!session && !!market && !!cur && !!token && !!network && !!rail && amountOk;
  const quoteKey = complete ? JSON.stringify({ side, network: network!.id, token: token!.symbol, currency, rail, [side === "BUY" ? "fiatAmount" : "tokenAmount"]: parsed }) : "";

  // The price follows the form on its own, a moment after the last keystroke; an answer for a form
  // that has since changed is dropped; a price that runs out is asked for again while on screen.
  const latest = useRef("");
  const ask = useCallback((k: string) => {
    latest.current = k;
    setQuote((q) => ({ status: "loading", key: k, data: q.key === k ? q.data : null }));
    api.quote(JSON.parse(k))
      .then((data) => { if (latest.current === k) setQuote({ status: "ready", key: k, data }); })
      .catch((e) => {
        if (latest.current !== k) return;
        if (e instanceof AppApiError && e.status === 401) { onSessionEnded(); return; }
        setQuote({ status: "error", key: k, data: null });
      });
  }, [api, onSessionEnded]);
  useEffect(() => {
    if (!quoteKey) { latest.current = ""; setQuote({ status: "idle", key: "", data: null }); return; }
    const h = setTimeout(() => ask(quoteKey), 450);
    return () => clearTimeout(h);
  }, [quoteKey, ask]);
  const fresh = quote.key === quoteKey && quote.data ? quote.data : null;
  const now = useNow(!!fresh);
  const expired = !!fresh && Date.parse(fresh.expiresAt) <= now;
  useEffect(() => { if (expired && step === "form" && quoteKey) ask(quoteKey); }, [expired, step, quoteKey, ask]);

  const docError = checkPayerDocument(currency, payer.document);
  const payerErrors: Record<string, FieldError | null> = { name: checkHolderName(payer.name), document: docError, email: payer.email.trim() ? checkEmail(payer.email) : null };
  const accountErrors = side === "SELL" ? checkAccount(rail, account) : {};
  const detailsOk = side === "BUY" ? !Object.values(payerErrors).some(Boolean) : Object.keys(accountErrors).length === 0;

  const cta = (() => {
    if (market === undefined) return { label: a.cta.loading, ok: false };
    if (unavailable || !market || !cur || !token) return { label: a.cta.unavailable, ok: false };
    if (!amount.trim()) return { label: a.cta.amount, ok: false };
    if (!amountOk) return { label: fmt(a.cta.badAmount, { n: decimals }), ok: false };
    if (!session) return { label: a.cta.connect, ok: true, connect: true };
    if (!rail) return { label: a.cta.method, ok: false };
    if (quote.status === "error" && quote.key === quoteKey) return { label: a.cta.noQuote, ok: false };
    if (!fresh || expired) return { label: a.cta.quoting, ok: false };
    return { label: a.cta.continue, ok: true };
  })();

  const openOrder = async () => {
    if (!fresh || busy) return;
    setBusy(true);
    setError("");
    try {
      const body = side === "BUY"
        ? { side, quoteId: fresh.id, payer: { name: payer.name.trim(), document: payer.document.trim(), ...(payer.email.trim() ? { email: payer.email.trim() } : {}) } }
        : { side, quoteId: fresh.id, payout: { holderName: account.holderName.trim(), document: account.document.trim(), details: normalizeDetails(rail, account.details) } };
      const order = await api.createOrder(body);
      setAmount("");
      setStep("form");
      onOpened(order);
    } catch (e) {
      if (e instanceof AppApiError && e.status === 401) { onSessionEnded(); return; }
      setError(e instanceof AppApiError && e.status === 429 ? a.errors.limited : a.openFailed);
      // The quote is spent or stale: ask again.
      if (quoteKey) ask(quoteKey);
    } finally {
      setBusy(false);
    }
  };

  const fit = (text: string) => (text.length > 11 ? " len-l" : text.length > 8 ? " len-m" : "");
  const chev = <svg className="token-btn-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>;
  const currencyButton = (
    <button type="button" className="token-btn" onClick={() => setPicker("currency")} aria-haspopup="dialog" disabled={!market || market.currencies.length < 2} aria-label={fmt(a.changeCurrency, { currency: cur ? currencyName(cur.code, L) : "" })}>
      {cur && <CurrencyMark id={cur.code} />}
      <span className="token-btn-t"><b>{cur?.code ?? "-"}</b><small>{cur ? currencyName(cur.code, L) : ""}</small></span>
      {market && market.currencies.length > 1 && chev}
    </button>
  );
  const tokenButton = (
    <button type="button" className="token-btn" onClick={() => setPicker("token")} aria-haspopup="dialog" disabled={!market || !network} aria-label={fmt(a.changeToken, { token: tokenSymbol, network: network?.name ?? "" })}>
      {network && <TokenMark symbol={tokenSymbol} chain={network.id} chainName={network.name} size={28} />}
      <span className="token-btn-t"><b>{tokenSymbol}</b><small>{network?.name ?? ""}</small></span>
      {chev}
    </button>
  );

  const outText = fresh ? (side === "BUY" ? units(L, fresh.netAmount, tokenSymbol).split(NBSP)[0] : money(L, fresh.fiatAmount, currency).split(NBSP)[0]) : "";
  const rateText = fresh
    ? (inverse
      ? fmt(a.rateInverse, { currency, token: tokenSymbol, price: new Intl.NumberFormat(L, { maximumSignificantDigits: 4 }).format(1 / Number(fresh.price)) })
      : fmt(a.rate, { currency, token: tokenSymbol, price: new Intl.NumberFormat(L, { maximumFractionDigits: Number(fresh.price) >= 100 ? 2 : 4 }).format(Number(fresh.price)) }))
    : "";
  const stats = fresh?.merchant
    ? [
      fresh.merchant.completed === 1 ? p.merchant.completedOne : fresh.merchant.completed > 0 ? fmt(p.merchant.completed, { n: new Intl.NumberFormat(L).format(fresh.merchant.completed) }) : p.merchant.new,
      fresh.merchant.completionRate != null ? fmt(p.merchant.rate, { rate: new Intl.NumberFormat(L, { style: "percent", maximumFractionDigits: 1 }).format(fresh.merchant.completionRate) }) : null,
    ].filter(Boolean).join(" · ")
    : "";

  if (step === "details" && fresh && session) {
    const show = (k: string) => (touched[k] ? payerErrors[k] : null);
    const leave = (k: string) => () => setTouched((x) => ({ ...x, [k]: true }));
    return (
      <section className="swapper ramp p2pa-form arrive" aria-labelledby="p2pa-details-h">
        <div className="swapper-head"><h2 id="p2pa-details-h">{side === "BUY" ? a.buyer.title : a.seller.title}</h2></div>
        <dl className="p2pa-sum">
          <div><dt>{side === "BUY" ? a.youPay : a.youSell}</dt><dd><b>{side === "BUY" ? money(L, fresh.fiatAmount, currency) : units(L, fresh.tokenAmount, tokenSymbol)}</b></dd></div>
          <div><dt>{a.youReceive}</dt><dd><b>{side === "BUY" ? units(L, fresh.netAmount, tokenSymbol) : money(L, fresh.fiatAmount, currency)}</b></dd></div>
          <div><dt>{a.merchant}</dt><dd>{fresh.merchant.displayName}</dd></div>
          {side === "BUY" && <div><dt>{a.buyer.receiveTo}</dt><dd><code title={session.address}>{shortAddress(session.address)}</code> · {network?.name}</dd></div>}
        </dl>
        <p className="p2pa-muted">{side === "BUY" ? a.buyer.body : a.seller.body}</p>
        {side === "BUY" ? (
          <div className="p2pa-fields">
            <Field label={a.buyer.name} value={payer.name} autoComplete="name" placeholder={p.placeholders.holderName} onChange={(e: any) => setPayer((x) => ({ ...x, name: e.target.value }))} onBlur={leave("name")} aria-invalid={show("name") ? true : undefined} hint={errorText(t, "holderName", show("name"))} />
            <Field label={a.buyer.document} value={payer.document} autoComplete="off" spellCheck={false} onChange={(e: any) => setPayer((x) => ({ ...x, document: e.target.value }))} onBlur={leave("document")} aria-invalid={show("document") ? true : undefined} hint={show("document") ? errorText(t, "document", show("document")) : undefined} />
            <Field label={a.buyer.email} type="email" inputMode="email" value={payer.email} autoComplete="email" onChange={(e: any) => setPayer((x) => ({ ...x, email: e.target.value }))} onBlur={leave("email")} aria-invalid={show("email") ? true : undefined} hint={errorText(t, "text", show("email")) ?? a.buyer.emailHint} />
          </div>
        ) : (
          <AccountFields rail={rail} value={account} onChange={setAccount} errors={accountErrors} idPrefix="p2pa-acct" showAll={!!touched.name} />
        )}
        {fresh && !expired && <p className="swap-hint">{fmt(a.validFor, { time: timeLeft(fresh.expiresAt, now) })}</p>}
        {expired && <p className="swap-hint">{a.refreshing}</p>}
        <button type="button" className="btn btn-dark swap-cta" disabled={busy || expired} onClick={() => {
          // A first press with a problem shows every field's, and goes to the first one.
          setTouched({ name: true, document: true, email: true });
          if (detailsOk) { openOrder(); return; }
          setTimeout(() => document.querySelector<HTMLInputElement>(".p2pa-form [aria-invalid='true']")?.focus(), 0);
        }}>{busy ? a.opening : a.open}</button>
        <button type="button" className="btn btn-soft btn-sm p2pa-back" onClick={() => setStep("form")}>{a.back}</button>
        {error && <p className="swap-hint is-error" role="alert">{error}</p>}
      </section>
    );
  }

  const tabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = side === "BUY" ? "SELL" : "BUY";
    setSide(next);
    document.getElementById(`p2pa-tab-${next}`)?.focus();
  };

  return (
    <section className="swapper ramp p2pa-form" aria-labelledby="p2pa-widget-h">
      <h2 id="p2pa-widget-h" className="sr-only">{fmt(a.widgetTitle, { token: tokenSymbol })}</h2>
      <div className="seg-tabs seg-fill p2pa-tabs" role="tablist" aria-label={a.tabs.label} onKeyDown={tabKey}>
        {(["BUY", "SELL"] as const).map((s) => (
          <button key={s} id={`p2pa-tab-${s}`} type="button" role="tab" aria-selected={side === s} tabIndex={side === s ? 0 : -1} aria-controls="p2pa-panel" className={side === s ? "on" : ""} onClick={() => { setSide(s); setAmount(""); }}>
            {fmt(s === "BUY" ? a.tabs.buy : a.tabs.sell, { token: tokenSymbol })}
          </button>
        ))}
      </div>
      <div id="p2pa-panel" role="tabpanel" aria-labelledby={`p2pa-tab-${side}`}>
        {market === undefined ? (
          <>
            <div className="sp ramp-gap"><Sk w="30%" /><Sk className="lg sp-sk" w="70%" /></div>
            <div className="sp ramp-gap"><Sk w="30%" /><Sk className="lg sp-sk" w="70%" /></div>
          </>
        ) : (
          <>
            <div className="sp ramp-gap">
              <div className="sp-top"><label htmlFor="p2pa-amount">{side === "BUY" ? a.youPay : a.youSell}</label></div>
              <div className="sp-row">
                <input
                  id="p2pa-amount" className={`sp-amount${fit(amount)}`} inputMode="decimal" autoComplete="off" placeholder="0" value={amount}
                  disabled={!market} onChange={(e) => setAmount(e.target.value.trim().replace(",", "."))} aria-invalid={amount.trim() && !amountOk ? true : undefined}
                />
                {side === "BUY" ? currencyButton : tokenButton}
              </div>
            </div>
            <span className="swap-flip-btn is-static" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
            </span>
            <div className="sp sp-get" aria-busy={quote.status === "loading" || undefined}>
              <div className="sp-top"><span id="p2pa-get-l">{a.youReceive}</span></div>
              <div className="sp-row">
                <output className={`sp-amount${outText ? fit(outText) : " is-empty"}`} aria-labelledby="p2pa-get-l" aria-live="polite">
                  {quote.status === "loading" && !outText ? <Sk className="lg sp-sk" w="60%" /> : outText ? <span className="arrive" key={outText}>{outText}</span> : "0"}
                </output>
                {side === "BUY" ? tokenButton : currencyButton}
              </div>
            </div>
          </>
        )}

        {fresh && (
          <div className={`sq${details ? " open" : ""}`}>
            <div className="sq-head">
              <button type="button" className="sq-rate" onClick={() => setInverse((v) => !v)} title={a.invertRate}>{rateText}</button>
              <button type="button" className="sq-toggle" aria-expanded={details} aria-controls="p2pa-quote" onClick={() => setDetails((d) => !d)}>
                <span>{expired ? a.refreshing : fmt(a.validFor, { time: timeLeft(fresh.expiresAt, now) })}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                <span className="sr-only">{a.details}</span>
              </button>
            </div>
            <p className="sq-fee"><span>{a.merchant}</span><b>{fresh.merchant.displayName}{stats && <small>{stats}</small>}</b></p>
            <div className="sq-body" id="p2pa-quote" inert={!details}>
              <dl className="sq-rows">
                <div><dt>{a.fee}</dt><dd>{units(L, fresh.protocolFee, tokenSymbol)}</dd></div>
                {Number(fresh.integratorFee) > 0 && <div><dt>{a.integratorFee}</dt><dd>{units(L, fresh.integratorFee, tokenSymbol)}</dd></div>}
                <div><dt>{a.netReceive}</dt><dd>{side === "BUY" ? units(L, fresh.netAmount, tokenSymbol) : money(L, fresh.fiatAmount, currency)}</dd></div>
              </dl>
            </div>
          </div>
        )}

        {cur && (
          <div className="swap-accounts ramp-accounts">
            <div className="fld">
              <span className="field-l" id="p2pa-rail-l">{side === "BUY" ? a.payWith : a.receiveIn}</span>
              <Select value={rail} onChange={setRail} labelledBy="p2pa-rail-l" disabled={cur.rails.length < 2} options={cur.rails.map((r) => ({ value: r, label: p.rails[r] ?? r }))} />
            </div>
          </div>
        )}

        {unavailable || market === null
          ? (
            <>
              <p className="swap-hint is-error" role="alert">{unavailable ? a.unavailable : a.marketError}</p>
              {!unavailable && <button type="button" className="btn btn-soft btn-sm p2pa-back" onClick={onRetry}>{a.retry}</button>}
            </>
          )
          : (
            <button type="button" className="btn btn-dark swap-cta" disabled={!cta.ok} onClick={() => (cta.connect ? onConnect() : setStep("details"))}>{cta.label}</button>
          )}
        {quote.status === "error" && quote.key === quoteKey && <p className="swap-hint is-error" role="alert">{a.quoteFailed}</p>}
      </div>

      {picker === "currency" && market && (
        <Sheet
          title={a.pickCurrency} searchLabel={a.searchCurrency} selected={currency} onClose={() => setPicker(null)}
          onPick={(code) => { setPicker(null); setCurrency(code); }}
          items={market.currencies.map((c) => ({ key: c.code, mark: <CurrencyMark id={c.code} size={34} />, title: c.code, sub: currencyName(c.code, L), search: `${c.code} ${currencyName(c.code, L)}` }))}
        />
      )}
      {picker === "token" && market && (
        <Sheet
          title={a.pickToken} selected={pick ? `${pick.network}:${pick.token}` : ""} onClose={() => setPicker(null)}
          onPick={(k) => { const [n, tk] = k.split(":"); setPicker(null); setPick({ network: n, token: tk }); }}
          items={market.networks.flatMap((n) => n.tokens.map((tk) => ({ key: `${n.id}:${tk.symbol}`, mark: <TokenMark symbol={tk.symbol} chain={n.id} chainName={n.name} size={34} />, title: tk.symbol, sub: n.name, search: `${tk.symbol} ${n.name}` })))}
        />
      )}
    </section>
  );
}

/* A picker in the token sheet's look (`.tpick`): a search when the list is long, arrow keys. */
function Sheet({ title, items, selected, onPick, onClose, searchLabel }: {
  title: string;
  items: { key: string; mark: any; title: string; sub: string; search: string }[];
  selected: string;
  onPick: (key: string) => void;
  onClose: () => void;
  searchLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const list = useRef<HTMLUListElement>(null);
  const q = query.trim().toLowerCase();
  const shown = useMemo(() => (q ? items.filter((x) => x.search.toLowerCase().includes(q)) : items), [items, q]);
  const searchable = !!searchLabel && items.length > 6;
  const onKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const rows = [...(list.current?.querySelectorAll<HTMLButtonElement>("button.tpick-row") ?? [])];
    const at = rows.indexOf(document.activeElement as HTMLButtonElement);
    const go = (i: number) => { e.preventDefault(); rows[Math.max(0, Math.min(rows.length - 1, i))]?.focus(); };
    if (e.key === "ArrowDown") go(at + 1);
    else if (e.key === "ArrowUp") go(at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(rows.length - 1);
  };
  return (
    <Modal onClose={onClose} label={title}>
      <div className="modal-body tpick ramp-pick">
        <h3>{title}</h3>
        {searchable && (
          <div className="tpick-tools">
            <div className="fbar-search">
              {DI.search}
              <input type="search" className="field" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchLabel} aria-label={searchLabel} />
            </div>
          </div>
        )}
        <ul className="tpick-list" ref={list} role="list" onKeyDown={onKey}>
          {shown.map((x) => (
            <li key={x.key}>
              <button type="button" className={`tpick-row${x.key === selected ? " on" : ""}`} aria-pressed={x.key === selected} onClick={() => onPick(x.key)} autoFocus={!searchable && x.key === selected}>
                {x.mark}
                <span className="tpick-main"><b>{x.title}</b><span>{x.sub}</span></span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
