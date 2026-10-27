import { useState, useEffect, useRef } from "react";
import { ConfirmModal, showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { metrics as metricsApi, paymentIntents as payApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { paymentTone } from "@/components/cosmos/dashboard/components/StatusIcon";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { PaymentPreview, shortAddress } from "@/components/cosmos/dashboard/components/RecordPreview";
import { goFiltered, usePaged, useGsapRows, openRecord, recordHref } from "@/components/cosmos/dashboard/hooks";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { PayLinkRowActions, PaymentAmount, STATUS_PILL, amountLabel } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { CHAINS, assetLabel as chainAsset, isChain, networkName } from "@/lib/chains";
import { TokenMark } from "@/components/cosmos/dashboard/components/TokenMark";
import { TableSkeleton, ListSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";

const num = (s) => { const n = Number(s); return Number.isFinite(n) ? n : 0; };

/* Each balance opens the settled payments behind it (Payments, filtered to settled, its network and
   its asset); the total opens every settled payment. With nothing settled yet, whoever may create
   payments is offered the payment link that starts it. */
export function BalancesView({ canManage = false, env = "dev", onGo = (v) => {} }) {
  const t = useT();
  const b = t.dash.balances;
  const cx = t.dash.cosmos;
  const pl = t.dash.paylinks;
  const [bals, setBals] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = () => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    payApi.remove(toDelete.id, env)
      .then(() => { setRecent((r) => r.filter((x) => x.id !== toDelete.id)); setToDelete(null); })
      .catch((err) => showToast((err && err.message) || cx.delete, "error"))
      .finally(() => setDeleting(false));
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    // The upstream payments list isn't network-scoped, so request a wider page and
    // filter to the active environment's network here.
    const wantNet = env === "prod" ? "public" : "testnet";
    setFailed(false);
    Promise.all([
      metricsApi.balances(env).catch(() => { if (alive) setFailed(true); return { data: [] }; }),
      payApi.list(env, { status: "SUCCEEDED", take: 100 }).catch(() => { if (alive) setFailed(true); return { data: [] }; }),
    ]).then(([bal, pay]) => {
      if (!alive) return;
      setBals((bal && Array.isArray(bal.data)) ? bal.data : []);
      const rows = (pay && Array.isArray(pay.data)) ? pay.data : [];
      setRecent(rows.filter((p) => !p.network || p.network === wantNet));
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [env]);

  const pg = usePaged(recent, env);
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + recent.length);
  const max = Math.max(1, ...bals.map((x) => num(x.amount)));
  const totalSettlements = bals.reduce((a, x) => a + (x.count || 0), 0);
  const networks = new Set(bals.map((x) => x.chain)).size;
  // A balance names its asset by the chain's coin for "native" and by the code of a CODE:ISSUER
  // asset; its mark and name go by that.
  const code = (bal) => (isChain(bal.chain) ? chainAsset(bal.chain, bal.asset) : String(bal.asset).split(":")[0]);
  const settled = (bal = null) => goFiltered(onGo, "payments", {
    status: "SUCCEEDED",
    ...(bal && CHAINS.includes(bal.chain || "stellar") ? { chain: bal.chain || "stellar" } : {}),
    // the asset by its ticker (the search reads the payment's asset as shown) or CODE:ISSUER
    ...(bal && bal.asset ? { q: bal.asset === "native" ? code(bal) : String(bal.asset) } : {}),
  });

  return (
    <>
      <ViewHead title={b.title} />
      {loading && <ListSkeleton label={cx.loading} rows={2} pairs={2} />}
      {!loading && (
        <div className="bal-grid">
          {bals.map((bal) => (
            <button type="button" className="bal-card" key={`${bal.chain || "stellar"}:${bal.asset}`} onClick={() => settled(bal)}>
              {/* The asset with its logo and the network it settles on, as text (no chip). */}
              <div className="bal-asset">
                <TokenMark symbol={code(bal)} chain={bal.chain || "stellar"} chainName={networkName(bal.chain || "stellar")} size={28} />
                <span className="bal-asset-name"><b>{code(bal)}</b> {networkName(bal.chain || "stellar")}</span>
              </div>
              <div className="bal-amt">{bal.amount}</div>
              <div className="bal-fiat">{num(bal.pending) > 0 ? `${cx.pending}: ${bal.pending}` : `${bal.count}× ${cx.received}`}</div>
              <div className="bal-bar"><span style={{ width: Math.round((num(bal.amount) / max) * 100) + "%" }} /></div>
            </button>
          ))}
          {/* Amounts in different assets do not add up: the black card counts settlements instead. */}
          {bals.length > 0 ? (
            <button type="button" className="bal-card total" onClick={() => settled()}>
              <div className="bal-asset"><span className="bal-total-k">{b.total}</span></div>
              <div className="bal-amt">{totalSettlements}</div>
              <div className="bal-fiat">{fmt(b.across, { assets: bals.length, networks })}</div>
            </button>
          ) : (
            <div className="bal-card total">
              <div className="bal-asset"><span className="bal-total-k">{b.total}</span></div>
              <div className="bal-amt">{totalSettlements}</div>
            </div>
          )}
        </div>
      )}
      <section className="hub-section bal-recent" aria-labelledby="bal-recent-t">
      <div className="hub-section-head"><h2 id="bal-recent-t">{b.recent}</h2>{recent.length > 0 && <button type="button" className="hub-link" onClick={() => settled()}>{t.dash.overview.hub.viewAll}</button>}</div>
      <div className="panel">
        {loading && <TableSkeleton label={cx.loading} cols={6} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx"><thead><tr><th>{b.tableHead.transaction}</th><th>{b.tableHead.type}</th><th>{b.tableHead.amount}</th><th>{b.tableHead.status}</th><th>{b.tableHead.date}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
            <tbody>{pg.slice.map((p) => (
              <tr key={p.id} className="row-click" onClick={() => openRecord("payment", p.id)}>
                <td className="tid"><RecordLink href={recordHref("payment", p.id)} onOpen={() => openRecord("payment", p.id)} copy={p.id} preview={() => <PaymentPreview p={p} />} title={p.id}><code>{shortAddress(p.id)}</code></RecordLink></td>
                <td className="cust">{b.payment}</td>
                <td className="amt"><PaymentAmount intent={p} pl={pl} /></td>
                <td><Pill st={STATUS_PILL[p.status] || "ref"} tone={paymentTone(p.status)} label={(t.dash.paylinks.status && t.dash.paylinks.status[p.status]) || p.status} /></td>
                <td className="cust">{fmtDateTime(p.createdAt)}</td>
                <PayLinkRowActions intent={p} t={t} pl={pl} onView={(x) => openRecord("payment", x.id)} canManage={canManage} onDelete={setToDelete} />
              </tr>
            ))}
              <FillRows n={pg.size - pg.count} cols={6} empty={failed ? cx.loadError : null} />
            </tbody>
          </table></div>
        )}
        {!loading && <Pagination {...pg} />}
      </div>
      </section>
      {toDelete && <ConfirmModal title={pl.detail.deleteTitle} body={fmt(pl.detail.deleteBody, { id: toDelete.id })} confirmLabel={pl.detail.deleteConfirm} cancelLabel={t.dash.common.cancel} onConfirm={confirmDelete} onClose={() => setToDelete(null)} />}
    </>
  );
}
