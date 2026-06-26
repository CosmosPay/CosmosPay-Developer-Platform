import { useRef } from "react";
import { useT, fmt } from "@/lib/i18n/index";
import { atLimit } from "@/lib/plans.ts";
import { DI } from "../icons";
import { fmtDate } from "../helpers";
import { usePaged, useGsapRows } from "../hooks";
import { ViewHead } from "../components/ViewHead";
import { Pagination } from "../components/Pagination";

export function ApiKeysView({ keys, env = "dev", loading, error, limit, lockedIds, canCreate = true, canEdit = true, canDelete = true, onCreate, onRevoke, onEdit }) {
  const t = useT();
  const ak = t.dash.apikeys;
  const roleLabels = t.dash.modals.key.roles;
  // Show only the keys for the active environment (production vs test). Keys without an
  // explicit environment are treated as test. Usage / the plan limit stay computed from
  // the full set, since the limit is per organization across both environments.
  const shown = keys.filter((k) => (env === "prod" ? k.environment === "prod" : k.environment !== "prod"));
  const pg = usePaged(shown, shown.length);
  const tref = useRef(null); useGsapRows(tref, pg.page);
  const showTable = !loading && !error && shown.length > 0;
  const reached = atLimit(limit, keys.length);
  const usage = fmt(ak.usage, { used: keys.length, limit: limit == null ? "∞" : limit });
  const readOnly = !canCreate && !canEdit && !canDelete;
  return (
    <>
      <ViewHead title={ak.title} sub={`${usage} · ${ak.sub}`}>{canCreate && <button className="btn btn-dark btn-sm" onClick={onCreate} disabled={reached}>{DI.plus} {ak.create}</button>}</ViewHead>
      {readOnly && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.key}<span>{ak.readOnly}</span></div>}
      {canCreate && reached && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.key}<span>{ak.limitReached}</span></div>}
      <div className="panel">
        {showTable && (
          <div className="t-scroll" ref={tref}><table className="tx"><thead><tr><th>{ak.tableHead.name}</th><th>{ak.tableHead.id}</th><th>{ak.tableHead.role}</th><th>{ak.tableHead.permissions}</th><th>{ak.tableHead.created}</th><th></th></tr></thead>
            <tbody>{pg.slice.map((k) => { const locked = !!(lockedIds && lockedIds.has(k.id)); return (
              <tr key={k.id} className={locked ? "row-locked" : ""}>
                <td><b>{k.name || ak.unnamed}</b>{locked && <span className="lock-badge">{ak.locked}</span>}{k.description ? <div className="as" style={{ marginTop: 2 }}>{k.description}</div> : null}</td>
                <td className="tid">{k.id}</td>
                <td className="cust">{roleLabels[k.role] || k.role}</td>
                <td className="cust">{Array.isArray(k.permissions) && k.permissions.length ? k.permissions.join(", ") : ak.none}</td>
                <td className="cust">{fmtDate(k.createdAt)}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {canEdit && <button className="icon-mini" title={ak.edit} onClick={() => onEdit(k)} disabled={locked}>{DI.edit}</button>}
                  {canDelete && <button className="icon-mini danger" title={ak.revoke} onClick={() => onRevoke(k)}>{DI.trash}</button>}
                  {!canEdit && !canDelete && <span className="cust">—</span>}
                </td>
              </tr>
            ); })}</tbody>
          </table></div>
        )}
        {loading && <div className="empty">{ak.loading}</div>}
        {!loading && error && <div className="empty">{ak.loadError}</div>}
        {!loading && !error && !shown.length && <div className="empty">{ak.empty}</div>}
        {showTable && <Pagination {...pg} />}
      </div>
    </>
  );
}
