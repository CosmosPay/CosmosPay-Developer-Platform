import { useState, useEffect, useRef, useCallback } from "react";
import { useT, fmt } from "@/lib/i18n/index";
import { activity as activityApi } from "@/lib/api-client";
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
import { matchesQuery, rangeStart, type DateRange } from "@/lib/dashboard-filters";

/* Client activity: what the wallet and this dashboard reported about themselves.

   Distinct from "API logs" (LogsView) on purpose, and the difference is the point
   of the view: API logs are requests that REACHED the Payments API, so anything
   that failed before a request (a crash on the wallet's send screen, a signature
   the user cancelled, a page that threw) appears in neither the API log nor the
   webhook log. This is where those are.

   A list like every other (product owner, 2026-10-27): the figures, the filter bar, the table,
   and an event's detail in a dialog. */

/* Severity → the pill palette the rest of the dashboard already uses. */
const levelPill = (l) => (l === "error" ? "fail" : l === "warn" ? "ref" : "ok");
const levelTone = (l) => (l === "error" ? "fail" : l === "warn" ? "wait" : "ok");
const LEVELS = ["error", "warn", "info", "debug"];
const SOURCES = ["wallet", "dashboard", "server"];
const DEFAULTS = { q: "", level: "all", source: "all", date: "any" };
const ALLOWED = { level: ["all", ...LEVELS], source: ["all", ...SOURCES] };

export function ActivityLogView({ env = "dev" }) {
  const t = useT();
  const av = t.dash.activityLog;
  const cx = t.dash.cosmos;
  const cm = t.dash.common;
  const fl = t.dash.filters;
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(null);
  const { filters, set, reset, active } = useListFilters(DEFAULTS, ALLOWED);

  /* Filtering is done UPSTREAM, not over the fetched page: the feed is paginated
     server-side, so narrowing a page in the browser would search the last 100
     events and call the result "no errors". The free-text box is the exception:
     it is a refinement of what is on screen. */
  const since = rangeStart(filters.date as DateRange);
  const query = useCallback(
    () => ({ source: filters.source === "all" ? undefined : filters.source, level: filters.level === "all" ? undefined : filters.level, since: since ? since.toISOString() : undefined }),
    [filters.source, filters.level, filters.date],
  );
  const summaryQuery = { source: filters.source === "all" ? undefined : filters.source, since: since ? since.toISOString() : undefined };

  const read = useCallback(() => Promise.all([activityApi.list(env, query()), activityApi.summary(env, summaryQuery)])
    .then(([feed, sum]) => {
      setRows(feed && Array.isArray(feed.data) ? feed.data : []);
      setSummary(sum || null);
      setError(false);
    }), [env, query]);
  const load = useCallback(() => {
    setLoading(true);
    read().catch(() => setError(true)).finally(() => setLoading(false));
  }, [read]);
  useEffect(() => { load(); }, [load]);

  // Live tail: refresh silently while the tab is visible, the figures too; a refresh that works
  // clears an earlier failure.
  const refresh = useCallback(() => { read().catch(() => {}); }, [read]);
  usePolling(refresh, 10000, { immediate: false });

  // Every word of the search must appear somewhere in the entry.
  const view = rows.filter((l) => matchesQuery([JSON.stringify(l)], filters.q));
  const pg = usePaged(view, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);

  const levelCount = (k) => (summary && Array.isArray(summary.levels) ? (summary.levels.find((x) => x.key === k) || {}).count || 0 : 0);
  const copy = (v) => navigator.clipboard?.writeText(v).then(() => showToast(t.toasts.copied)).catch(() => {});
  const title = t.dash.viewLabels.activityLog;

  return (
    <>
      <ViewHead title={title} />
      <ViewFigures
        label={title} loading={loading && !summary} failed={error && !summary}
        items={[
          { key: "total", label: av.cards.total, value: summary ? summary.total : 0 },
          { key: "errors", label: av.cards.errors, value: levelCount("error") },
          { key: "sessions", label: av.cards.sessions, value: summary ? summary.sessions : 0 },
          { key: "devices", label: av.cards.devices, value: summary ? summary.devices : 0 },
        ]}
      />
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={av.searchPlaceholder}
        status={{
          label: av.tableHead.level, value: filters.level, onChange: (v) => set("level", v),
          options: [
            { key: "all", label: av.levels.all, count: summary ? summary.total : undefined },
            ...LEVELS.map((k) => ({ key: k, label: av.levels[k], count: levelCount(k), icon: <StatusIcon tone={levelTone(k)} size={16} /> })),
          ],
        }}
        selects={[{ key: "source", label: av.tableHead.source, value: filters.source, onChange: (v) => set("source", v), options: [{ key: "all", label: av.sources.all }, ...SOURCES.map((s) => ({ key: s, label: av.sources[s] }))] }]}
        date={filters.date} onDate={(v) => set("date", v)}
        active={active} onReset={reset}
        shown={view.length} total={loading ? undefined : rows.length} loading={loading}
      />

      <div className="panel">
        {loading && <TableSkeleton label={cx.loading} cols={6} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx logs"><thead>
            <tr>
              <th>{av.tableHead.event}</th>
              <th>{av.tableHead.level}</th>
              <th>{av.tableHead.source}</th>
              <th>{av.tableHead.detail}</th>
              <th>{av.tableHead.timestamp}</th>
              <th><span className="sr-only">{cm.actions}</span></th>
            </tr>
          </thead>
            <tbody>{!error && pg.slice.map((l) => (
              <tr key={l.id} className="row-click" onClick={() => setOpen(l)}>
                {/* The event opens its detail and previews it on hover. */}
                <td className="tid">
                  <RecordLink
                    onOpen={() => setOpen(l)} copy={l.id} title={l.type}
                    preview={() => <PreviewCard label={av.tableHead.event} title={l.type} wrap headline={<><b>{(av.sources && av.sources[l.source]) || l.source}</b><span className={`hub-st-t ${levelTone(l.level)}`}>{(av.levels && av.levels[l.level]) || l.level}</span></>} fields={[[av.tableHead.detail, l.message || "-"], [av.tableHead.timestamp, fmtDateTime(l.at)]]} />}
                  ><code>{l.type}</code></RecordLink>
                </td>
                <td><Pill st={levelPill(l.level)} tone={levelTone(l.level)} label={(av.levels && av.levels[l.level]) || l.level} /></td>
                <td className="cust">{(av.sources && av.sources[l.source]) || l.source}</td>
                <td className="cust">{l.message || "-"}</td>
                <td className="cust">{fmtDateTime(l.at)}</td>
                <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="icon-mini" title={cm.details} aria-label={cm.details} onClick={() => setOpen(l)}>{DI.docs}</button>
                  <RowMenu
                    label={fmt(cm.rowActions, { name: l.type })}
                    items={[
                      { key: "open", label: cm.details, icon: DI.docs, onClick: () => setOpen(l) },
                      { key: "copy", label: cm.copyId, icon: <IcCopy />, onClick: () => copy(l.id) },
                      { key: "session", label: av.copySession, icon: <IcCopy />, disabled: !l.sessionId, onClick: () => copy(l.sessionId) },
                    ]}
                  />
                </td>
              </tr>
            ))}
              <FillRows n={pg.size - (error ? 0 : pg.count)} cols={6} empty={error ? cx.loadError : null} />
            </tbody>
          </table></div>
        )}
        {!loading && <Pagination {...pg} />}
      </div>

      {summary && Array.isArray(summary.topErrors) && summary.topErrors.length > 0 && (
        <section className="hub-section act-top-errors" aria-labelledby="act-top-errors">
          <div className="hub-section-head"><h2 id="act-top-errors">{av.topErrors}</h2></div>
          <div className="panel">
            <div className="t-scroll" tabIndex={0}><table className="tx"><thead>
              <tr><th>{av.tableHead.detail}</th><th>{av.tableHead.count}</th></tr>
            </thead>
              <tbody>{summary.topErrors.map((e) => (
                <tr key={e.key} className="row-click" onClick={() => set("q", e.key)} title={av.filterBy}><td className="tid"><code>{e.key}</code></td><td className="cust">{e.count}</td></tr>
              ))}</tbody>
            </table></div>
          </div>
        </section>
      )}

      {open && (
        <Modal onClose={() => setOpen(null)} label={open.type}>
          <div className="modal-body">
            <div className="modal-eyebrow">{title}</div>
            <h3>{open.type}</h3>
            <div className="paylink-fields" style={{ marginBottom: 18 }}>
              {[[av.tableHead.level, (av.levels && av.levels[open.level]) || open.level], [av.tableHead.source, (av.sources && av.sources[open.source]) || open.source], [av.tableHead.detail, open.message], [av.category, open.category], [av.duration, open.durationMs != null ? `${open.durationMs} ms` : null], [av.network, open.network], [av.app, open.appVersion], [av.platform, open.platform], [av.session, open.sessionId], ["IP", open.ip], [av.tableHead.timestamp, fmtDateTime(open.at)], [av.received, open.receivedAt ? fmtDateTime(open.receivedAt) : null]]
                .filter(([, v]) => v !== null && v !== undefined && v !== "")
                .map(([k, v]) => (<div className="paylink-field" key={k}><span className="pf-k">{k}</span><span className="pf-v">{String(v)}</span></div>))}
            </div>
            {open.props && <div className="paylink-block"><div className="paylink-block-head"><span className="field-l">{av.props}</span></div><pre className="paylink-code">{JSON.stringify(open.props, null, 2)}</pre></div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-soft" onClick={() => copy(open.id)}><IcCopy /> {cm.copyId}</button>
              <button type="button" className="btn btn-soft" onClick={() => setOpen(null)}>{t.ui.close}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
