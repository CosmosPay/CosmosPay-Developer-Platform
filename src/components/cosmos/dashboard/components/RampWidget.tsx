/* RampWidget: a purchase of stablecoins with local money (side "buy", the On-ramp) or a sale of
   them for local money ("sell", the Off-ramp) through P2P sellers and buyers, in the swap widget's
   pattern (components/SwapWidget.tsx, product owner: "take the swap as the example"). Two wells,
   what the customer pays and what they receive, each a big amount beside a button for its asset
   (the local currency with its flag, or the stablecoin with its network); the market price under
   them, replaced by the marketplace's firm quote on its own once the order is complete (when the
   deployment has the integrator ids: a 503 says it has not, and the widget stops asking); the
   payment method and the account; one button whose words say what is missing.

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
import { CountryFlag } from "@/components/cosmos/dashboard/components/CountryFlag";

export type RampSide = "buy" | "sell";
export interface RampToken { symbol: string; address: string; decimals: number }
export interface RampMethod { id: string; name: string }
export interface RampCurrency { id: string; name: string; price: string; minAmount: string; paymentMethods: RampMethod[] }
export interface RampMarket { chainId: number; chain: string; tokens: RampToken[]; currencies: RampCurrency[] }

/** The proxy each side calls. */
export const rampApi = (side: RampSide) => (side === "buy" ? onramp : offramp);

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const AMOUNT = /^(0|[1-9]\d{0,14})(\.\d{1,2})?$/;

/** The chain the market delivers on, by its name in the market or its EIP-155 id. */
export const rampChainName = (chain: string | number | null | undefined) =>
  chain === "arbitrum" || chain === 42161 ? "Arbitrum" : chain === "arbitrum-sepolia" || chain === 421614 ? "Arbitrum Sepolia" : String(chain ?? "");

/** An account's page on the chain's explorer. */
export const rampExplorer = (chainId: number, address: string) =>
  `${chainId === 42161 ? "https://arbiscan.io" : "https://sepolia.arbiscan.io"}/address/${address}`;

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

/** A local currency's mark: the flag of the country its ISO code starts with. */
export function CurrencyMark({ id, size = 28 }: { id: string; size?: number }) {
  return (
    <span className="ramp-flag" style={{ ["--rf" as string]: `${size}px` }} aria-hidden="true">
      <CountryFlag code={id.slice(0, 2)} className="ramp-flag-img" />
      <span className="ramp-flag-mono">{id.slice(0, 2)}</span>
    </span>
  );
}

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
  const [token, setToken] = useState("");
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
  const tokens = market?.tokens ?? [];
  // Defaults: pesos when they can be paid with, else the first currency; the first stablecoin.
  useEffect(() => {
    if (!market) return;
    const first = market.currencies.find((c) => c.id === "ARS") ?? market.currencies[0];
    setCurrency((id) => (market.currencies.some((c) => c.id === id) ? id : first?.id ?? ""));
    setToken((s) => (market.tokens.some((x) => x.symbol === s) ? s : market.tokens[0]?.symbol ?? ""));
  }, [market]);
  const cur = currencies.find((c) => c.id === currency) ?? null;
  const tk = tokens.find((x) => x.symbol === token) ?? null;
  useEffect(() => {
    if (cur && !cur.paymentMethods.some((m) => m.id === method)) setMethod(cur.paymentMethods[0]?.id ?? "");
  }, [cur, method]);

  const chain = rampChainName(market?.chain);
  const num = (v: number | string, max = 2) => {
    const n = Number(v);
    return Number.isFinite(n) ? new Intl.NumberFormat(lang, { maximumFractionDigits: max }).format(n) : String(v ?? "");
  };
  // Local money with its cents once it has any (4,954.30 ARS, not 4,954.3).
  const money = (v: number | string) => {
    const n = Number(v);
    return Number.isFinite(n) ? new Intl.NumberFormat(lang, { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n) : String(v ?? "");
  };
  const rateText = (v: number | string) => num(v, Number(v) >= 100 ? 2 : 4);
  const curLabel = (id: string) => currencyName(id, lang, currencies.find((c) => c.id === id)?.name);
  // What the order is counted in: local money for a purchase, the stablecoin for a sale.
  const unitIn = side === "buy" ? currency : token;
  const unitOut = side === "buy" ? token : currency;
  const minText = cur ? `${side === "buy" ? money(cur.minAmount) : num(cur.minAmount)} ${unitIn}` : "";

  const shapeOk = AMOUNT.test(amount);
  const amountOk = !!cur && shapeOk && Number(amount) >= Number(cur.minAmount);
  const addressOk = EVM_ADDRESS.test(address.trim());
  const order = { currency, paymentMethod: method, token, amount, address: address.trim() };
  const complete = !!cur && !!tk && !!method && amountOk && addressOk;

  // The market price: about what the order comes to, rounded down to the cent.
  const estimate = amountOk && cur
    ? Math.floor((side === "buy" ? Number(amount) / Number(cur.price) : Number(amount) * Number(cur.price)) * 100) / 100
    : null;

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
  const outText = out !== null ? `${fresh ? "" : "≈ "}${side === "sell" ? money(out) : num(out)}` : "";
  const price = fresh ? Number(fresh.exchangeRate) : cur ? Number(cur.price) : null;
  const fit = (text: string) => (text.length > 11 ? " len-l" : text.length > 8 ? " len-m" : "");

  // The button: what is missing, or the action.
  const cta = (() => {
    if (!cur || !tk) return { label: sw.ctaNone, ok: false };
    if (!amount.trim()) return { label: w.ctaAmount, ok: false };
    if (!shapeOk) return { label: w.ctaAmountBad, ok: false };
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

  const currencyButton = (
    <button type="button" className="token-btn" onClick={() => setPicker("currency")} aria-haspopup="dialog" disabled={currencies.length < 2}
      aria-label={fmt(w.changeCurrency, { currency: cur ? curLabel(cur.id) : "" })}>
      {cur && <CurrencyMark id={cur.id} />}
      <span className="token-btn-t"><b>{cur?.id ?? "-"}</b><small>{cur ? curLabel(cur.id) : ""}</small></span>
      {currencies.length > 1 && <svg className="token-btn-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>}
    </button>
  );
  // One stablecoin (the sandbox's test USDT) is a label, not a choice.
  const tokenInner = tk && (
    <>
      <TokenMark symbol={tk.symbol} chain="arb" chainName={chain} size={28} />
      <span className="token-btn-t"><b>{tk.symbol}</b><small>{chain}</small></span>
    </>
  );
  const tokenButton = tokens.length > 1
    ? (
      <button type="button" className="token-btn" onClick={() => setPicker("token")} aria-haspopup="dialog" aria-label={fmt(w.changeToken, { token: tk?.symbol ?? "", chain })}>
        {tokenInner}
        <svg className="token-btn-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
    )
    : <span className="token-btn is-fixed">{tokenInner}</span>;

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
      <div className="sp-top"><label htmlFor="ramp-pay">{sw.pay}</label>{cur && <span className="sp-usd">{fmt(w.min, { min: minText })}</span>}</div>
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
      {price !== null && tk && cur && (
        <div className={`sq${details && fresh ? " open" : ""}`}>
          <div className="sq-head">
            <button type="button" className="sq-rate" onClick={() => setInverse((v) => !v)} title={w.invertRate}>
              {inverse ? `1 ${cur.id} = ${num(1 / price, 6)} ${tk.symbol}` : `1 ${tk.symbol} = ${rateText(price)} ${cur.id}`}
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
              <p className="sq-fee"><span>{w.fees}</span><b>{num(fresh.fee.amountInToken)} {tk.symbol}<small>{money(fresh.fee.amountInFiat)} {cur.id}</small></b></p>
              <div className="sq-body" id="ramp-details" inert={!details}>
                <dl className="sq-rows">
                  <div><dt>{w.atLeast}</dt><dd>{side === "sell" ? money(fresh.minAmountOut) : num(fresh.minAmountOut)} {unitOut}</dd></div>
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
            aside: tk ? `1 ${tk.symbol} = ${rateText(c.price)} ${c.id}` : undefined,
            search: [c.id, c.name, curLabel(c.id), ...c.paymentMethods.map((m) => m.name)].join(" "),
          }))}
          onPick={(id) => { setPicker(null); setCurrency(id); }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "token" && (
        <RampPicker
          title={w.pickToken}
          selected={token}
          items={tokens.map((x) => ({ key: x.symbol, mark: <TokenMark symbol={x.symbol} chain="arb" chainName={chain} size={34} />, title: x.symbol, sub: chain, search: x.symbol }))}
          onPick={(s) => { setPicker(null); setToken(s); }}
          onClose={() => setPicker(null)}
        />
      )}
    </section>
  );
}

/* The sheet a well's asset button opens: the swap's token picker's look (`.tpick`), a search when
   the list is long, arrow keys between the rows. */
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
