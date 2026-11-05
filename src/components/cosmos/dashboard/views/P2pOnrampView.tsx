/* P2pOnrampView: buying stablecoins with local money from P2P sellers (the Payments API's
   /v1/onramp/p2p, through the dashboard's /api/onramp proxy). The organization fills in a
   purchase for a customer (the currency and payment method they pay with, the stablecoin, the
   amount and the Arbitrum address it is delivered to) and opens it: the Payments API records it
   and answers the hosted purchase, which opens in a new tab with the recipient fixed. The buyer
   signs in, verifies their identity and pays a seller there. A firm quote is available when the
   deployment has the marketplace's integrator ids; the market's price is an estimate.
   The provider is never named here (the rule "Never name a provider"). */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useT, fmt } from "@/lib/i18n/index";
import { onramp } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { usePaged } from "@/components/cosmos/dashboard/hooks";
import { showToast } from "@/components/cosmos/shared";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Field, Sel } from "@/components/cosmos/dashboard/components/Field";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { TokenMark } from "@/components/cosmos/dashboard/components/TokenMark";
import { shortAddress } from "@/lib/payments/payment-link";

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const AMOUNT_RE = /^(0|[1-9]\d{0,14})(\.\d{1,2})?$/;

/** About what `amount` buys at the market price, rounded down: the widget quotes the firm figure. */
const estimateOf = (amount, price) => {
  const n = Number(amount);
  return n > 0 && Number(price) > 0 ? (Math.floor((n / Number(price)) * 100) / 100).toFixed(2) : null;
};

export function P2pOnrampView({ canManage = false, orgId, env = "dev" }) {
  const t = useT();
  const p = t.dash.p2p;
  // undefined while it loads, null when it could not be read.
  const [market, setMarket] = useState<any>(undefined);
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [listError, setListError] = useState(false);
  const [currency, setCurrency] = useState("");
  const [method, setMethod] = useState("");
  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [quote, setQuote] = useState<any>(null);
  const [quoting, setQuoting] = useState(false);
  const [opening, setOpening] = useState(false);

  // An answer for an organization or environment the view has since left is dropped.
  useEffect(() => {
    let current = true;
    setMarket(undefined);
    setSessions(null);
    setQuote(null);
    onramp.get("p2p/market", env, orgId)
      .then((m) => {
        if (!current) return;
        setMarket(m && Array.isArray(m.currencies) ? m : null);
        const first = m?.currencies?.find((c) => c.id === "ARS") ?? m?.currencies?.[0];
        setCurrency(first?.id ?? "");
        setMethod(first?.paymentMethods?.[0]?.id ?? "");
        setToken(m?.tokens?.[0]?.symbol ?? "");
      })
      .catch(() => { if (current) setMarket(null); });
    onramp.get("p2p/sessions", env, orgId)
      .then((r) => { if (current) { setSessions(Array.isArray(r?.data) ? r.data : []); setListError(false); } })
      .catch(() => { if (current) { setSessions([]); setListError(true); } });
    return () => { current = false; };
  }, [orgId, env]);

  const cur = market?.currencies?.find((c) => c.id === currency) ?? null;
  const tokens = market?.tokens ?? [];
  const amountOk = !!cur && AMOUNT_RE.test(amount) && Number(amount) >= Number(cur.minAmount);
  const addressOk = EVM_ADDRESS_RE.test(address);
  const ready = canManage && !!cur && !!method && !!token && amountOk && addressOk;
  const estimate = cur ? estimateOf(amount, cur.price) : null;
  const order = { currency, paymentMethod: method, token, amount, address };

  const changeCurrency = (id) => {
    const next = market?.currencies?.find((c) => c.id === id);
    setCurrency(id);
    setMethod(next?.paymentMethods?.[0]?.id ?? "");
    setQuote(null);
  };

  const getQuote = useCallback(async () => {
    setQuoting(true);
    try {
      setQuote(await onramp.post("p2p/quotes", env, orgId, order));
    } catch (e) {
      // 503: the deployment has no integrator ids; the purchase window still quotes.
      setQuote({ error: e?.status === 503 ? p.quote.unavailable : (e?.message || p.quote.failed) });
    } finally {
      setQuoting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env, orgId, currency, method, token, amount, address]);

  const open = async () => {
    // The tab is claimed before the round trip, so a popup blocker sees the click behind it.
    const tab = window.open("", "_blank");
    setOpening(true);
    try {
      const s = await onramp.post("p2p/sessions", env, orgId, order);
      setSessions((list) => [s, ...(list || [])]);
      if (tab) {
        tab.opener = null;
        tab.location.replace(s.widgetUrl);
        showToast(p.opened, "success");
      } else {
        showToast(p.blocked, "error");
      }
    } catch (e) {
      tab?.close();
      showToast(e?.message || p.openFailed, "error");
    } finally {
      setOpening(false);
    }
  };

  const pg = usePaged(sessions || [], `${orgId}:${env}`);
  const tokenOf = (symbol) => tokens.find((x) => x.symbol === symbol);
  const chainName = market?.chain === "arbitrum" ? "Arbitrum" : "Arbitrum Sepolia";
  const methodLabels = useMemo(() => Object.fromEntries((cur?.paymentMethods ?? []).map((m) => [m.id, m.name])), [cur]);
  const currencyLabels = useMemo(() => Object.fromEntries((market?.currencies ?? []).map((c) => [c.id, `${c.name} (${c.id})`])), [market]);

  return (
    <>
      <ViewHead title={p.title} sub={p.sub} />
      <div className="note-bar">{DI.link}<span>{p.intro}</span></div>
      {env !== "prod" && <div className="note-bar">{DI.link}<span>{p.sandbox}</span></div>}
      {!canManage && <div className="note-bar">{DI.link}<span>{p.readOnly}</span></div>}

      <div className="panel set-panel p2p-form">
        <div className="panel-head"><h3>{p.form.title}</h3></div>
        <div className="set-body">
          {market === undefined && <TableSkeleton label={p.loading} cols={3} />}
          {market === null && <p className="p2p-msg">{p.marketError}</p>}
          {market && market.currencies.length === 0 && <p className="p2p-msg">{p.noMarket}</p>}
          {market && market.currencies.length > 0 && (
            <>
              <div className="set-grid">
                <Sel label={p.form.currency} value={currency} onChange={changeCurrency} options={market.currencies.map((c) => c.id)} labels={currencyLabels} />
                <Sel label={p.form.method} value={method} onChange={(v) => { setMethod(v); setQuote(null); }} options={(cur?.paymentMethods ?? []).map((m) => m.id)} labels={methodLabels} />
                <Sel label={p.form.token} value={token} onChange={(v) => { setToken(v); setQuote(null); }} options={tokens.map((x) => x.symbol)} />
                <Field
                  label={fmt(p.form.amount, { currency })}
                  hint={cur ? fmt(p.form.min, { min: cur.minAmount, currency }) : undefined}
                  value={amount} inputMode="decimal" placeholder={cur?.minAmount}
                  onChange={(e) => { setAmount(e.target.value.trim().replace(",", ".")); setQuote(null); }}
                />
              </div>
              <Field
                label={fmt(p.form.address, { chain: chainName })} hint={p.form.addressHint}
                value={address} placeholder="0x…" spellCheck={false} autoComplete="off"
                onChange={(e) => { setAddress(e.target.value.trim()); setQuote(null); }}
              />
              <div className="p2p-estimate">
                <span>{p.form.estimateLabel}</span>
                <b>{fmt(p.form.estimate, { amount: estimate ?? "0", token })}</b>
              </div>
              {quote && !quote.error && (
                <div className="set-body p2p-quote">
                  <div className="set-row"><span>{p.quote.receive}</span><b>{quote.amountOut} {quote.token}</b></div>
                  <div className="set-row"><span>{p.quote.min}</span><span>{quote.minAmountOut} {quote.token}</span></div>
                  <div className="set-row"><span>{p.quote.rate}</span><span>{quote.exchangeRate} {quote.currency}</span></div>
                  <div className="set-row"><span>{p.quote.fees}</span><span>{quote.fee.amountInToken} {quote.token} · {quote.fee.amountInFiat} {quote.currency}</span></div>
                  <div className="set-row"><span>{p.quote.expires}</span><span>{fmtDateTime(quote.expiresAt)}</span></div>
                </div>
              )}
              {quote?.error && <p className="p2p-msg">{quote.error}</p>}
              <div className="p2p-actions">
                <button type="button" className="btn btn-outline-w btn-sm" disabled={!ready || quoting} onClick={getQuote}>{quoting ? p.form.quoting : p.form.quote}</button>
                <button type="button" className="btn btn-dark btn-sm" disabled={!ready || opening} onClick={open}>{opening ? p.form.opening : p.form.open}</button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>{p.table.title}</h3></div>
        {sessions === null && <TableSkeleton label={p.loading} cols={5} />}
        {sessions !== null && (
          <div className="t-scroll" tabIndex={0}><table className="tx"><thead><tr><th>{p.table.created}</th><th>{p.table.pays}</th><th>{p.table.receives}</th><th>{p.table.address}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
            <tbody>{!listError && pg.slice.map((s) => (
              <tr key={s.id}>
                <td className="cust">{fmtDateTime(s.createdAt)}</td>
                <td className="amt">{s.amount} {s.currency}</td>
                <td className="amt"><span className="cell-mark">{tokenOf(s.token) && <TokenMark symbol={s.token} chain="arb" chainName={chainName} size={22} />}<span>≈ {s.estimatedAmountOut} {s.token}</span></span></td>
                <td><code title={s.address}>{shortAddress(s.address)}</code></td>
                <td><a className="hub-link" href={s.widgetUrl} target="_blank" rel="noopener noreferrer">{p.table.open}</a></td>
              </tr>
            ))}
              <FillRows n={pg.size - (listError ? 0 : pg.count)} cols={5} empty={listError ? p.listError : (sessions.length === 0 ? p.empty : null)} />
            </tbody>
          </table></div>
        )}
        {sessions !== null && <Pagination {...pg} />}
      </div>
    </>
  );
}
