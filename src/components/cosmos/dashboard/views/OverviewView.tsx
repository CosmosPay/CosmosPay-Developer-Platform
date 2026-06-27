import { useState, useEffect } from "react";
import { useT, fmt } from "@/lib/i18n/index";
import { metrics as metricsApi } from "@/lib/api-client";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { sl, notifIcon, fmtWhen, humanizeLocal, notifMeta } from "@/components/cosmos/dashboard/helpers";
import { Spark } from "@/components/cosmos/dashboard/components/Spark";
import { AreaChart } from "@/components/cosmos/dashboard/components/AreaChart";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";

const STATUS_PILL = { SUCCEEDED: "ok", FAILED: "fail", EXPIRED: "fail", CANCELLED: "fail", PENDING: "ref", SUBMITTED: "ref" };
const short = (a) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);

export function OverviewView({ org, userName, notifications, onViewActivity, env = "dev" }) {
  const t = useT();
  const o = t.dash.overview;
  const cx = t.dash.cosmos;
  const nt = t.dash.notifications;
  const [sum, setSum] = useState(null);
  const [range, setRange] = useState("30d");
  const greet = userName ? userName.split(" ")[0] : "there";

  useEffect(() => {
    let alive = true;
    metricsApi.summary(env).then((d) => { if (alive) setSum(d); }).catch(() => { if (alive) setSum(null); });
    return () => { alive = false; };
  }, [env]);

  const totals = (sum && sum.totals) || {};
  const vol = (sum && sum.volume) || [];
  const primary = vol[0];
  const allSeries = ((sum && sum.series) || []).map((s) => Number(s.volume) || 0);
  const series = range === "7d" ? allSeries.slice(-7) : allSeries;
  const recent = (sum && sum.recent) || [];

  const cards = [
    { k: "gross", v: primary ? `${primary.amount} ${primary.asset}` : "—" },
    { k: "net", v: totals.all ?? 0 },
    { k: "success", v: totals.succeeded ?? 0 },
    { k: "newCust", v: (sum && sum.customers) ?? 0 },
  ];

  return (
    <>
      <ViewHead title={fmt(o.greeting, { name: greet })} sub={fmt(o.sub, { org: org.name })} />
      <div className="metrics">
        {cards.map((m) => (
          <div className="metric" key={m.k}>
            <div className="ml">{o.metrics[m.k]}</div>
            <div className="mv">{m.v}</div>
            <Spark data={series.length ? series : [0, 0, 0]} up={true} />
          </div>
        ))}
      </div>
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head"><h3>{o.grossVolume}</h3><div className="rng">{["7d", "30d"].map((r) => <button key={r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>{r}</button>)}</div></div>
        <div className="chart-wrap"><AreaChart data={series.length ? series : [0, 0]} /></div>
      </div>
      <div className="panels">
        <div className="panel"><div className="panel-head"><h3>{o.recentPayments}</h3></div>
          {recent.length > 0 ? (
            <div className="t-scroll"><table className="tx"><thead><tr><th>{o.tableHead.payment}</th><th>{o.tableHead.customer}</th><th>{o.tableHead.amount}</th><th>{o.tableHead.status}</th><th>{o.tableHead.date}</th></tr></thead>
              <tbody>{recent.map((p) => (
                <tr key={p.id}>
                  <td className="tid">{p.id}</td>
                  <td className="cust">{short(p.destination)}</td>
                  <td className="amt">{p.amount || "—"} {p.asset}</td>
                  <td><Pill st={STATUS_PILL[p.status] || "ref"} label={(t.dash.paylinks.status && t.dash.paylinks.status[p.status]) || p.status} /></td>
                  <td className="cust">{fmtDateTime(p.createdAt)}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <div className="empty">{cx.empty}</div>}
        </div>
        <div className="panel"><div className="panel-head"><h3>{o.recentActivity}</h3>{onViewActivity && <button className="link-btn" onClick={onViewActivity}>{nt.viewAll}</button>}</div>
          <div className="act-list">
            {(notifications || []).slice(0, 6).map((n) => (<div className="act" key={n.id}><div className="am">{notifIcon(n.type)}</div><div><div className="at">{(nt.types && nt.types[n.type]) || n.title}</div><div className="as">{notifMeta(n) || humanizeLocal(n.message)}</div></div><div className="ax">{fmtWhen(n.createdAt)}</div></div>))}
            {!(notifications || []).length && <div className="empty" style={{ padding: "26px 12px" }}>{nt.empty}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
