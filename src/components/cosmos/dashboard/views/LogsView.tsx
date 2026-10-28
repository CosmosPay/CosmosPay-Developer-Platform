import { useState, useEffect, useRef, useCallback } from "react";
import { useT, fmt } from "@/lib/i18n/index";
import { metrics as metricsApi, webhooks as whApi } from "@/lib/api-client";
import { Modal, showToast } from "@/components/cosmos/shared";
import { IcCopy } from "@/components/cosmos/icons";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows, usePolling, useListFilters } from "@/components/cosmos/dashboard/hooks";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { ViewFigures } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { StatusIcon } from "@/components/cosmos/dashboard/components/StatusIcon";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { PreviewCard } from "@/components/cosmos/dashboard/components/RecordPreview";
import { countBy, inRange, matchesQuery } from "@/lib/dashboard-filters";

/* A response's class: what the status filter and the pill read. */
const classOf = (c) => (c == null ? "pending" : c < 400 ? "ok" : c < 500 ? "client" : "server");
const CLASS_PILL = { ok: "ok", client: "ref", server: "fail", pending: "ref" };
const CLASS_TONE = { ok: "ok", client: "fail", server: "fail", pending: "wait" };
const CLASSES = ["ok", "client", "server"];
const DELIVERY = ["SUCCEEDED", "FAILED", "PENDING"];
const DELIVERY_TONE = { SUCCEEDED: "ok", FAILED: "fail", PENDING: "wait" };
const DELIVERY_PILL = { SUCCEEDED: "ok", FAILED: "fail", PENDING: "ref" };
// The webhook log answers a delivery's outcome as ok / fail / pending (the Payments API's
// analytics), the deliveries list as SUCCEEDED / FAILED / PENDING: both read as the latter here.
const DELIVERY_OF = { ok: "SUCCEEDED", fail: "FAILED", pending: "PENDING" };
const METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"];
const DEFAULTS = { q: "", status: "all", method: "all", date: "any" };
const ALLOWED = { status: ["all", ...CLASSES, ...DELIVERY], method: ["all", ...METHODS] };

/* Real logs, a list like every other (product owner, 2026-10-27): the figures, the filter bar, the
   table, and an entry's detail in a dialog. `kind` selects the feed (its own sidebar entry):
   - "api":      inbound API requests made with an API key (method, path, status, latency).
   - "webhooks": outbound webhook deliveries across all endpoints, which may be sent again.
   The list refreshes itself every few seconds while it is on screen. */
export function LogsView({ kind = "api", env = "dev", orgId = "", canManage = false }) {
  const t = useT();
  const lv = t.dash.logs;
  const cx = t.dash.cosmos;
  const cm = t.dash.common;
  const fl = t.dash.filters;
  const isApi = kind === "api";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(null);
  const { filters, set, reset, active } = useListFilters(DEFAULTS, ALLOWED);

  const fetcher = isApi ? metricsApi.apiLogs : metricsApi.webhookLogs;
  const read = useCallback(() => fetcher(env).then((r) => { setRows((r && Array.isArray(r.data)) ? r.data : []); setError(false); }), [env, kind]);
  const load = useCallback(() => {
    setLoading(true);
    read().catch(() => setError(true)).finally(() => setLoading(false));
  }, [read]);
  useEffect(() => { load(); }, [load]);
  // Live tail: refresh silently while visible; a refresh that works clears an earlier failure.
  const refresh = useCallback(() => { read().catch(() => {}); }, [read]);
  usePolling(refresh, 8000, { immediate: false });

  const statusOf = (l) => (isApi ? classOf(l.statusCode) : DELIVERY_OF[l.status] || l.status || "PENDING");
  const matches = (l, skip) =>
    (skip === "status" || filters.status === "all" || statusOf(l) === filters.status) &&
    (!isApi || skip === "method" || filters.method === "all" || (l.method || "").toUpperCase() === filters.method) &&
    inRange(l.at, filters.date) &&
    matchesQuery([JSON.stringify(l)], filters.q);
  const view = rows.filter((l) => matches(l, null));
  const statusCounts = countBy(rows.filter((l) => matches(l, "status")), statusOf);
  const methodCounts = countBy(rows.filter((l) => matches(l, "method")), (l) => (l.method || "").toUpperCase());
  const pg = usePaged(view, JSON.stringify(filters) + "|" + kind);
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);

  const title = isApi ? t.dash.viewLabels.logs : t.dash.viewLabels.weblogs;
  const label = (l) => (isApi ? l.path : (cx.eventLabels && cx.eventLabels[l.eventType]) || l.eventType);
  const copyOf = (l) => (isApi ? l.path : l.eventId || l.id);
  const copy = (v) => navigator.clipboard?.writeText(v).then(() => showToast(t.toasts.copied)).catch(() => {});
  // A webhook delivery is sent again to its endpoint (as from the endpoint's deliveries).
  const redeliver = (l) => whApi.redeliver(l.endpointId, l.id, env, orgId)
    .then(() => { showToast(t.dash.webhooks.resent); refresh(); })
    .catch((e) => showToast((e && e.message) || cx.redeliver, "error"));

  // The figures, from the entries listed.
  const failedN = rows.filter((l) => (isApi ? (l.statusCode ?? 0) >= 400 : l.status === "FAILED")).length;
  const avgMs = isApi && rows.length ? Math.round(rows.reduce((n, l) => n + (l.durationMs || 0), 0) / rows.length) : 0;
  const figures = isApi
    ? [
      { key: "requests", label: lv.figures.requests, value: rows.length },
      { key: "errors", label: lv.figures.errors, value: failedN },
      { key: "latency", label: lv.figures.latency, value: `${avgMs} ms` },
    ]
    : [
      { key: "deliveries", label: lv.figures.deliveries, value: rows.length },
      { key: "failed", label: lv.figures.failed, value: failedN },
      { key: "endpoints", label: lv.figures.endpoints, value: new Set(rows.map((l) => l.endpointId).filter(Boolean)).size },
    ];

  const statusOptions = isApi
    ? CLASSES.map((c) => ({ key: c, label: lv.classes[c], count: statusCounts[c] || 0, icon: <StatusIcon tone={CLASS_TONE[c]} size={16} /> }))
    : DELIVERY.map((s) => ({ key: s, label: lv.delivery[s], count: statusCounts[s] || 0, icon: <StatusIcon tone={DELIVERY_TONE[s]} size={16} /> }));
  const cols = isApi ? 6 : 5;

  return (
    <>
      <ViewHead title={title} />
      <ViewFigures label={title} loading={loading} failed={error} items={figures} />
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={lv.searchPlaceholder}
        status={{
          label: fl.status, value: filters.status, onChange: (v) => set("status", v),
          options: [{ key: "all", label: fl.allStatuses, count: rows.filter((l) => matches(l, "status")).length }, ...statusOptions],
        }}
        selects={isApi ? [{ key: "method", label: lv.tableHead.method, value: filters.method, onChange: (v) => set("method", v), options: [{ key: "all", label: lv.allMethods }, ...METHODS.map((m) => ({ key: m, label: m, count: methodCounts[m] || 0 }))] }] : []}
        date={filters.date} onDate={(v) => set("date", v)}
        active={active} onReset={reset}
        shown={view.length} total={loading ? undefined : rows.length} loading={loading}
      />
      <div className="panel">
        {loading && <TableSkeleton label={cx.loading} cols={cols} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx logs"><thead>
            {isApi
              ? <tr><th>{lv.tableHead.endpoint}</th><th>{lv.tableHead.method}</th><th>{lv.tableHead.status}</th><th>{lv.tableHead.time}</th><th>{lv.tableHead.timestamp}</th><th><span className="sr-only">{cm.actions}</span></th></tr>
              : <tr><th>{lv.tableHead.event}</th><th>{lv.tableHead.endpoint}</th><th>{lv.tableHead.status}</th><th>{lv.tableHead.timestamp}</th><th><span className="sr-only">{cm.actions}</span></th></tr>}
          </thead>
            <tbody>{!error && pg.slice.map((l) => {
              const st = statusOf(l);
              return (
                <tr key={l.id} className="row-click" onClick={() => setOpen(l)}>
                  {/* The path (or the event) opens the entry and previews it on hover. */}
                  <td className="tid">
                    <RecordLink
                      onOpen={() => setOpen(l)} copy={copyOf(l)} title={copyOf(l)}
                      preview={() => <PreviewCard label={isApi ? lv.tableHead.endpoint : lv.tableHead.event} title={copyOf(l)} wrap headline={<><b>{isApi ? l.method : label(l)}</b><span className={`hub-st-t ${isApi ? (st === "ok" ? "ok" : "fail") : (DELIVERY_TONE[st] || "wait")}`}>{isApi ? l.statusCode : lv.delivery[st] || st}</span></>} fields={isApi ? [[lv.tableHead.time, `${l.durationMs} ms`], [lv.tableHead.timestamp, fmtDateTime(l.at)]] : [[lv.tableHead.endpoint, l.url || "-"], [lv.response, l.responseStatus ?? "-"], [lv.tableHead.timestamp, fmtDateTime(l.at)]]} />}
                    >{isApi ? <code>{l.path}</code> : label(l)}</RecordLink>
                  </td>
                  {isApi ? (<>
                    <td><span className={`method m-${(l.method || "get").toLowerCase()}`}>{l.method}</span></td>
                    <td><Pill st={CLASS_PILL[st]} tone={CLASS_TONE[st]} label={String(l.statusCode ?? "-")} /></td>
                    <td className="cust">{l.durationMs} ms</td>
                  </>) : (<>
                    <td className="cust">{l.url || "-"}</td>
                    <td><Pill st={DELIVERY_PILL[st] || "ref"} tone={DELIVERY_TONE[st] || "wait"} label={l.responseStatus != null ? `${lv.delivery[st] || st} · ${l.responseStatus}` : lv.delivery[st] || st} /></td>
                  </>)}
                  <td className="cust">{fmtDateTime(l.at)}</td>
                  <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="icon-mini" title={cm.details} aria-label={cm.details} onClick={() => setOpen(l)}>{DI.docs}</button>
                    {!isApi && canManage && l.endpointId && <button type="button" className="icon-mini" title={cx.redeliver} aria-label={cx.redeliver} onClick={() => redeliver(l)}>{DI.refresh}</button>}
                    <RowMenu
                      label={fmt(cm.rowActions, { name: copyOf(l) })}
                      items={[
                        { key: "open", label: cm.details, icon: DI.docs, onClick: () => setOpen(l) },
                        { key: "copy", label: isApi ? lv.copyPath : cm.copyId, icon: <IcCopy />, onClick: () => copy(copyOf(l)) },
                        ...(!isApi && canManage && l.endpointId ? [{ key: "redeliver", label: cx.redeliver, icon: DI.refresh, onClick: () => redeliver(l) }] : []),
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
              <FillRows n={pg.size - (error ? 0 : pg.count)} cols={cols} empty={error ? cx.loadError : null} />
            </tbody>
          </table></div>
        )}
        {!loading && <Pagination {...pg} />}
      </div>
      {open && (
        <Modal onClose={() => setOpen(null)} label={label(open)}>
          <div className="modal-body">
            <div className="modal-eyebrow">{title}</div>
            <h3>{label(open)}</h3>
            <div className="paylink-fields" style={{ marginBottom: 18 }}>
              {(isApi
                ? [[lv.tableHead.method, open.method], [lv.tableHead.endpoint, open.path], [lv.tableHead.status, open.statusCode], [lv.tableHead.time, `${open.durationMs} ms`], [lv.tableHead.timestamp, fmtDateTime(open.at)], ["IP", open.ip], [lv.userAgent, open.userAgent]]
                : [[lv.tableHead.status, lv.delivery[statusOf(open)] || open.status], [lv.response, open.responseStatus], [lv.attempts, open.attempts], [lv.error, open.error], [lv.tableHead.endpoint, open.url], [lv.eventId, open.eventId], [lv.tableHead.timestamp, fmtDateTime(open.at)]]
              ).filter(([, v]) => v !== null && v !== undefined && v !== "")
                .map(([k, v]) => (<div className="paylink-field" key={k}><span className="pf-k">{k}</span><span className="pf-v">{String(v)}</span></div>))}
            </div>
            <div className="modal-actions">
              {!isApi && canManage && open.endpointId && <button type="button" className="btn btn-violet" onClick={() => { redeliver(open); setOpen(null); }}>{cx.redeliver}</button>}
              <button type="button" className="btn btn-soft" onClick={() => copy(copyOf(open))}><IcCopy /> {isApi ? lv.copyPath : cm.copyId}</button>
              <button type="button" className="btn btn-soft" onClick={() => setOpen(null)}>{t.ui.close}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
