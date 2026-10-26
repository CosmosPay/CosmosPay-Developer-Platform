import { useRef } from "react";
import { useT } from "@/lib/i18n/index";
import { notifIcon, notifMd, fmtWhen, humanizeLocal, notifLocation, notifIp, deviceLabel } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows, goFiltered } from "@/components/cosmos/dashboard/hooks";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";

/* Where a notification leads: the record it is about (its id in the metadata, opened by the view's
   `open` request) or, without one, the view that lists that kind of thing. Sign-ins and deleted
   records lead nowhere, so they get no action. */
function targetOf(n): [string, Record<string, string>] | null {
  const md = notifMd(n);
  const open = (view: string, id?: string) => [view, id ? { open: String(id) } : {}] as [string, Record<string, string>];
  switch (n.type) {
    case "payment.created": return open("payments", md.id);
    case "swap.created": return open("swaps", md.id);
    case "liquidity.deposit.created":
    case "liquidity.withdraw.created": return open("liquidity", md.id);
    case "support.reply": return open("support", md.ticketId);
    case "apikey.created":
    case "apikey.updated":
    case "apikey.deleted": return ["developers", {}];
    default: return null;
  }
}

export function NotificationsView({ notifications, loading, error, onGo = (v) => {} }) {
  const t = useT();
  const nt = t.dash.notifications;
  const rows = notifications || [];
  const pg = usePaged(rows, rows.length);
  const tref = useRef(null); useGsapRows(tref, pg.page);
  const show = !loading;
  const follow = (n) => { const to = targetOf(n); if (to) goFiltered(onGo, to[0], to[1]); };
  return (
    <>
      <ViewHead title={nt.title} />
      <div className="panel">
        {show && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx"><thead><tr><th>{t.dash.webhooks.tableHead.event}</th><th>{nt.location}</th><th>{nt.ip}</th><th>{nt.device}</th><th>{t.dash.overview.tableHead.date}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
            <tbody>{!error && pg.slice.map((n) => {
              const to = targetOf(n);
              return (
                <tr key={n.id} className={to ? "row-click" : undefined} onClick={to ? () => follow(n) : undefined}>
                  <td><div className="cust-cell"><span className="am-sq">{notifIcon(n.type)}</span><div><b>{(nt.types && nt.types[n.type]) || n.title}</b>{n.message ? <div className="as" style={{ marginTop: 2 }}>{humanizeLocal(n.message)}</div> : null}</div></div></td>
                  <td className="cust">{notifLocation(n) || "-"}</td>
                  <td className="tid">{notifIp(n) ? <RecordLink copy={notifIp(n)}>{notifIp(n)}</RecordLink> : "-"}</td>
                  <td className="cust">{deviceLabel(n) || "-"}</td>
                  <td className="cust">{fmtWhen(n.createdAt)}</td>
                  {/* The row opens it too; the button is the keyboard's way in. */}
                  <td style={{ textAlign: "right" }}>{to && <button type="button" className="link-btn" onClick={(e) => { e.stopPropagation(); follow(n); }}>{t.dash.common.open}</button>}</td>
                </tr>
              );
            })}
              <FillRows n={pg.size - (error ? 0 : pg.count)} cols={6} empty={error ? nt.loadError : !rows.length ? nt.empty : null} />
            </tbody>
          </table></div>
        )}
        {loading && <TableSkeleton label={t.dash.cosmos.loading} />}
        {show && <Pagination {...pg} />}
      </div>
    </>
  );
}
