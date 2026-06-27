import { useRef } from "react";
import { useT } from "@/lib/i18n/index";
import { notifIcon, fmtWhen, humanizeLocal, notifLocation, notifIp, deviceLabel } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows } from "@/components/cosmos/dashboard/hooks";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";

export function NotificationsView({ notifications, loading, error }) {
  const t = useT();
  const nt = t.dash.notifications;
  const rows = notifications || [];
  const pg = usePaged(rows, rows.length);
  const tref = useRef(null); useGsapRows(tref, pg.page);
  const show = !loading && !error && rows.length > 0;
  return (
    <>
      <ViewHead title={nt.title} sub={nt.subtitle} />
      <div className="panel">
        {show && (
          <div className="t-scroll" ref={tref}><table className="tx"><thead><tr><th>{t.dash.webhooks.tableHead.event}</th><th>{nt.location}</th><th>{nt.ip}</th><th>{nt.device}</th><th>{t.dash.overview.tableHead.date}</th></tr></thead>
            <tbody>{pg.slice.map((n) => (
              <tr key={n.id}>
                <td><div className="cust-cell"><span className="am-sq">{notifIcon(n.type)}</span><div><b>{(nt.types && nt.types[n.type]) || n.title}</b>{n.message ? <div className="as" style={{ marginTop: 2 }}>{humanizeLocal(n.message)}</div> : null}</div></div></td>
                <td className="cust">{notifLocation(n) || "—"}</td>
                <td className="tid">{notifIp(n) || "—"}</td>
                <td className="cust">{deviceLabel(n) || "—"}</td>
                <td className="cust">{fmtWhen(n.createdAt)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        {loading && <div className="empty">…</div>}
        {!loading && error && <div className="empty">{nt.loadError}</div>}
        {!loading && !error && !rows.length && <div className="empty">{nt.empty}</div>}
        {show && <Pagination {...pg} />}
      </div>
    </>
  );
}
