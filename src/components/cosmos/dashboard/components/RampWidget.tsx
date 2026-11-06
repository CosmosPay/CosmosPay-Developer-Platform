/* RampWidget: a purchase of crypto with local money (side "buy", the On-ramp) or a sale of it for
   local money ("sell", the Off-ramp) through P2P sellers and buyers, in the swap widget's pattern
   (components/SwapWidget.tsx, product owner: "take the swap as the example"). Everything the
   marketplace's own window offers (product owner, 2026-11-05: "it must have every method of the
   widget, which has several currencies and networks"): every local currency with its payment
   methods, every network and every token on it (the token sheet searches each network's list on
   the Payments API, GET .../p2p/tokens).

   Two wells, what the customer pays and what they receive, each a big amount beside a button for
   its asset (the local currency with its flag, or the token with its network); the market price
   under them (the local money per USD stablecoin, times the token's USD price), replaced by the
   marketplace's firm quote on its own once the order is complete (when the deployment has the
   integrator ids: a 503 says it has not, and the widget stops asking); the payment method and the
   account; one button whose words say what is missing.

   "Open" records the session (POST /api/{onramp,offramp}/p2p/sessions, the Payments API's
   /v1/{onramp,offramp}/p2p) and opens the hosted window it answers in a new tab, claimed on the
   click so a popup blocker lets it through. A purchase fixes its delivery address there; a sale
   is sent from the wallet the customer connects in that window. Nothing here connects a wallet.
   The provider is never named ("Never name a provider"). */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useT, useLang, fmt } from "@/lib/i18n/index";
import { onramp, offramp } from "@/lib/api-client";
import { Modal, showToast } from "@/components/cosmos/shared";
import { DI } from "@/components/cosmos/dashboard/icons";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { Select } from "@/components/cosmos/dashboard/components/Select";
import { Sk } from "@/components/cosmos/dashboard/components/Skeleton";
import { TokenMark } from "@/components/cosmos/dashboard/components/TokenMark";
import { NetworkMark } from "@/components/cosmos/dashboard/components/OrgWallets";

export type RampSide = "buy" | "sell";
export interface RampToken { chainId: number; address: string; symbol: string; decimals: number; priceUsd?: string | null; logoUrl?: string | null; main?: boolean }
export interface RampMethod { id: string; name: string }
export interface RampCurrency { id: string; name: string; price: string; minAmount: string; paymentMethods: RampMethod[] }
export interface RampNetwork { chainId: number; name: string; tokenCount: number }
export interface RampMarket { currencies: RampCurrency[]; networks: RampNetwork[]; defaultToken: RampToken }

/** The proxy each side calls. */
export const rampApi = (side: RampSide) => (side === "buy" ? onramp : offramp);

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const FIAT_AMOUNT = /^(0|[1-9]\d{0,14})(\.\d{1,2})?$/;
const TOKEN_AMOUNT = /^(0|[1-9]\d{0,17})(\.\d{1,18})?$/;
const NATIVE = "0x0000000000000000000000000000000000000000";

/* The marketplace's networks by EIP-155 id: their name, the dashboard's network id for the logo
   (`NetworkMark`, `TokenMark`'s badge; a network without artwork keeps its initial) and the
   explorer an account opens on. */
const CHAINS: Record<number, { name: string; mark: string; explorer: string }> = {
  1: { name: "Ethereum", mark: "eth", explorer: "https://etherscan.io" },
  10: { name: "Optimism", mark: "op", explorer: "https://optimistic.etherscan.io" },
  56: { name: "BNB Chain", mark: "bsc", explorer: "https://bscscan.com" },
  130: { name: "Unichain", mark: "unichain", explorer: "https://uniscan.xyz" },
  137: { name: "Polygon", mark: "pol", explorer: "https://polygonscan.com" },
  480: { name: "World Chain", mark: "world", explorer: "https://worldscan.org" },
  8453: { name: "Base", mark: "base", explorer: "https://basescan.org" },
  42161: { name: "Arbitrum", mark: "arb", explorer: "https://arbiscan.io" },
  42220: { name: "Celo", mark: "celo", explorer: "https://celoscan.io" },
  43114: { name: "Avalanche", mark: "avax", explorer: "https://snowtrace.io" },
  81457: { name: "Blast", mark: "blast", explorer: "https://blastscan.io" },
  421614: { name: "Arbitrum Sepolia", mark: "arb", explorer: "https://sepolia.arbiscan.io" },
};
export const rampChainName = (chainId: number | null | undefined, networks?: RampNetwork[]) =>
  networks?.find((n) => n.chainId === chainId)?.name ?? CHAINS[Number(chainId)]?.name ?? `Chain ${chainId ?? ""}`;
export const rampChainMark = (chainId: number | null | undefined) => CHAINS[Number(chainId)]?.mark ?? `chain-${chainId}`;
/** An account's page on its network's explorer, or null for a network without one here. */
export const rampExplorer = (chainId: number, address: string) => {
  const base = CHAINS[chainId]?.explorer;
  return base ? `${base}/address/${address}` : null;
};

/** USD stablecoins: worth a dollar when the marketplace lists no price (the sandbox's test USDT). */
const USD_STABLE = new Set(["USDT", "USDT0", "USDC", "USDC.e", "DAI", "USDS"]);
/** A token's USD price, or null when the marketplace lists none and it is not a USD stablecoin. */
export const tokenUsd = (t: RampToken | null) => {
  if (!t) return null;
  const n = Number(t.priceUsd);
  return t.priceUsd != null && Number.isFinite(n) && n > 0 ? n : USD_STABLE.has(t.symbol) ? 1 : null;
};

/** A currency's name in the reader's language (the market's English one when the browser has none). */
export function currencyName(id: string, lang: string, fallback?: string) {
  try {
    const name = new Intl.DisplayNames([lang], { type: "currency" }).of(id);
    if (name && name !== id) return name.charAt(0).toLocaleUpperCase(lang) + name.slice(1);
  } catch (e) {}
  return fallback || id;
}

/** A payment method's name without the currency the market appends ("Nequi (COP)"). */
export const methodName = (name: string, currency: string) => name.replace(new RegExp(`\\s*\\(${currency}\\)$`), "");

/* A local currency's mark: the flag of the country its ISO code starts with, round. Only the flag
   shows (product owner: "the flag is more than enough"); the two letters stand in only when the
   flag cannot load. */
export function CurrencyMark({ id, size = 28 }: { id: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const code = id.slice(0, 2).toLowerCase();
  return (
    <span className={`ramp-flag${failed ? " is-mono" : ""}`} style={{ ["--rf" as string]: `${size}px` }} aria-hidden="true">
      {failed
        ? <span className="ramp-flag-mono">{id.slice(0, 2)}</span>
        : <img className="ramp-flag-img" src={`https://flagcdn.com/${code}.svg`} alt="" width={size} height={size} decoding="async" onError={() => setFailed(true)} />}
    </span>
  );
}

/** A token's mark with its network's badge: our own artwork for a network's main asset (`main`,
    by address; a list's copy of a known symbol never wears it), else the logo the marketplace's
    list names (`logoUrl`), else its monogram. */
export const RampTokenMark = ({ token, size = 28, networks }: { token: Pick<RampToken, "symbol" | "chainId" | "logoUrl" | "main">; size?: number; networks?: RampNetwork[] }) => (
  <TokenMark symbol={token.symbol} chain={rampChainMark(token.chainId)} chainName={rampChainName(token.chainId, networks)} size={size} fallbackSrc={token.logoUrl ?? null} ownArt={token.main !== false} />
);

export function RampWidget({ side, market, env, orgId, onCreated }: {
  side: RampSide;
  /* undefined while it loads, null when it could not be read. */
  market: RampMarket | null | undefined;
  env: string;
  orgId: string;
  onCreated: (session: any, opened: boolean) => void;
}) {
  const t = useT();
  const lang = useLang();
  const w = t.dash.ramp.widget;
  const sw = t.dash.ramp[side];
  const [currency, setCurrency] = useState("");
  const [method, setMethod] = useState("");
  const [token, setToken] = useState<RampToken | null>(null);
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [picker, setPicker] = useState<null | "currency" | "token">(null);
  const [details, setDetails] = useState(false);
  const [inverse, setInverse] = useState(false);
  const [quote, setQuote] = useState<{ status: string; data: any; key: string }>({ status: "idle", data: null, key: "" });
  // A 503 means this deployment has no integrator ids: firm quotes stay off for the session.
  const [firmOff, setFirmOff] = useState(false);
  const [busy, setBusy] = useState(false);

  const currencies = market?.currencies ?? [];
  const networks = market?.networks ?? [];
  // Defaults: pesos when they can be paid with, else the first currency; the token the
  // marketplace settles in, read again from its list for its USD price.
  useEffect(() => {
    if (!market) return;
    const first = market.currencies.find((c) => c.id === "ARS") ?? market.currencies[0];
    setCurrency((id) => (market.currencies.some((c) => c.id === id) ? id : first?.id ?? ""));
    const d = market.defaultToken;
    setToken((tk) => tk ?? d);
    let alive = true;
    rampApi(side).get("p2p/tokens", env, orgId, { chainId: d.chainId, q: d.address, take: 1 })
      .then((page) => {
        const hit = Array.isArray(page?.data) ? page.data[0] : null;
        if (alive && hit) setToken((tk) => (tk && tk.chainId === hit.chainId && tk.address.toLowerCase() === hit.address.toLowerCase() ? { ...tk, priceUsd: hit.priceUsd, logoUrl: hit.logoUrl, main: hit.main } : tk));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [market, side, env, orgId]);
  const cur = currencies.find((c) => c.id === currency) ?? null;
  useEffect(() => {
    if (cur && !cur.paymentMethods.some((m) => m.id === method)) setMethod(cur.paymentMethods[0]?.id ?? "");
  }, [cur, method]);

  const chain = token ? rampChainName(token.chainId, networks) : "";
  const usd = tokenUsd(token);
  const num = (v: number | string, max = 2) => {
    const n = Number(v);
    return Number.isFinite(n) ? new Intl.NumberFormat(lang, { maximumFractionDigits: max }).format(n) : String(v ?? "");
  };
  // Local money with its cents once it has any (4,954.30 ARS, not 4,954.3).
  const money = (v: number | string) => {
    const n = Number(v);
    return Number.isFinite(n) ? new Intl.NumberFormat(lang, { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n) : String(v ?? "");
  };
  // A token amount: two decimals from 1 up, four significant digits below (0.002231 ETH).
  const units = (v: number | string) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v ?? "");
    return n >= 1 ? num(n, 2) : new Intl.NumberFormat(lang, { maximumSignificantDigits: 4 }).format(n);
  };
  const rateText = (v: number) => num(v, v >= 100 ? 2 : 4);
  const curLabel = (id: string) => currencyName(id, lang, currencies.find((c) => c.id === id)?.name);
  // What the order is counted in: local money for a purchase, the token for a sale.
  const unitIn = side === "buy" ? currency : token?.symbol ?? "";
  const unitOut = side === "buy" ? token?.symbol ?? "" : currency;
  // A sale's minimum is in USD: shown in the token at its price, unchecked here without one.
  const minIn = !cur ? null : side === "buy" ? Number(cur.minAmount) : usd ? Number(cur.minAmount) / usd : null;
  const minText = minIn === null ? "" : side === "buy" ? `${money(minIn)} ${unitIn}` : `${usd === 1 ? "" : "≈ "}${units(minIn)} ${unitIn}`;

  const decimals = (amount.split(".")[1] ?? "").length;
  const shapeOk = side === "buy" ? FIAT_AMOUNT.test(amount) : TOKEN_AMOUNT.test(amount) && !!token && decimals <= token.decimals && Number(amount) > 0;
  const amountOk = !!cur && shapeOk && (minIn === null || Number(amount) >= minIn - 1e-12);
  const addressOk = EVM_ADDRESS.test(address.trim());
  const order = { currency, paymentMethod: method, chainId: token?.chainId, token: token?.address, amount, address: address.trim() };
  const complete = !!cur && !!token && !!method && amountOk && addressOk;

  // The market price: local money per USD stablecoin, times the token's USD price.
  const perToken = cur && usd ? Number(cur.price) * usd : null;
  const estimate = amountOk && perToken ? (side === "buy" ? Number(amount) / perToken : Number(amount) * perToken) : null;

  // The firm quote follows the order on its own, a moment after the last keystroke; an answer
  // for an order that has since changed is dropped.
  const quoteKey = complete && !firmOff ? JSON.stringify(order) : "";
  const latest = useRef("");
  const ask = (k: string) => {
    latest.current = k;
    setQuote({ status: "loading", data: null, key: k });
    rampApi(side).post("p2p/quotes", env, orgId, JSON.parse(k))
      .then((data) => { if (latest.current === k) setQuote({ status: "ready", data, key: k }); })
      .catch((err) => {
        if (latest.current !== k) return;
        if (err?.status === 503) { setFirmOff(true); setQuote({ status: "idle", data: null, key: "" }); return; }
        setQuote({ status: "error", data: err?.message || w.quoteFailed, key: k });
      });
  };
  useEffect(() => {
    if (!quoteKey) { latest.current = ""; setQuote({ status: "idle", data: null, key: "" }); return; }
    const h = setTimeout(() => ask(quoteKey), 450);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);
  const fresh = quote.status === "ready" && quote.key === quoteKey ? quote.data : null;

  const out = fresh ? Number(fresh.amountOut) : estimate;
  const outText = out !== null ? `${fresh ? "" : "≈ "}${side === "sell" ? money(out) : units(out)}` : "";
  // The rate: a firm quote's exchange rate is per USD stablecoin, as the market price is.
  const price = fresh && usd ? Number(fresh.exchangeRate) * usd : perToken;
  const fit = (text: string) => (text.length > 11 ? " len-l" : text.length > 8 ? " len-m" : "");

  // The button: what is missing, or the action.
  const cta = (() => {
    if (!cur || !token) return { label: sw.ctaNone, ok: false };
    if (!amount.trim()) return { label: w.ctaAmount, ok: false };
    if (!shapeOk) return { label: side === "buy" ? w.ctaAmountBad : fmt(w.ctaDecimals, { n: token.decimals, token: token.symbol }), ok: false };
    if (!amountOk) return { label: fmt(w.ctaMin, { min: minText }), ok: false };
    if (!address.trim()) return { label: fmt(sw.ctaAddress, { chain }), ok: false };
    if (!addressOk) return { label: fmt(w.ctaAddressBad, { chain }), ok: false };
    return { label: sw.ctaOpen, ok: true };
  })();

  const open = async () => {
    if (!cta.ok || busy) return;
    // The tab is claimed before the round trip, so a popup blocker sees the click behind it.
    const tab = window.open("", "_blank");
    setBusy(true);
    try {
      const s = await rampApi(side).post("p2p/sessions", env, orgId, order);
      if (tab) {
        tab.opener = null;
        tab.location.replace(s.widgetUrl);
      }
      onCreated(s, !!tab);
      setAmount("");
    } catch (e: any) {
      tab?.close();
      showToast(e?.message || sw.openFailed, "error");
    } finally {
      setBusy(false);
    }
  };

  const chev = <svg className="token-btn-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>;
  const currencyButton = (
    <button type="button" className="token-btn" onClick={() => setPicker("currency")} aria-haspopup="dialog" disabled={currencies.length < 2}
      aria-label={fmt(w.changeCurrency, { currency: cur ? curLabel(cur.id) : "" })}>
      {cur && <CurrencyMark id={cur.id} />}
      <span className="token-btn-t"><b>{cur?.id ?? "-"}</b><small>{cur ? curLabel(cur.id) : ""}</small></span>
      {currencies.length > 1 && chev}
    </button>
  );
  // A network with one token (the sandbox's test USDT) is a label, not a choice.
  const oneToken = networks.length === 1 && networks[0].tokenCount <= 1;
  const tokenInner = token && (
    <>
      <RampTokenMark token={token} networks={networks} />
      <span className="token-btn-t"><b>{token.symbol}</b><small>{chain}</small></span>
    </>
  );
  const tokenButton = oneToken
    ? <span className="token-btn is-fixed">{tokenInner}</span>
    : (
      <button type="button" className="token-btn" onClick={() => setPicker("token")} aria-haspopup="dialog" aria-label={fmt(w.changeToken, { token: token?.symbol ?? "", chain })}>
        {tokenInner}{chev}
      </button>
    );

  if (market === undefined) {
    return (
      <section className="swapper ramp" aria-busy="true" aria-label={sw.widgetTitle}>
        <div className="swapper-head"><h2>{sw.widgetTitle}</h2></div>
        <div className="sp"><Sk w="30%" /><Sk className="lg sp-sk" w="70%" /></div>
        <div className="sp ramp-gap"><Sk w="30%" /><Sk className="lg sp-sk" w="70%" /></div>
        <Sk className="lg ramp-cta-sk" w="100%" />
      </section>
    );
  }
  if (market === null) {
    return (
      <section className="swapper ramp" aria-labelledby="ramp-h">
        <div className="swapper-head"><h2 id="ramp-h">{sw.widgetTitle}</h2></div>
        <p className="swap-hint is-error" role="alert">{t.dash.ramp.marketError}</p>
      </section>
    );
  }

  const payWell = (
    <div className="sp">
      <div className="sp-top"><label htmlFor="ramp-pay">{sw.pay}</label>{minText && <span className="sp-usd">{fmt(w.min, { min: minText })}</span>}</div>
      <div className="sp-row">
        <input
          id="ramp-pay" className={`sp-amount${fit(amount)}`} inputMode="decimal" autoComplete="off" placeholder="0"
          value={amount} onChange={(e) => setAmount(e.target.value.trim().replace(",", "."))}
          aria-invalid={amount.trim() && !amountOk ? true : undefined}
        />
        {side === "buy" ? currencyButton : tokenButton}
      </div>
    </div>
  );
  const getWell = (
    <div className="sp sp-get" aria-busy={quote.status === "loading" || undefined}>
      <div className="sp-top"><span id="ramp-get-l">{sw.receive}</span></div>
      <div className="sp-row">
        <output className={`sp-amount${outText ? fit(outText) : " is-empty"}${outText && !fresh ? " is-estimate" : ""}`} aria-labelledby="ramp-get-l" aria-live="polite">
          {quote.status === "loading" && !outText ? <Sk className="lg sp-sk" w="60%" /> : outText ? <span className="arrive" key={outText}>{outText}</span> : "0"}
        </output>
        {side === "buy" ? tokenButton : currencyButton}
      </div>
    </div>
  );

  return (
    <section className="swapper ramp" aria-labelledby="ramp-h">
      <div className="swapper-head"><h2 id="ramp-h">{sw.widgetTitle}</h2></div>

      {payWell}
      <span className="swap-flip-btn is-static" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
      </span>
      {getWell}

      {/* The rate, and where it comes from: the market price until the marketplace quotes the
          order, then its firm quote with the fees and what it guarantees folded under it. */}
      {price !== null && token && cur && (
        <div className={`sq${details && fresh ? " open" : ""}`}>
          <div className="sq-head">
            <button type="button" className="sq-rate" onClick={() => setInverse((v) => !v)} title={w.invertRate}>
              {inverse ? `1 ${cur.id} = ${units(1 / price)} ${token.symbol}` : `1 ${token.symbol} = ${rateText(price)} ${cur.id}`}
            </button>
            {fresh
              ? (
                <button type="button" className="sq-toggle" aria-expanded={details} aria-controls="ramp-details" onClick={() => setDetails((d) => !d)}>
                  <span>{w.firm}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                  <span className="sr-only">{w.details}</span>
                </button>
              )
              : <span className="sq-src">{w.market}</span>}
          </div>
          {fresh && (
            <>
              <p className="sq-fee"><span>{w.fees}</span><b>{units(fresh.fee.amountInToken)} {token.symbol}<small>{money(fresh.fee.amountInFiat)} {cur.id}</small></b></p>
              <div className="sq-body" id="ramp-details" inert={!details}>
                <dl className="sq-rows">
                  <div><dt>{w.atLeast}</dt><dd>{side === "sell" ? money(fresh.minAmountOut) : units(fresh.minAmountOut)} {unitOut}</dd></div>
                  <div><dt>{w.validUntil}</dt><dd>{new Date(fresh.expiresAt).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })}</dd></div>
                </dl>
              </div>
            </>
          )}
        </div>
      )}

      <div className="swap-accounts ramp-accounts">
        {cur && (
          <div className="fld">
            <span className="field-l" id="ramp-method-l">{sw.method}</span>
            <Select
              value={method} onChange={setMethod} labelledBy="ramp-method-l" disabled={cur.paymentMethods.length < 2}
              options={cur.paymentMethods.map((m) => ({ value: m.id, label: methodName(m.name, cur.id) }))}
            />
          </div>
        )}
        <Field
          label={fmt(sw.addressLabel, { chain })} hint={sw.addressHint}
          value={address} onChange={(e) => setAddress(e.target.value)}
          placeholder={t.dash.ramp.addressPlaceholder} autoComplete="off" spellCheck={false}
          aria-invalid={address.trim() && !addressOk ? true : undefined}
        />
      </div>

      <button type="button" className="btn btn-dark swap-cta" disabled={!cta.ok || busy} onClick={open}>
        {busy ? w.ctaBusy : <>{cta.label}{cta.ok && <span className="ramp-cta-ic" aria-hidden="true">{DI.link}</span>}</>}
      </button>
      {quote.status === "error" && quote.data && <p className="swap-hint is-error" role="alert">{quote.data}</p>}

      {picker === "currency" && (
        <RampPicker
          title={sw.pickCurrency}
          selected={currency}
          searchable={currencies.length > 6}
          items={currencies.map((c) => ({
            key: c.id, mark: <CurrencyMark id={c.id} size={34} />, title: c.id, sub: curLabel(c.id),
            aside: token && usd ? `1 ${token.symbol} = ${rateText(Number(c.price) * usd)} ${c.id}` : undefined,
            search: [c.id, c.name, curLabel(c.id), ...c.paymentMethods.map((m) => m.name)].join(" "),
          }))}
          onPick={(id) => { setPicker(null); setCurrency(id); }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "token" && token && (
        <RampTokenSheet
          side={side} env={env} orgId={orgId} networks={networks} selected={token}
          onPick={(tk) => { setPicker(null); setToken(tk); }}
          onClose={() => setPicker(null)}
        />
      )}
    </section>
  );
}

/* The token sheet: every network the marketplace offers (a filter with their marks and how many
   tokens each lists) and each network's tokens, searched on the Payments API by symbol or by a
   pasted address. The swap's token picker's look (`.tpick`), arrow keys between the rows. */
function RampTokenSheet({ side, env, orgId, networks, selected, onPick, onClose }: {
  side: RampSide; env: string; orgId: string; networks: RampNetwork[]; selected: RampToken;
  onPick: (token: RampToken) => void; onClose: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const w = t.dash.ramp.widget;
  const [chainId, setChainId] = useState(selected.chainId);
  const [query, setQuery] = useState("");
  // undefined while it loads, null when it failed.
  const [page, setPage] = useState<{ rows: RampToken[]; total: number } | null | undefined>(undefined);
  const list = useRef<HTMLUListElement>(null);
  const usdFmt = new Intl.NumberFormat(lang, { style: "currency", currency: "USD", maximumSignificantDigits: 4 });
  useEffect(() => {
    let alive = true;
    setPage(undefined);
    const h = setTimeout(() => {
      rampApi(side).get("p2p/tokens", env, orgId, { chainId, q: query.trim(), take: 100 })
        .then((res) => { if (alive) setPage({ rows: Array.isArray(res?.data) ? res.data : [], total: Number(res?.total) || 0 }); })
        .catch(() => { if (alive) setPage(null); });
    }, query ? 250 : 0);
    return () => { alive = false; clearTimeout(h); };
  }, [side, env, orgId, chainId, query]);
  const onKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const rows = [...(list.current?.querySelectorAll<HTMLButtonElement>("button.tpick-row") ?? [])];
    const at = rows.indexOf(document.activeElement as HTMLButtonElement);
    const go = (i: number) => { e.preventDefault(); rows[Math.max(0, Math.min(rows.length - 1, i))]?.focus(); };
    if (e.key === "ArrowDown") go(at + 1);
    else if (e.key === "ArrowUp") go(at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(rows.length - 1);
  };
  const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
  const isSel = (x: RampToken) => x.chainId === selected.chainId && x.address.toLowerCase() === selected.address.toLowerCase();
  return (
    <Modal onClose={onClose} label={w.pickToken}>
      <div className="modal-body tpick ramp-pick">
        <h3>{w.pickToken}</h3>
        <div className="tpick-tools">
          <div className="fbar-search">
            {DI.search}
            <input type="search" className="field" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={w.searchTokens} aria-label={w.searchTokens} />
          </div>
          <Select
            variant="filter" className="tpick-net" label={w.network}
            value={String(chainId)} onChange={(v) => setChainId(Number(v))}
            options={networks.map((n) => ({ value: String(n.chainId), label: n.name, count: n.tokenCount, icon: <NetworkMark chain={rampChainMark(n.chainId)} size={18} /> }))}
          />
        </div>
        {/* How many tokens the list shows: announced, not written (product owner, 2026-11-05). */}
        <p className="sr-only" role="status" aria-live="polite">
          {page ? (page.total > page.rows.length ? fmt(w.tokensMore, { n: page.rows.length, total: page.total }) : fmt(w.tokensCount, { n: page.rows.length })) : ""}
        </p>
        {page === null && <p className="tpick-count is-error" role="alert">{w.tokensError}</p>}
        <ul className="tpick-list" ref={list} role="list" onKeyDown={onKey} aria-busy={page === undefined || undefined}>
          {page === undefined && [0, 1, 2, 3, 4].map((i) => <li key={i} className="ramp-pick-sk"><Sk className="lg" w="34px" /><Sk w={`${40 + i * 7}%`} /></li>)}
          {page && page.rows.map((x) => (
            <li key={`${x.chainId}:${x.address}`}>
              <button type="button" className={`tpick-row${isSel(x) ? " on" : ""}`} aria-pressed={isSel(x)} onClick={() => onPick(x)}>
                <RampTokenMark token={x} networks={networks} size={34} />
                <span className="tpick-main"><b>{x.symbol}</b><span>{rampChainName(x.chainId, networks)}{x.address !== NATIVE ? ` · ${short(x.address)}` : ""}</span></span>
                {x.priceUsd && Number(x.priceUsd) > 0 ? <span className="tpick-price">{usdFmt.format(Number(x.priceUsd))}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

/* The currency sheet: the swap's token picker's look (`.tpick`), a search when the list is long,
   arrow keys between the rows. */
function RampPicker({ title, items, selected, onPick, onClose, searchable = false }: {
  title: string;
  items: { key: string; mark: ReactNode; title: string; sub: string; aside?: string; search: string }[];
  selected: string;
  onPick: (key: string) => void;
  onClose: () => void;
  searchable?: boolean;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const list = useRef<HTMLUListElement>(null);
  const q = query.trim().toLowerCase();
  const shown = useMemo(() => (q ? items.filter((x) => x.search.toLowerCase().includes(q)) : items), [items, q]);
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
              <input type="search" className="field" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.dash.ramp.widget.search} aria-label={t.dash.ramp.widget.search} />
            </div>
          </div>
        )}
        <ul className="tpick-list" ref={list} role="list" onKeyDown={onKey}>
          {shown.map((x) => (
            <li key={x.key}>
              <button type="button" className={`tpick-row${x.key === selected ? " on" : ""}`} aria-pressed={x.key === selected} onClick={() => onPick(x.key)} autoFocus={!searchable && x.key === selected}>
                {x.mark}
                <span className="tpick-main"><b>{x.title}</b><span>{x.sub}</span></span>
                {x.aside && <span className="tpick-price">{x.aside}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
