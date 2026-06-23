import React, { useState, useEffect, useRef, useCallback } from "react";
import { useT } from "@/lib/i18n/index";
import { metrics as metricsApi } from "@/lib/api-client";
import { DI } from "../icons";
import { fmtDateTime } from "../helpers";
import { usePaged, useGsapRows, usePolling } from "../hooks";
import { Pill } from "../components/Pill";
import { Toolbar } from "../components/Toolbar";
import { ViewHead } from "../components/ViewHead";
import { Pagination } from "../components/Pagination";

const codePill = (c) => (c == null ? "ref" : c < 400 ? "ok" : c < 500 ? "ref" : "fail");

/* Real logs. `kind` selects which feed (its own sidebar entry):
   - "api":      inbound API requests made with an API key (method/path/status/latency).
   - "webhooks": outbound webhook deliveries across all endpoints. */
export function LogsView({ kind = "api", env = "dev" }) {
  const t = useT();
  const lv = t.dash.logs;
  const cx = t.dash.cosmos;
  const isApi = kind === "api";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);

  const fetcher = isApi ? metricsApi.apiLogs : metricsApi.webhookLogs;
  const load = useCallback(() => {
    setLoading(true);
    fetcher(env)
      .then((r) => { setRows((r && Array.isArray(r.data)) ? r.data : []); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [env, kind]);
  useEffect(() => { load(); }, [load]);
  // Live tail — refresh silently while visible.
  const refresh = useCallback(() => {
    fetcher(env).then((r) => setRows((r && Array.isArray(r.data)) ? r.data : [])).catch(() => {});
  }, [env, kind]);
  usePolling(refresh, 8000);

  const view = rows.filter((l) => JSON.stringify(l).toLowerCase().includes(q.toLowerCase()));
  const pg = usePaged(view, q + "|" + kind);
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);

  const title = isApi ? t.dash.viewLabels.logs : t.dash.viewLabels.weblogs;

  return (
    <>
      <ViewHead title={title} sub={lv.sub} />
      <div className="panel">
        <Toolbar q={q} setQ={setQ} placeholder={lv.searchPlaceholder} />
        {!loading && !error && view.length > 0 && (
          <div className="t-scroll" ref={tref}><table className="tx logs"><thead>
            {isApi
              ? <tr><th></th><th>{lv.tableHead.method}</th><th>{lv.tableHead.endpoint}</th><th>{lv.tableHead.status}</th><th>{lv.tableHead.time}</th><th>{lv.tableHead.timestamp}</th></tr>
              : <tr><th></th><th>{lv.tableHead.method}</th><th>{lv.tableHead.endpoint}</th><th>{lv.tableHead.status}</th><th>{lv.tableHead.timestamp}</th></tr>}
          </thead>
            <tbody>{pg.slice.map((l, j) => {
              const i = pg.start + j;
              const isOpen = open === i;
              return (
                <React.Fragment key={l.id}>
                  <tr className="log-row" onClick={() => setOpen(isOpen ? null : i)}>
                    <td className="exp-cell"><span className={`exp-ic${isOpen ? " open" : ""}`}>{DI.chevR}</span></td>
                    {isApi ? (<>
                      <td><span className={`method m-${(l.method || "get").toLowerCase()}`}>{l.method}</span></td>
                      <td className="tid">{l.path}</td>
                      <td><Pill st={codePill(l.statusCode)} label={String(l.statusCode)} /></td>
                      <td className="cust">{l.durationMs} ms</td>
                      <td className="cust">{fmtDateTime(l.at)}</td>
                    </>) : (<>
                      <td><span className="method m-post">HOOK</span></td>
                      <td className="tid">{(cx.eventLabels && cx.eventLabels[l.eventType]) || l.eventType}</td>
                      <td><Pill st={codePill(l.responseStatus)} label={l.responseStatus != null ? String(l.responseStatus) : (l.status || "—")} /></td>
                      <td className="cust">{fmtDateTime(l.at)}</td>
                    </>)}
                  </tr>
                  {isOpen && (
                    <tr className="log-detail"><td colSpan={isApi ? 6 : 5}><div className="log-detail-grid">
                      {isApi ? (<>
                        <div className="ld-sec"><div className="ld-h">{lv.tableHead.endpoint}</div><pre>{`${l.method} ${l.path}\nstatus: ${l.statusCode}\nlatency: ${l.durationMs} ms`}</pre></div>
                        <div className="ld-sec"><div className="ld-h">{lv.meta}</div><pre>{`ip: ${l.ip || "—"}\nuser-agent: ${l.userAgent || "—"}`}</pre></div>
                      </>) : (<>
                        <div className="ld-sec"><div className="ld-h">{lv.tableHead.event}</div><pre>{`${l.eventType}\neventId: ${l.eventId}\nattempts: ${l.attempts}`}</pre></div>
                        <div className="ld-sec"><div className="ld-h">{lv.response}</div><pre>{`url: ${l.url || "—"}\nresponse: ${l.responseStatus ?? "—"}\nerror: ${l.error || "—"}`}</pre></div>
                      </>)}
                    </div></td></tr>
                  )}
                </React.Fragment>
              );
            })}</tbody>
          </table></div>
        )}
        {loading && <div className="empty">{cx.loading}</div>}
        {!loading && error && <div className="empty">{cx.loadError}</div>}
        {!loading && !error && !view.length && <div className="empty">{cx.empty}</div>}
        {!loading && !error && view.length > 0 && <Pagination {...pg} />}
      </div>
    </>
  );
}
