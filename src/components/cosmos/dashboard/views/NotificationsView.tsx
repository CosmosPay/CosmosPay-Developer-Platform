import { useRef, useState } from "react";
import { useT, fmt } from "@/lib/i18n/index";
import { showToast } from "@/components/cosmos/shared";
import { IcCopy } from "@/components/cosmos/icons";
import { DI } from "@/components/cosmos/dashboard/icons";
import { notifIcon, notifMd, fmtWhen, humanizeLocal, notifLocation, notifIp, deviceLabel } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows, goFiltered, useListFilters } from "@/components/cosmos/dashboard/hooks";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { PreviewCard } from "@/components/cosmos/dashboard/components/RecordPreview";
import { countBy, inRange, matchesQuery } from "@/lib/dashboard-filters";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { RecordDetail } from "@/components/cosmos/dashboard/components/RecordDetail";
import { ViewFigures } from "@/components/cosmos/dashboard/components/ActivityPanel";

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

const NOTIF_DEFAULTS = { q: "", type: "all", date: "any" };

export function NotificationsView({ notifications, loading, error, onGo = (v) => {} }) {
  const t = useT();
  const nt = t.dash.notifications;
  const fl = t.dash.filters;
  const cm = t.dash.common;
  const all = notifications || [];
  const { filters, set, reset, active } = useListFilters(NOTIF_DEFAULTS);
  const typeName = (n) => (nt.types && nt.types[n.type]) || n.title;
  const matches = (n, skip) =>
    (skip === "type" || filters.type === "all" || n.type === filters.type) &&
    inRange(n.createdAt, filters.date) &&
    matchesQuery([typeName(n), n.message, notifLocation(n), notifIp(n), deviceLabel(n)], filters.q);
  const rows = all.filter((n) => matches(n, null));
  const typeCounts = countBy(all.filter((n) => matches(n, "type")), (n) => n.type);
  const types = [...new Set(all.map((n) => n.type).filter(Boolean))];
  // A new notification arriving keeps the page on screen; a filter starts it over.
  const pg = usePaged(rows, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page);
  const show = !loading;
  const follow = (n) => { const to = targetOf(n); if (to) goFiltered(onGo, to[0], to[1]); };
  const copy = (v) => navigator.clipboard?.writeText(v).then(() => showToast(t.toasts.copied)).catch(() => {});
  // A row opens its detail (as every list's); "Open" goes straight to what it names.
  const [open, setOpen] = useState(null);
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const signIns = all.filter((n) => n.type === "auth.login").length;
  return (
    <>
      <ViewHead title={nt.title} />
      {/* Its figures first, as every view: all of them, this week's, sign-ins and the rest. */}
      <ViewFigures
        label={nt.title} loading={loading} failed={!!error}
        items={[
          { key: "total", label: nt.figures.total, value: all.length },
          { key: "week", label: nt.figures.week, value: all.filter((n) => new Date(n.createdAt).getTime() >= weekAgo).length },
          { key: "signIns", label: nt.figures.signIns, value: signIns },
          { key: "changes", label: nt.figures.changes, value: all.length - signIns },
        ]}
      />
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={nt.searchPlaceholder}
        selects={[{ key: "type", label: fl.kind, value: filters.type, onChange: (v) => set("type", v), options: [{ key: "all", label: fl.allKinds }, ...types.map((k) => ({ key: k, label: (nt.types && nt.types[k]) || k, count: typeCounts[k] || 0 }))] }]}
        date={filters.date} onDate={(v) => set("date", v)}
        active={active} onReset={reset}
        shown={rows.length} total={loading ? undefined : all.length} loading={loading}
      />
      <div className="panel">
        {show && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx"><thead><tr><th>{t.dash.webhooks.tableHead.event}</th><th>{nt.location}</th><th>{nt.ip}</th><th>{nt.device}</th><th>{t.dash.overview.tableHead.date}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
            <tbody>{!error && pg.slice.map((n) => {
              const to = targetOf(n);
              return (
                <tr key={n.id} className="row-click" onClick={() => setOpen(n)}>
                  {/* The notification opens its detail and previews itself on hover. */}
                  <td className="tid"><div className="cust-cell"><span className="am-sq">{notifIcon(n.type)}</span><div>
                    <RecordLink onOpen={() => setOpen(n)} preview={() => <PreviewCard label={nt.title} title={typeName(n)} wrap headline={<b>{typeName(n)}</b>} fields={[[nt.location, notifLocation(n) || "-"], [nt.device, deviceLabel(n) || "-"], [t.dash.overview.tableHead.date, fmtWhen(n.createdAt)]]} />}><b>{typeName(n)}</b></RecordLink>
                    {n.message ? <div className="as" style={{ marginTop: 2 }}>{humanizeLocal(n.message)}</div> : null}
                  </div></div></td>
                  <td className="cust">{notifLocation(n) || "-"}</td>
                  <td className="tid">{notifIp(n) ? <RecordLink copy={notifIp(n)}>{notifIp(n)}</RecordLink> : "-"}</td>
                  <td className="cust">{deviceLabel(n) || "-"}</td>
                  <td className="cust">{fmtWhen(n.createdAt)}</td>
                  <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="icon-mini" title={cm.details} aria-label={`${cm.details}: ${typeName(n)}`} onClick={() => setOpen(n)}>{DI.docs}</button>
                    <button type="button" className="icon-mini" disabled={!to} title={to ? cm.open : nt.nothingToOpen} aria-label={cm.open} onClick={() => follow(n)}>{DI.link}</button>
                    <RowMenu
                      label={fmt(cm.rowActions, { name: typeName(n) })}
                      items={[
                        { key: "details", label: cm.details, icon: DI.docs, onClick: () => setOpen(n) },
                        { key: "open", label: cm.open, icon: DI.link, disabled: !to, hint: nt.nothingToOpen, onClick: () => follow(n) },
                        { key: "ip", label: nt.copyIp, icon: <IcCopy />, disabled: !notifIp(n), onClick: () => copy(notifIp(n)) },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
              <FillRows n={pg.size - (error ? 0 : pg.count)} cols={6} empty={error ? nt.loadError : null} />
            </tbody>
          </table></div>
        )}
        {loading && <TableSkeleton label={t.dash.cosmos.loading} cols={6} />}
        {show && <Pagination {...pg} />}
      </div>
      {open && (
        <RecordDetail
          eyebrow={nt.title} title={typeName(open)} onClose={() => setOpen(null)}
          fields={[
            [nt.message, open.message ? humanizeLocal(open.message) : null],
            [nt.location, notifLocation(open) || null],
            [nt.ip, notifIp(open) || null],
            [nt.device, deviceLabel(open) || null],
            [t.dash.overview.tableHead.date, fmtWhen(open.createdAt)],
          ]}
          actions={[
            ...(targetOf(open) ? [{ key: "open", label: cm.open, icon: DI.link, kind: "dark" as const, onClick: () => { setOpen(null); follow(open); } }] : []),
            ...(notifIp(open) ? [{ key: "ip", label: nt.copyIp, icon: <IcCopy />, onClick: () => copy(notifIp(open)) }] : []),
          ]}
        />
      )}
    </>
  );
}
