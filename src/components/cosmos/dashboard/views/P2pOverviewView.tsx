/* P2pOverviewView: the P2P market at a glance for the organization. Its figures (orders in
   progress, what its merchant wallets filled in 30 days, its offers taking orders), the market
   itself (how many networks and currencies it runs on, counted from the market's own answer, its
   fee and its windows), the liquidity its wallets hold per network and token, and the orders in
   progress, each with the deadline that runs now and a link to act on it. */
import { useEffect, useMemo, useState } from "react";
import { useT, useLang, fmt } from "@/lib/i18n/index";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime, fmtWhen } from "@/components/cosmos/dashboard/helpers";
import { goFiltered, usePaged } from "@/components/cosmos/dashboard/hooks";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { ViewFigures } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { shortAddress } from "@/components/cosmos/dashboard/components/RecordPreview";
import { CurrencyMark } from "@/components/cosmos/dashboard/components/RampWidget";
import { fromBaseUnits, bpsLabel } from "@/lib/p2p/amounts";
import { isTerminal } from "@/lib/p2p/orders";
import type { P2pAccount, P2pOffer, P2pOrder } from "@/lib/p2p/types";
import { isStale } from "@/components/cosmos/dashboard/views/P2pOffersView";
import {
  p2pApi, useP2pMarket, useP2pList, fiatText, tokenText, usdFigure, durationText, NetworkCell, P2pTokenMark, OrderStatus, OrderCountdown,
} from "@/components/cosmos/dashboard/p2p/shared";

export function P2pOverviewView({ orgId, env = "dev", onGo = () => {} }: { orgId: string; env?: string; onGo?: (v: string) => void }) {
  const t = useT();
  const lang = useLang();
  const p = t.p2p.overview;
  const market = useP2pMarket(env, orgId);
  const merchant = useP2pList<P2pOrder>("merchant/orders", env, orgId, 15_000);
  const client = useP2pList<P2pOrder>("orders", env, orgId, 15_000);
  const offers = useP2pList<P2pOffer>("offers", env, orgId);
  const accounts = useP2pList<P2pAccount>("accounts", env, orgId);
  const [chains, setChains] = useState<P2pAccount[] | null>(null);
  useEffect(() => {
    if (accounts.loading) return;
    let alive = true;
    Promise.all(accounts.rows.map((a) => p2pApi.get(`accounts/${encodeURIComponent(a.id)}`, env, orgId).catch(() => null)))
      .then((res) => { if (alive) setChains(res.filter(Boolean)); });
    return () => { alive = false; };
  }, [accounts.loading, accounts.rows, env, orgId]);

  const now = Date.now();
  const month = now - 30 * 86_400_000;
  const live = [...merchant.rows.map((o) => ({ o, side: "merchant" as const })), ...client.rows.map((o) => ({ o, side: "client" as const }))]
    .filter(({ o }) => !isTerminal(o.status))
    .sort((a, b) => Date.parse(a.o.deadlines?.payBy ?? a.o.createdAt) - Date.parse(b.o.deadlines?.payBy ?? b.o.createdAt));
  const filled = merchant.rows.filter((o) => o.status === "completed" && Date.parse(o.createdAt) > month);
  const filledTokens = filled.reduce((s, o) => s + Number(o.tokenAmount || 0), 0);
  const activeOffers = offers.rows.filter((o) => o.active && !isStale(o, now)).length;

  // Liquidity per network and token, every wallet together.
  const liquidity = useMemo(() => {
    const by = new Map<string, { network: string; symbol: string; free: number; locked: number; wallets: number }>();
    for (const a of chains ?? []) for (const c of a.chains ?? []) for (const b of c.balances) {
      const key = `${c.network}:${b.symbol}`;
      const row = by.get(key) ?? { network: c.network, symbol: b.symbol, free: 0, locked: 0, wallets: 0 };
      row.free += Number(fromBaseUnits(b.freeUnits, b.decimals));
      row.locked += Number(fromBaseUnits(b.lockedUnits, b.decimals));
      if (c.matcher) row.wallets += 1;
      by.set(key, row);
    }
    return [...by.values()].filter((r) => r.free > 0 || r.locked > 0 || r.wallets > 0).sort((a, b) => b.free + b.locked - (a.free + a.locked));
  }, [chains]);
  const pg = usePaged(live, String(live.length));
  const liqLoading = accounts.loading || chains === null;

  return (
    <>
      <ViewHead title={p.title} />
      <ViewFigures
        label={p.figuresLabel} loading={merchant.loading || client.loading || offers.loading} failed={merchant.error && client.error}
        items={[
          { key: "live", label: p.figures.live, value: live.length, sub: p.figures.liveSub },
          { key: "filled", label: p.figures.filled, value: filled.length, sub: fmt(p.figures.filledSub, { amount: usdFigure(filledTokens, lang) }) },
          { key: "offers", label: p.figures.offers, value: activeOffers, sub: fmt(p.figures.offersSub, { n: offers.rows.length }) },
          { key: "wallets", label: p.figures.wallets, value: accounts.rows.length },
        ]}
      />

      <section className="hub-section p2p-sec" aria-labelledby="p2p-mkt-t">
        <div className="hub-section-head"><h2 id="p2p-mkt-t">{p.market.title}</h2></div>
        <ViewFigures
          label={p.market.title} loading={market === undefined} failed={market === null}
          items={market ? [
            { key: "networks", label: p.market.networks, value: market.networks.length, sub: p.market.networksSub },
            { key: "currencies", label: p.market.currencies, value: market.currencies.length, sub: market.currencies.map((c) => c.code).join(" · ") },
            { key: "fee", label: p.market.fee, value: bpsLabel(market.protocolFeeBps, lang), sub: p.market.feeSub },
            { key: "window", label: p.market.window, value: durationText(t, market.windows.paymentSeconds), sub: fmt(p.market.bond, { rate: bpsLabel(market.sellBondBps, lang) }) },
          ] : []}
        />
      </section>

      <section className="hub-section p2p-sec" aria-labelledby="p2p-liq-t">
        <div className="hub-section-head">
          <h2 id="p2p-liq-t">{p.liquidity.title}</h2>
          <div className="vh-actions"><button type="button" className="btn btn-outline-w btn-sm" onClick={() => onGo("p2pLiquidity")}>{DI.liquidity} {p.liquidity.manage}</button></div>
        </div>
        <div className="panel">
          {liqLoading && <TableSkeleton label={t.p2p.liquidity.loading} cols={5} />}
          {!liqLoading && (
            <div className="t-scroll" tabIndex={0}><table className="tx p2p-t"><thead><tr>
              <th>{t.p2p.liquidity.balances.token}</th><th>{t.dash.filters.network}</th><th>{t.p2p.liquidity.balances.free}</th><th>{t.p2p.liquidity.balances.locked}</th><th>{p.liquidity.authorised}</th>
            </tr></thead>
              <tbody>{liquidity.map((r) => (
                <tr key={`${r.network}:${r.symbol}`} className="row-click" onClick={() => onGo("p2pLiquidity")}>
                  <td><span className="cell-mark"><P2pTokenMark market={market} network={r.network} symbol={r.symbol} /><span>{r.symbol}</span></span></td>
                  <td><NetworkCell market={market} id={r.network} /></td>
                  <td className="amt">{tokenText(r.free, r.symbol, lang)}</td>
                  <td className="amt">{tokenText(r.locked, r.symbol, lang)}</td>
                  <td className="cust">{r.wallets === 1 ? p.liquidity.walletsOne : fmt(p.liquidity.wallets, { n: r.wallets })}</td>
                </tr>
              ))}
                <FillRows n={Math.max(0, 3 - liquidity.length)} cols={5} />
              </tbody>
            </table></div>
          )}
        </div>
      </section>

      <section className="hub-section p2p-sec" aria-labelledby="p2p-live-t">
        <div className="hub-section-head">
          <h2 id="p2p-live-t">{p.orders.title}</h2>
          <div className="vh-actions"><button type="button" className="btn btn-outline-w btn-sm" onClick={() => goFiltered(onGo, "p2pOrders", { status: "live" })}>{DI.p2p} {p.orders.all}</button></div>
        </div>
        <div className="panel">
          {(merchant.loading || client.loading) && <TableSkeleton label={t.p2p.orders.loading} cols={6} />}
          {!(merchant.loading || client.loading) && (
            <div className="t-scroll" tabIndex={0}><table className="tx p2p-t"><thead><tr>
              <th>{t.p2p.orders.head.order}</th><th>{t.p2p.orders.head.fiat}</th><th>{t.p2p.orders.head.status}</th><th>{t.p2p.orders.head.left}</th><th>{p.orders.side}</th><th>{t.p2p.orders.head.created}</th>
            </tr></thead>
              <tbody>{pg.slice.map(({ o, side }) => (
                <tr key={`${side}:${o.id}`} className="row-click" onClick={() => goFiltered(onGo, "p2pOrders", { open: o.id })}>
                  <td className="tid" onClick={(e) => e.stopPropagation()}>
                    <span className="cell-mark"><span className="am-sq">{DI.p2p}</span>
                      <RecordLink href={`/dashboard?view=p2pOrders&open=${encodeURIComponent(o.id)}`} onOpen={() => goFiltered(onGo, "p2pOrders", { open: o.id })} copy={o.id} title={o.id}>
                        <span>{t.p2p.kinds[o.kind]} <code>{shortAddress(o.id)}</code></span>
                      </RecordLink>
                    </span>
                  </td>
                  <td className="amt"><span className="cell-mark"><CurrencyMark id={o.currency} size={20} /><span>{fiatText(o.fiatAmount, o.currency, lang)}</span></span></td>
                  <td><OrderStatus status={o.status} /></td>
                  <td className="cust"><OrderCountdown order={o} compact /></td>
                  <td className="cust">{t.p2p.orders.tabs[side]}</td>
                  <td className="cust">{fmtWhen(o.createdAt)}</td>
                </tr>
              ))}
                <FillRows n={pg.size - pg.count} cols={6} empty={merchant.error && client.error ? t.p2p.orders.listError : null} />
              </tbody>
            </table></div>
          )}
          {!(merchant.loading || client.loading) && <Pagination {...pg} />}
        </div>
      </section>
    </>
  );
}
