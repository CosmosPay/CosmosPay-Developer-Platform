import { useState, useEffect } from "react";
import { ConfirmModal, showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { metrics as metricsApi, paymentIntents as payApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { PayLinkDetailModal, PayLinkRowActions, STATUS_PILL, amountLabel } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { assetLabel as chainAsset, isChain, networkName } from "@/lib/chains";
import { TokenMark } from "@/components/cosmos/dashboard/components/TokenMark";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";

const num = (s) => { const n = Number(s); return Number.isFinite(n) ? n : 0; };

export function BalancesView({ canManage = false, env = "dev" }) {
  const t = useT();
  const b = t.dash.balances;
  const cx = t.dash.cosmos;
  const pl = t.dash.paylinks;
  const [bals, setBals] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
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
    setDetail(null);
    // The upstream payments list isn't network-scoped, so request a wider page and
    // filter to the active environment's network here.
    const wantNet = env === "prod" ? "public" : "testnet";
    Promise.all([
      metricsApi.balances(env).catch(() => ({ data: [] })),
      payApi.list(env, { status: "SUCCEEDED", take: 50 }).catch(() => ({ data: [] })),
    ]).then(([bal, pay]) => {
      if (!alive) return;
      setBals((bal && Array.isArray(bal.data)) ? bal.data : []);
      const rows = (pay && Array.isArray(pay.data)) ? pay.data : [];
      setRecent(rows.filter((p) => !p.network || p.network === wantNet).slice(0, 8));
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [env]);

  const max = Math.max(1, ...bals.map((x) => num(x.amount)));
  const totalSettlements = bals.reduce((a, x) => a + (x.count || 0), 0);
  const networks = new Set(bals.map((x) => x.chain)).size;
  // A balance names its asset by the chain's coin for "native" and by the code of a CODE:ISSUER
  // asset; its mark and name go by that.
  const code = (bal) => (isChain(bal.chain) ? chainAsset(bal.chain, bal.asset) : String(bal.asset).split(":")[0]);

  return (
    <>
      <ViewHead title={b.title} />
      {loading && <TableSkeleton label={cx.loading} />}
      {!loading && (
        <div className="bal-grid">
          {bals.map((bal) => (
            <div className="bal-card" key={`${bal.chain || "stellar"}:${bal.asset}`}>
              {/* The asset with its logo and the network it settles on, as text (no chip). */}
              <div className="bal-asset">
                <TokenMark symbol={code(bal)} chain={bal.chain || "stellar"} chainName={networkName(bal.chain || "stellar")} size={28} />
                <span className="bal-asset-name"><b>{code(bal)}</b> {networkName(bal.chain || "stellar")}</span>
              </div>
              <div className="bal-amt">{bal.amount}</div>
              <div className="bal-fiat">{num(bal.pending) > 0 ? `${cx.pending}: ${bal.pending}` : `${bal.count}× ${cx.received}`}</div>
              <div className="bal-bar"><span style={{ width: Math.round((num(bal.amount) / max) * 100) + "%" }} /></div>
            </div>
          ))}
          {/* Amounts in different assets do not add up: the black card counts settlements instead. */}
          <div className="bal-card total">
            <div className="bal-asset"><span className="bal-total-k">{b.total}</span></div>
            <div className="bal-amt">{totalSettlements}</div>
            <div className="bal-fiat">{bals.length ? fmt(b.across, { assets: bals.length, networks }) : cx.empty}</div>
          </div>
        </div>
      )}
      <div className="panel"><div className="panel-head"><h3>{b.recent}</h3></div>
        {!loading && recent.length > 0 && (
          <div className="t-scroll" tabIndex={0}><table className="tx"><thead><tr><th>{b.tableHead.transaction}</th><th>{b.tableHead.type}</th><th>{b.tableHead.amount}</th><th>{b.tableHead.status}</th><th>{b.tableHead.date}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
            <tbody>{recent.map((p) => (
              <tr key={p.id} className="row-click" onClick={() => setDetail(p)}>
                <td className="tid">{p.id}</td>
                <td className="cust">{b.payment}</td>
                <td className="amt">+{amountLabel(p, pl)}</td>
                <td><Pill st={STATUS_PILL[p.status] || "ref"} label={(t.dash.paylinks.status && t.dash.paylinks.status[p.status]) || p.status} /></td>
                <td className="cust">{fmtDateTime(p.createdAt)}</td>
                <PayLinkRowActions intent={p} t={t} pl={pl} onView={setDetail} canManage={canManage} onDelete={setToDelete} />
              </tr>
            ))}</tbody>
          </table></div>
        )}
        {!loading && !recent.length && <div className="empty">{cx.empty}</div>}
      </div>
      {detail && <PayLinkDetailModal pl={pl} intent={detail} env={env} canManage={canManage} onClose={() => setDetail(null)} onDeleted={(id) => { setRecent((r) => r.filter((x) => x.id !== id)); setDetail(null); }} />}
      {toDelete && <ConfirmModal title={pl.detail.deleteTitle} body={fmt(pl.detail.deleteBody, { id: toDelete.id })} confirmLabel={pl.detail.deleteConfirm} cancelLabel={t.dash.common.cancel} onConfirm={confirmDelete} onClose={() => setToDelete(null)} />}
    </>
  );
}
