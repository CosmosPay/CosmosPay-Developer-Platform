import { useState, useEffect, useRef } from "react";
import { showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { IcCopy } from "@/components/cosmos/icons";
import { PLAN_STATUSES } from "@/lib/plan-status";
import { admin as adminApi } from "@/lib/api-client";
import { roleLevel } from "@/lib/account-roles";
import { ROLE_OPTIONS, PLAN_OPTIONS } from "@/components/cosmos/dashboard/data";
import { usePaged, useGsapRows, useListFilters } from "@/components/cosmos/dashboard/hooks";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { ViewFigures } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { countBy, matchesQuery } from "@/lib/dashboard-filters";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { MiniSelect } from "@/components/cosmos/dashboard/components/MiniSelect";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";

const USER_DEFAULTS = { q: "", role: "all", plan: "all" };

/* Admin: assign roles + plans to accounts (owner/admin only). You can't change your own
   role, only assign roles strictly below your own, and can't modify peers/superiors. */
export function UsersView({ currentUserId, currentRole }) {
  const t = useT();
  const u = t.dash.users;
  const actorLevel = roleLevel(currentRole);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { filters, set, reset, active } = useListFilters(USER_DEFAULTS);
  useEffect(() => {
    adminApi.users().then((d) => { setRows(Array.isArray(d) ? d : []); setError(false); }).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);
  // Shown at once, and undone when the save fails, so the list never shows what was not saved.
  const update = (id, patch) => {
    const before = rows.find((r) => r.id === id);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    adminApi.setUser(id, patch).catch(() => {
      if (before) setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...Object.fromEntries(Object.keys(patch).map((k) => [k, before[k]])) } : r)));
      showToast(u.saveError, "error");
    });
  };
  const matches = (r, skip) =>
    (skip === "role" || filters.role === "all" || r.role === filters.role) &&
    (skip === "plan" || filters.plan === "all" || r.plan === filters.plan) &&
    matchesQuery([r.name, r.email, t.dash.roleNames[r.role], t.dash.planNames[r.plan]], filters.q);
  const view = rows.filter((r) => matches(r, null));
  const roleCounts = countBy(rows.filter((r) => matches(r, "role")), (r) => r.role);
  const planCounts = countBy(rows.filter((r) => matches(r, "plan")), (r) => r.plan);
  const pg = usePaged(view, JSON.stringify(filters));
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + view.length);
  const copy = (v) => navigator.clipboard?.writeText(v).then(() => showToast(t.toasts.copied)).catch(() => {});
  const fl = t.dash.filters;
  return (
    <>
      <ViewHead title={u.title} />
      <ViewFigures
        label={u.title} loading={loading} failed={error}
        items={[
          { key: "accounts", label: u.figures.accounts, value: rows.length },
          { key: "staff", label: u.figures.staff, value: rows.filter((r) => roleLevel(r.role) > roleLevel("user")).length },
          { key: "paid", label: u.figures.paid, value: rows.filter((r) => r.plan && r.plan !== "community").length },
          { key: "attention", label: u.figures.attention, value: rows.filter((r) => r.planStatus && r.planStatus !== "active").length },
        ]}
      />
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={u.search}
        selects={[
          { key: "role", label: u.role, value: filters.role, onChange: (v) => set("role", v), options: [{ key: "all", label: u.allRoles }, ...ROLE_OPTIONS.map((r) => ({ key: r, label: t.dash.roleNames[r], count: roleCounts[r] || 0 }))] },
          { key: "plan", label: u.plan, value: filters.plan, onChange: (v) => set("plan", v), options: [{ key: "all", label: u.allPlans }, ...PLAN_OPTIONS.map((pp) => ({ key: pp, label: t.dash.planNames[pp] || pp, count: planCounts[pp] || 0 }))] },
        ]}
        active={active} onReset={reset}
        shown={view.length} total={loading ? undefined : rows.length} loading={loading}
      />
      <div className="panel">
        {loading && <TableSkeleton label={t.dash.cosmos.loading} cols={6} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx"><thead><tr><th>{u.name}</th><th>{u.email}</th><th>{u.role}</th><th>{u.plan}</th><th>{u.planStatus}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
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
                  <td><MiniSelect value={r.planStatus || "active"} options={PLAN_STATUSES.map((st) => ({ value: st, label: t.dash.overview.hub.planStatus[st] }))} onChange={(v) => update(r.id, { planStatus: v })} /></td>
                  <td className="row-actions">
                    <RowMenu
                      label={fmt(t.dash.common.rowActions, { name: r.name || r.email })}
                      items={[
                        { key: "email", label: u.copyEmail, icon: <IcCopy />, disabled: !r.email, onClick: () => copy(r.email) },
                        { key: "id", label: t.dash.common.copyId, icon: <IcCopy />, onClick: () => copy(r.id) },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
              <FillRows n={pg.size - (error ? 0 : pg.count)} cols={6} empty={error ? u.loadError : null} />
            </tbody>
          </table></div>
        )}
        {!loading && <Pagination {...pg} />}
      </div>
    </>
  );
}
