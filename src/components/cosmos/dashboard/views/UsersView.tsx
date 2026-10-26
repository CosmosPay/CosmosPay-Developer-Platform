import { useState, useEffect, useRef } from "react";
import { showToast } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { admin as adminApi } from "@/lib/api-client";
import { roleLevel } from "@/lib/account-roles";
import { ROLE_OPTIONS, PLAN_OPTIONS } from "@/components/cosmos/dashboard/data";
import { usePaged, useGsapRows } from "@/components/cosmos/dashboard/hooks";
import { Toolbar } from "@/components/cosmos/dashboard/components/Toolbar";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { MiniSelect } from "@/components/cosmos/dashboard/components/MiniSelect";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";

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
      <ViewHead title={u.title} />
      <div className="panel">
        <Toolbar q={q} setQ={setQ} placeholder={u.search} />
        {loading && <TableSkeleton label={t.dash.cosmos.loading} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx"><thead><tr><th>{u.name}</th><th>{u.email}</th><th>{u.role}</th><th>{u.plan}</th></tr></thead>
            <tbody>{!error && pg.slice.map((r) => {
              const isSelf = r.id === currentUserId;
              // Can't change your own role, or that of a peer/superior.
              const roleLocked = isSelf || roleLevel(r.role) >= actorLevel;
              // Only roles strictly below your own are assignable (plus the current one, for its label).
              const roleOpts = ROLE_OPTIONS.filter((rr) => roleLevel(rr) < actorLevel || rr === r.role).map((rr) => ({ value: rr, label: t.dash.roleNames[rr] }));
              // Offered plans only, plus a legacy plan (the old free one) for the row still on it, for its label.
              const planIds = r.plan && !PLAN_OPTIONS.includes(r.plan) ? [r.plan, ...PLAN_OPTIONS] : PLAN_OPTIONS;
              const planOpts = planIds.map((pp) => ({ value: pp, label: t.dash.planNames[pp] || pp }));
              return (
                <tr key={r.id}>
                  <td><div className="cust-cell"><span className="av-sm">{(r.name || r.email || "?").slice(0, 2).toUpperCase()}</span>{r.name || "-"}{isSelf && <span className="kg pub" style={{ marginLeft: 8 }}>{t.dash.orgs.you}</span>}</div></td>
                  <td className="cust">{r.email}</td>
                  <td><MiniSelect value={r.role} options={roleOpts} onChange={(v) => update(r.id, { role: v })} disabled={roleLocked} /></td>
                  <td><MiniSelect value={r.plan} options={planOpts} onChange={(v) => update(r.id, { plan: v })} /></td>
                </tr>
              );
            })}
              <FillRows n={pg.size - (error ? 0 : pg.count)} cols={4} empty={error ? u.loadError : null} />
            </tbody>
          </table></div>
        )}
        {!loading && <Pagination {...pg} />}
      </div>
    </>
  );
}
