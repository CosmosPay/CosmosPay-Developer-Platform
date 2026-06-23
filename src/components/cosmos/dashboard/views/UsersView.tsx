import { useState, useEffect, useRef } from "react";
import { showToast } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { admin as adminApi } from "@/lib/api-client";
import { roleLevel } from "@/lib/account-roles";
import { ROLE_OPTIONS, PLAN_OPTIONS } from "../data";
import { usePaged, useGsapRows } from "../hooks";
import { Toolbar } from "../components/Toolbar";
import { ViewHead } from "../components/ViewHead";
import { Pagination } from "../components/Pagination";
import { MiniSelect } from "../components/MiniSelect";

/* Admin: assign roles + plans to accounts (owner/admin only). You can't change your own
   role, only assign roles strictly below your own, and can't modify peers/superiors. */
export function UsersView({ currentUserId, currentRole }) {
  const t = useT();
  const u = t.dash.users;
  const actorLevel = roleLevel(currentRole);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => {
    adminApi.users().then((d) => { setRows(Array.isArray(d) ? d : []); setError(false); }).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);
  const update = (id, patch) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    adminApi.setUser(id, patch).catch(() => showToast(u.saveError, "error"));
  };
  const view = rows.filter((r) => (r.name || "").toLowerCase().includes(q.toLowerCase()) || (r.email || "").toLowerCase().includes(q.toLowerCase()));
  const pg = usePaged(view, q);
  const tref = useRef(null); useGsapRows(tref, pg.page);
  return (
    <>
      <ViewHead title={u.title} sub={u.subtitle} />
      <div className="panel">
        <Toolbar q={q} setQ={setQ} placeholder={u.search} />
        {loading && <div className="empty">…</div>}
        {!loading && error && <div className="empty">{u.loadError}</div>}
        {!loading && !error && (
          <div className="t-scroll" ref={tref}><table className="tx"><thead><tr><th>{u.name}</th><th>{u.email}</th><th>{u.role}</th><th>{u.plan}</th></tr></thead>
            <tbody>{pg.slice.map((r) => {
              const isSelf = r.id === currentUserId;
              // Can't change your own role, or that of a peer/superior.
              const roleLocked = isSelf || roleLevel(r.role) >= actorLevel;
              // Only roles strictly below your own are assignable (plus the current one, for its label).
              const roleOpts = ROLE_OPTIONS.filter((rr) => roleLevel(rr) < actorLevel || rr === r.role).map((rr) => ({ value: rr, label: t.dash.roleNames[rr] }));
              return (
                <tr key={r.id}>
                  <td><div className="cust-cell"><span className="av-sm">{(r.name || r.email || "?").slice(0, 2).toUpperCase()}</span>{r.name || "—"}{isSelf && <span className="kg pub" style={{ marginLeft: 8 }}>{t.dash.orgs.you}</span>}</div></td>
                  <td className="cust">{r.email}</td>
                  <td><MiniSelect value={r.role} options={roleOpts} onChange={(v) => update(r.id, { role: v })} disabled={roleLocked} /></td>
                  <td><MiniSelect value={r.plan} options={PLAN_OPTIONS.map((pp) => ({ value: pp, label: t.dash.planNames[pp] }))} onChange={(v) => update(r.id, { plan: v })} /></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
        {!loading && !error && !view.length && <div className="empty">{u.empty}</div>}
        {!loading && !error && view.length > 0 && <Pagination {...pg} />}
      </div>
    </>
  );
}
