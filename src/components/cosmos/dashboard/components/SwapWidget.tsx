/* SwapWidget: the swap form, in the pattern every swap app uses. "You pay" and "You receive"
   panels (a big amount and a token button that names its network), a flip between them, the
   quote updating on its own as the amount or tokens change, its details folded under the rate,
   the accounts the route needs, and one button whose words say what is missing.

   Routes (src/lib/swap-catalog.ts): within Stellar, Solana or Monad, that chain's market
   (POST /api/swaps: a transaction the payer signs); between chains, or within any other
   network, NEAR Intents (POST /api/cross-chain-swaps: a deposit address). A NEAR Intents quote
   needs both addresses, so until they are in, the receive side shows an estimate from the
   listed prices. Opening a NEAR Intents swap, and Solana's and Monad's markets, are mainnet
   only; the button says so in the sandbox. USDT0 on Stellar to USDT / USDT0 on a network
   LayerZero's OFT reaches goes through the OFT (/usdt0/transfers: a Soroban transaction the holder
   signs, 1:1, LayerZero's fee in XLM), mainnet only like USDT0 itself.

   The calls go through `api` (src/lib/swap-api.ts): the organization's proxies in the dashboard,
   the gateway with the shared public key on the public swap pages. */
import { useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "@/components/cosmos/shared";
import { useT, useLang, fmt } from "@/lib/i18n/index";
import { idempotencyKeys } from "@/components/cosmos/dashboard/helpers";
import { useOutside, usePresence } from "@/components/cosmos/dashboard/hooks";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { Sk } from "@/components/cosmos/dashboard/components/Skeleton";
import { TokenMark } from "@/components/cosmos/dashboard/components/TokenMark";
import { TokenPicker } from "@/components/cosmos/dashboard/components/TokenPicker";
import { amountFits, buildCatalog, canPayWith, estimateOut, receivableFrom, routeFor, type NearAsset, type SwapToken } from "@/lib/swap-catalog";
import { NATIVE_CODES, isAddress, isChain, placeholderFor, type Tier } from "@/lib/chains";
import { isEvmAddress, type Usdt0Route } from "@/lib/usdt0";
import type { SwapApi, SwapRecordKind } from "@/lib/swap-api";

/* An account on a network the dashboard has no rule for: one word of address characters.
   The Payments API checks the network's real format. */
const LOOSE_ADDRESS = /^[A-Za-z0-9:._-]{2,128}$/;
const accountOk = (chain: string, v: string) => (isChain(chain) ? isAddress(chain, v) : LOOSE_ADDRESS.test(v.trim()));
const SLIPPAGES = ["", "50", "100", "200"];

/* `preset` preselects a pair (the public page's "send USDT0" does): the first token each predicate
   accepts, whenever `n` changes. */
export type SwapPick = { from: (t: SwapToken) => boolean; to: (t: SwapToken) => boolean; n: number };

export function SwapWidget({ api, tier, onCreated, preset = null }: { api: SwapApi; tier: Tier; onCreated: (kind: SwapRecordKind, rec: any) => void; preset?: SwapPick | null }) {
  const t = useT();
  const lang = useLang();
  const w = t.dash.swaps.widget;
  const m = t.dash.swaps.modal;
  const [near, setNear] = useState<NearAsset[] | null>(null);
  const [oftRoutes, setOftRoutes] = useState<Usdt0Route[]>([]);
  const [fromKey, setFromKey] = useState<string | null>(null);
  const [toKey, setToKey] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [memo, setMemo] = useState("");
  const [another, setAnother] = useState(false);
  const [slippage, setSlippage] = useState("");
  const [picker, setPicker] = useState<null | "from" | "to">(null);
  const [details, setDetails] = useState(false);
  const [inverse, setInverse] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [quote, setQuote] = useState({ status: "idle", data: null, key: "" });
  const [busy, setBusy] = useState(false);
  const keys = useRef(idempotencyKeys()).current;

  // NEAR Intents' list and USDT0's routes, once per API; without them the chains' own markets still work.
  useEffect(() => {
    let alive = true;
    setNear(null);
    api.assets().then((list) => { if (alive) setNear(list as NearAsset[]); }).catch(() => { if (alive) setNear([]); });
    api.usdt0Routes().then((r) => { if (alive) setOftRoutes(r); }).catch(() => { if (alive) setOftRoutes([]); });
    return () => { alive = false; };
  }, [api]);
  const catalog = useMemo(() => buildCatalog(near || [], tier, oftRoutes), [near, tier, oftRoutes]);
  // Defaults: XLM to USDC on Stellar, the pair that works in both environments.
  useEffect(() => {
    if (!catalog.length) return;
    setFromKey((k) => (k && catalog.some((x) => x.key === k) ? k : catalog.find((x) => x.chain === "stellar" && !x.contract)?.key ?? null));
    setToKey((k) => (k && catalog.some((x) => x.key === k) ? k : catalog.find((x) => x.chain === "stellar" && x.symbol === "USDC")?.key ?? null));
  }, [catalog]);
  useEffect(() => {
    if (!preset || !catalog.length) return;
    const f = catalog.find(preset.from);
    const g = catalog.find(preset.to);
    if (f) setFromKey(f.key);
    if (g) setToKey(g.key);
    setAccount(""); setRecipient("");
  }, [preset?.n, catalog.length]);
  const from = catalog.find((x) => x.key === fromKey) || null;
  const to = catalog.find((x) => x.key === toKey) || null;
  const route = from && to ? routeFor(from, to, tier) : null;
  // Each side offers only what a swap can use: "pay" what can start one, "receive" what the
  // chosen token reaches in this environment. A pair with no route is never offered.
  const payable = useMemo(() => catalog.filter(canPayWith), [catalog]);
  const receivable = useMemo(() => (from ? receivableFrom(from, catalog, tier) : catalog), [from, catalog, tier]);
  const routes = (a: SwapToken | null, b: SwapToken | null) => !!a && !!b && routeFor(a, b, tier).kind !== "none";
  // Flipping needs the received token to be a source, and a route back.
  const flippable = !!to && canPayWith(to) && routes(to, from);
  const dexLive = (chain: string) => chain === "stellar" || tier === "public";

  const amountValid = amountFits(amount, from);
  const isNear = route?.kind === "near";
  const isDex = route?.kind === "dex";
  const isUsdt0 = route?.kind === "usdt0";
  const accountValid = !!from && accountOk(from.chain, account);
  const recipientValid = isNear ? !!to && accountOk(to.chain, recipient) : isUsdt0 ? isEvmAddress(recipient) : !recipient.trim() || isAddress("stellar", recipient);
  const memoValid = !memo.trim() || /^\d{1,20}$/.test(memo.trim());
  // A firm quote: the chain's market needs the amount and tokens; NEAR Intents also both addresses.
  // USDT0's quote needs only the amount (the source, once typed, checks its balances too).
  const quotable = !!route && (isDex || isNear || isUsdt0) && amountValid && (!isNear || (accountValid && recipientValid));
  const kind = isNear ? "near" : isUsdt0 ? "usdt0" : "dex";

  const body = (): Record<string, unknown> => {
    const slip = slippage ? { slippageBps: Number(slippage) } : {};
    if (isUsdt0) return { to: route.chain, amount: amount.trim(), ...(accountValid ? { source: account.trim() } : {}) };
    if (isNear) {
      return { originChain: from.chain, originAsset: from.near, destinationChain: to.chain, destinationAsset: to.near, amount: amount.trim(), recipient: recipient.trim(), refundTo: account.trim(), ...slip };
    }
    const chain = from.chain;
    const asset = (tk: SwapToken) => (chain === "stellar" ? tk.symbol : tk.contract || NATIVE_CODES[chain]);
    return {
      chain, amount: amount.trim(),
      ...(chain !== "stellar" ? { sourceAssetCode: asset(from) } : from.contract ? { sourceAssetCode: from.symbol, sourceAssetIssuer: from.contract } : {}),
      destAssetCode: asset(to),
      ...(chain === "stellar" && to.contract ? { destAssetIssuer: to.contract } : {}),
      ...slip,
    };
  };

  // The quote follows the inputs on its own, a moment after the last keystroke; an answer for
  // inputs that have since changed is dropped.
  const quoteKey = quotable ? JSON.stringify(body()) : "";
  const latest = useRef("");
  const ask = (k: string) => {
    latest.current = k;
    setQuote({ status: "loading", data: null, key: k });
    api.quote(kind, JSON.parse(k))
      .then((data) => { if (latest.current === k) setQuote({ status: "ready", data, key: k }); })
      .catch((err) => { if (latest.current === k) setQuote({ status: "error", data: err?.message || null, key: k }); });
  };
  useEffect(() => {
    if (!quoteKey) { latest.current = ""; setQuote({ status: "idle", data: null, key: "" }); return; }
    const h = setTimeout(() => ask(quoteKey), 450);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);

  const fresh = quote.status === "ready" && quote.key === quoteKey ? quote.data : null;
  const num = (v, max = 7) => { const n = Number(v); return Number.isFinite(n) ? new Intl.NumberFormat(lang, { maximumFractionDigits: max }).format(n) : String(v ?? ""); };
  const usd = (v) => (v === null || v === undefined || v === "" ? null : new Intl.NumberFormat(lang, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(v)));
  // What the receive side shows: the quote, else an estimate from the listed prices.
  const out = fresh ? (isNear ? fresh.destination?.amount : isUsdt0 ? fresh.amountReceived : fresh.destination?.estimated) : null;
  // Before the quote: NEAR Intents' listed prices, or 1:1 for USDT0.
  const estimate = !out && amountValid ? (isNear ? estimateOut(amount, from, to) : isUsdt0 ? Number(amount) : null) : null;
  const shownOut = out ?? (estimate !== null ? String(estimate) : "");
  const payUsd = fresh && isNear ? fresh.origin?.amountUsd : amountValid && from?.priceUsd ? Number(amount) * from.priceUsd : null;
  const getUsd = fresh && isNear ? fresh.destination?.amountUsd : estimate !== null && to?.priceUsd ? estimate * to.priceUsd : null;
  const rate = out && amountValid ? Number(out) / Number(amount) : estimate !== null ? estimate / Number(amount) : null;
  const venue = isNear ? w.venueNear : isUsdt0 ? w.venueUsdt0 : isDex ? t.dash.swaps.venues[route.chain] : "";

  // The button: what is missing, or the action.
  const cta = (() => {
    if (!from || !to) return { label: w.ctaSelect, ok: false };
    if (route.kind === "none") return { label: route.reason === "same-token" ? w.ctaSame : route.reason === "production-only" ? w.ctaProduction : w.ctaUnsupported, ok: false };
    if (!amount.trim()) return { label: w.ctaAmount, ok: false };
    if (!amountValid) return { label: w.ctaAmountBad, ok: false };
    if (!accountValid) return { label: fmt(isNear ? w.ctaRefund : w.ctaAccount, { chain: from.chainName }), ok: false };
    if (!recipientValid) return { label: fmt(w.ctaRecipient, { chain: to.chainName }), ok: false };
    if (!memoValid) return { label: w.ctaMemo, ok: false };
    if (quote.status === "loading" || (quotable && !fresh && quote.status !== "error")) return { label: w.ctaQuoting, ok: false };
    if (quote.status === "error") return { label: w.ctaRetry, ok: true, retry: true };
    if (isNear && tier !== "public") return { label: w.ctaProductionOpen, ok: false };
    return { label: isNear ? w.ctaOpen : isUsdt0 ? fmt(w.ctaBridge, { chain: to.chainName }) : fmt(w.ctaSwap, { venue }), ok: true };
  })();

  const create = () => {
    if (cta.retry) { ask(quoteKey); return; }
    if (!cta.ok || busy) return;
    setBusy(true);
    const b = isNear ? body() : isUsdt0 ? { source: account.trim(), to: route.chain, recipient: recipient.trim(), amount: amount.trim() } : {
      ...body(), source: account.trim(),
      ...(from.chain === "stellar" && another && recipient.trim() ? { destination: recipient.trim() } : {}),
      ...(from.chain === "stellar" && another && memo.trim() ? { memo: memo.trim() } : {}),
    };
    api.create(kind, { ...b, idempotencyKey: keys.keyFor(b) })
      .then((rec) => { onCreated(isNear ? "cross" : isUsdt0 ? "usdt0" : "same", rec); setAmount(""); })
      .catch((err) => showToast((err && err.message) || t.dash.swaps.createError, "error"))
      .finally(() => setBusy(false));
  };

  const pick = (tk: SwapToken) => {
    const side = picker;
    setPicker(null);
    // Picking the received token to pay with swaps the two, as swap apps do. The other side
    // stays only while the pair has a route; otherwise it is chosen again, from what reaches.
    if (side === "from") {
      const other = tk.key === toKey ? from : to;
      setFromKey(tk.key);
      setToKey(other && routes(tk, other) ? other.key : null);
      if (tk.chain !== from?.chain) setAccount("");
    } else {
      if (tk.chain !== to?.chain) setRecipient("");
      setToKey(tk.key);
    }
  };
  const flip = () => {
    if (!flippable) return;
    setFlipped((f) => !f);
    setFromKey(toKey); setToKey(fromKey);
    if (shownOut && amountFits(Number(shownOut).toFixed(Math.min(7, to?.decimals ?? 7)).replace(/\.?0+$/, ""), to)) setAmount(Number(shownOut).toFixed(Math.min(7, to?.decimals ?? 7)).replace(/\.?0+$/, ""));
    setAccount(""); setRecipient(""); setMemo(""); setAnother(false);
  };

  const tokenButton = (side: "from" | "to", tk: SwapToken | null) => (
    <button type="button" className={`token-btn${tk ? "" : " empty"}`} onClick={() => setPicker(side)} aria-label={tk ? fmt(w.changeToken, { token: tk.symbol, chain: tk.chainName }) : w.selectToken} aria-haspopup="dialog">
      {tk ? (
        <>
          <TokenMark symbol={tk.symbol} chain={tk.chain} chainName={tk.chainName} size={28} />
          <span className="token-btn-t"><b>{tk.symbol}</b><small>{tk.chainName}</small></span>
        </>
      ) : <span className="token-btn-t"><b>{w.selectToken}</b></span>}
      <svg className="token-btn-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
    </button>
  );

  return (
    <section className="swapper" aria-labelledby="swapper-h">
      <div className="swapper-head">
        <h2 id="swapper-h">{w.title}</h2>
        <SlippageMenu value={slippage} onChange={setSlippage} />
      </div>

      <div className="sp">
        <div className="sp-top"><label htmlFor="swap-pay">{w.pay}</label>{usd(payUsd) && <span className="sp-usd">≈ {usd(payUsd)}</span>}</div>
        <div className="sp-row">
          <input
            id="swap-pay" className="sp-amount" inputMode="decimal" autoComplete="off" placeholder="0"
            value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))}
            aria-invalid={amount.trim() && !amountValid ? true : undefined}
          />
          {tokenButton("from", from)}
        </div>
      </div>

      <button type="button" className={`swap-flip-btn${flipped ? " turned" : ""}`} onClick={flip} aria-label={w.flip} title={w.flip} disabled={!from || !flippable}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" /></svg>
      </button>

      <div className="sp sp-get" aria-busy={quote.status === "loading" || undefined}>
        <div className="sp-top"><span id="swap-get-l">{w.receive}</span>{usd(getUsd) && <span className="sp-usd">≈ {usd(getUsd)}</span>}</div>
        <div className="sp-row">
          <output className={`sp-amount${shownOut ? "" : " is-empty"}${estimate !== null && !out ? " is-estimate" : ""}`} aria-labelledby="swap-get-l" aria-live="polite">
            {quote.status === "loading" && !shownOut ? <Sk className="lg sp-sk" w="60%" /> : shownOut ? <span className="arrive" key={shownOut}>{estimate !== null && !out ? "≈ " : ""}{num(shownOut)}</span> : "0"}
          </output>
          {tokenButton("to", to)}
        </div>
      </div>

      {rate !== null && from && to && (
        <div className={`sq${details ? " open" : ""}`}>
          <div className="sq-head">
            <button type="button" className="sq-rate" onClick={() => setInverse((v) => !v)} title={w.invertRate}>
              {inverse ? `1 ${to.symbol} = ${num(1 / rate, 8)} ${from.symbol}` : `1 ${from.symbol} = ${num(rate, 8)} ${to.symbol}`}
            </button>
            <button type="button" className="sq-toggle" aria-expanded={details} aria-controls="swap-details" onClick={() => setDetails((d) => !d)}>
              <span>{venue}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
              <span className="sr-only">{w.details}</span>
            </button>
          </div>
          <div className="sq-body" id="swap-details" inert={!details}>
            <dl className="sq-rows">
              {fresh && fresh.destination?.minimum != null && <div><dt>{m.minimum}</dt><dd>{num(fresh.destination.minimum)} {to.symbol}</dd></div>}
              {fresh?.fee && <div><dt>{m.fee}</dt><dd>{num(fresh.fee.amount)} {isNear ? fresh.fee.asset : from.chain === "stellar" ? from.symbol : to.symbol} ({fresh.fee.bps} {m.bps})</dd></div>}
              {fresh?.swap && <div><dt>{m.swapped}</dt><dd>{num(fresh.swap.amount)} {from.symbol}</dd></div>}
              {isNear && fresh?.timeEstimateSeconds != null && <div><dt>{w.eta}</dt><dd>{fmt(w.seconds, { n: fresh.timeEstimateSeconds })}</dd></div>}
              {isUsdt0 && fresh?.nativeFee != null && <div><dt>{w.lzFee}</dt><dd>{num(fresh.nativeFee)} XLM</dd></div>}
              {isUsdt0 && Number(fresh?.dust) > 0 && <div><dt>{w.dustNote}</dt><dd>{num(fresh.dust)} {from.symbol}</dd></div>}
              {!isUsdt0 && <div><dt>{w.slippage}</dt><dd>{slippage ? `${Number(slippage) / 100}%` : w.slippageAuto}</dd></div>}
              <div><dt>{w.route}</dt><dd>{venue}</dd></div>
            </dl>
          </div>
        </div>
      )}

      {route && route.kind !== "none" && (
        <div className="swap-accounts">
          <Field
            label={fmt(isNear ? w.refundLabel : w.accountLabel, { chain: from.chainName })}
            value={account} onChange={(e) => setAccount(e.target.value)}
            placeholder={placeholderFor(from.chain)}
            aria-invalid={account.trim() && !accountValid ? true : undefined}
            autoComplete="off" spellCheck={false}
          />
          {(isNear || isUsdt0) && (
            <Field
              label={fmt(w.recipientLabel, { chain: to.chainName })}
              value={recipient} onChange={(e) => setRecipient(e.target.value)}
              placeholder={placeholderFor(to.chain)}
              aria-invalid={recipient.trim() && !recipientValid ? true : undefined}
              autoComplete="off" spellCheck={false}
            />
          )}
          {isDex && from.chain === "stellar" && (
            <>
              <button type="button" className="swap-more" aria-expanded={another} aria-controls="swap-another" onClick={() => setAnother((a) => !a)}>
                {w.another}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              <div className={`swap-another${another ? " open" : ""}`} id="swap-another" inert={!another}>
                <div className="swap-another-in">
                  <Field label={m.destination} hint={m.destinationHint} value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="G…" aria-invalid={recipient.trim() && !recipientValid ? true : undefined} />
                  <Field label={m.memo} hint={m.memoHint} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="123456789" inputMode="numeric" aria-invalid={memoValid ? undefined : true} />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <button type="button" className="btn btn-dark swap-cta" disabled={!cta.ok || busy} onClick={create}>{busy ? w.ctaBusy : cta.label}</button>
      {quote.status === "error" && quote.data && <p className="swap-hint is-error" role="alert">{quote.data}</p>}

      {picker && (
        <TokenPicker
          title={picker === "from" ? w.pickPay : w.pickReceive}
          tokens={picker === "from" ? payable : receivable}
          selectedKey={picker === "from" ? fromKey : toKey}
          onPick={pick}
          onClose={() => setPicker(null)}
          dexLive={dexLive}
        />
      )}
    </section>
  );
}

/* The slippage setting, a small popover from the gear: automatic (the service default) or a
   fixed tolerance. */
function SlippageMenu({ value, onChange }) {
  const t = useT();
  const w = t.dash.swaps.widget;
  const [open, setOpen] = useState(false);
  const pop = usePresence(open, 120);
  const ref = useOutside(() => setOpen(false));
  return (
    <div className="slip" ref={ref} onKeyDown={(e) => { if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); } }}>
      <button type="button" className="icon-mini slip-btn" aria-expanded={open} aria-controls="swap-slippage" onClick={() => setOpen((o) => !o)} aria-label={w.settings} title={w.settings}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>
      </button>
      {pop.mounted && (
        <div className="slip-pop" id="swap-slippage" data-state={pop.state}>
          <p className="slip-t" id="swap-slippage-t">{w.slippage}</p>
          <div className="seg-tabs" role="group" aria-labelledby="swap-slippage-t">
            {SLIPPAGES.map((s) => (
              <button key={s || "auto"} type="button" className={value === s ? "on" : ""} aria-pressed={value === s} onClick={() => { onChange(s); setOpen(false); }}>
                {s ? `${Number(s) / 100}%` : w.slippageAuto}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
