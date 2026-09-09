import React, { useState, useEffect, useRef, useCallback } from "react";
import { useT } from "@/lib/i18n/index";
import { activity as activityApi } from "@/lib/api-client";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows, usePolling } from "@/components/cosmos/dashboard/hooks";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { Toolbar } from "@/components/cosmos/dashboard/components/Toolbar";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { MiniSelect } from "@/components/cosmos/dashboard/components/MiniSelect";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";

/* Client activity: what the wallet and this dashboard reported about themselves.

   Distinct from "API logs" (LogsView) on purpose, and the difference is the point
   of the view: API logs are requests that REACHED the Payments API, so anything
   that failed before a request — a crash on the wallet's send screen, a signature
   the user cancelled, a page that threw — appears in neither the API log nor the
   webhook log. This is where those are. */

/* Severity → the pill palette the rest of the dashboard already uses. */
const levelPill = (l) => (l === "error" ? "fail" : l === "warn" ? "ref" : "ok");

export function ActivityLogView({ env = "dev" }) {
  const t = useT();
  const av = t.dash.activityLog;
  const cx = t.dash.cosmos;
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [source, setSource] = useState("all");
  const [level, setLevel] = useState("all");
  const [open, setOpen] = useState(null);

  /* Filtering is done UPSTREAM, not over the fetched page: the feed is paginated
     server-side, so narrowing a page in the browser would search the last 100
     events and call the result "no errors". The free-text box is the exception —
     it is a refinement of what is on screen and says so by living in the toolbar. */
  const query = useCallback(
    () => ({ source: source === "all" ? undefined : source, level: level === "all" ? undefined : level }),
    [source, level],
  );

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([activityApi.list(env, query()), activityApi.summary(env, { source: source === "all" ? undefined : source })])
      .then(([feed, sum]) => {
        setRows(feed && Array.isArray(feed.data) ? feed.data : []);
        setSummary(sum || null);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [env, query, source]);
  useEffect(() => { load(); }, [load]);

  // Live tail — refresh silently while the tab is visible, as the log views do.
  const refresh = useCallback(() => {
    activityApi.list(env, query()).then((r) => setRows((r && Array.isArray(r.data)) ? r.data : [])).catch(() => {});
  }, [env, query]);
  usePolling(refresh, 10000);

  const view = rows.filter((l) => JSON.stringify(l).toLowerCase().includes(q.toLowerCase()));
  const pg = usePaged(view, q + "|" + source + "|" + level);
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);

  const sourceOptions = [
    { value: "all", label: av.sources.all },
    { value: "wallet", label: av.sources.wallet },
    { value: "dashboard", label: av.sources.dashboard },
    { value: "server", label: av.sources.server },
  ];
  const levelOptions = [
    { value: "all", label: av.levels.all },
    { value: "error", label: av.levels.error },
    { value: "warn", label: av.levels.warn },
    { value: "info", label: av.levels.info },
    { value: "debug", label: av.levels.debug },
  ];

  const errorCount = summary && Array.isArray(summary.levels)
    ? (summary.levels.find((x) => x.key === "error") || {}).count || 0
    : 0;

  return (
    <>
      <ViewHead title={t.dash.viewLabels.activityLog} sub={av.sub} />

      {summary && (
        <div className="metrics">
          <div className="metric"><div className="ml">{av.cards.total}</div><div className="mv">{summary.total}</div></div>
          <div className="metric"><div className="ml">{av.cards.errors}</div><div className="mv">{errorCount}</div></div>
          <div className="metric"><div className="ml">{av.cards.sessions}</div><div className="mv">{summary.sessions}</div></div>
          <div className="metric"><div className="ml">{av.cards.devices}</div><div className="mv">{summary.devices}</div></div>
        </div>
      )}

      <div className="panel">
        <Toolbar q={q} setQ={setQ} placeholder={av.searchPlaceholder}>
          <MiniSelect value={source} options={sourceOptions} onChange={setSource} />
          <MiniSelect value={level} options={levelOptions} onChange={setLevel} />
        </Toolbar>

        {!loading && !error && view.length > 0 && (
          <div className="t-scroll" ref={tref}><table className="tx logs"><thead>
            <tr>
              <th></th>
              <th>{av.tableHead.level}</th>
              <th>{av.tableHead.source}</th>
              <th>{av.tableHead.event}</th>
              <th>{av.tableHead.detail}</th>
              <th>{av.tableHead.timestamp}</th>
            </tr>
          </thead>
            <tbody>{pg.slice.map((l, j) => {
              const i = pg.start + j;
              const isOpen = open === i;
              return (
                <React.Fragment key={l.id}>
                  <tr className="log-row" onClick={() => setOpen(isOpen ? null : i)}>
                    <td className="exp-cell"><span className={`exp-ic${isOpen ? " open" : ""}`}>{DI.chevR}</span></td>
                    <td><Pill st={levelPill(l.level)} label={(av.levels && av.levels[l.level]) || l.level} /></td>
                    <td className="cust">{(av.sources && av.sources[l.source]) || l.source}</td>
                    <td className="tid">{l.type}</td>
                    <td className="cust">{l.message || "—"}</td>
                    <td className="cust">{fmtDateTime(l.at)}</td>
                  </tr>
                  {isOpen && (
                    <tr className="log-detail"><td colSpan={6}><div className="log-detail-grid">
                      <div className="ld-sec"><div className="ld-h">{av.tableHead.event}</div><pre>{
                        `${l.type}\ncategory: ${l.category}\nlevel: ${l.level}\nsource: ${l.source}` +
                        (l.durationMs != null ? `\nduration: ${l.durationMs} ms` : "") +
                        (l.network ? `\nnetwork: ${l.network}` : "")
                      }</pre></div>
                      <div className="ld-sec"><div className="ld-h">{av.context}</div><pre>{
                        `app: ${l.appVersion || "—"}\nplatform: ${l.platform || "—"}\nsession: ${l.sessionId || "—"}` +
                        `\nreceived: ${fmtDateTime(l.receivedAt)}\nip: ${l.ip || "—"}`
                      }</pre></div>
                      {l.props && (
                        <div className="ld-sec"><div className="ld-h">{av.props}</div><pre>{JSON.stringify(l.props, null, 2)}</pre></div>
                      )}
                    </div></td></tr>
                  )}
                </React.Fragment>
              );
            })}</tbody>
          </table></div>
        )}
        {loading && <div className="empty">{cx.loading}</div>}
        {!loading && error && <div className="empty">{cx.loadError}</div>}
        {!loading && !error && !view.length && <div className="empty">{av.empty}</div>}
        {!loading && !error && view.length > 0 && <Pagination {...pg} />}
      </div>

      {summary && Array.isArray(summary.topErrors) && summary.topErrors.length > 0 && (
        <div className="panel">
          <div className="panel-head"><h3>{av.topErrors}</h3></div>
          <div className="t-scroll"><table className="tx"><thead>
            <tr><th>{av.tableHead.detail}</th><th>{av.tableHead.count}</th></tr>
          </thead>
            <tbody>{summary.topErrors.map((e) => (
              <tr key={e.key}><td className="tid">{e.key}</td><td className="cust">{e.count}</td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}
    </>
  );
}
