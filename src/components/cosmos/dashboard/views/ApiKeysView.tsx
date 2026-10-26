import { useRef } from "react";
import { useT, fmt } from "@/lib/i18n/index";
import { atLimit } from "@/lib/plans.ts";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDate } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows, useListFilters } from "@/components/cosmos/dashboard/hooks";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { countBy, matchesQuery } from "@/lib/dashboard-filters";

const DEFAULTS = { q: "", role: "all" };
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { useCopy } from "@/components/cosmos/hooks/useCopy";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { PreviewCard, shortAddress } from "@/components/cosmos/dashboard/components/RecordPreview";

/* At the plan's key limit, or in Production on a plan without live keys, the page says so and, for
   the organization's owner who can change plan, offers the plan dialog (`onUpgrade`); anyone else is
   told the owner's plan decides. */
/* A key's menu: its id, and editing or revoking it for whoever may (editing disabled while the
   key is locked by the plan, saying so). */
function KeyMenu({ k, locked, canEdit, canDelete, onEdit, onRevoke }) {
  const t = useT();
  const ak = t.dash.apikeys;
  const [, copy] = useCopy();
  return (
    <RowMenu
      label={fmt(t.dash.common.rowActions, { name: k.name || k.id })}
      items={[
        { key: "copy", label: t.dash.common.copyId, icon: DI.link, onClick: () => copy(k.id, t.toasts.copied) },
        ...(canEdit ? [{ key: "edit", label: ak.edit, icon: DI.edit, disabled: locked, hint: ak.locked, onClick: () => onEdit(k) }] : []),
        ...(canDelete ? [{ key: "revoke", label: ak.revoke, icon: DI.trash, danger: true, onClick: () => onRevoke(k) }] : []),
      ]}
    />
  );
}

export function ApiKeysView({ keys, env = "dev", loading, error, limit, lockedIds, canCreate = true, canEdit = true, canDelete = true, liveLocked = false, onCreate, onRevoke, onEdit, onUpgrade = null }) {
  const t = useT();
  const ak = t.dash.apikeys;
  const roleLabels = t.dash.modals.key.roles;
  // Show only the keys for the active environment (production vs test). Keys without an
  // explicit environment are treated as test. Usage / the plan limit stay computed from
  // the full set, since the limit is per organization across both environments.
  const inEnv = keys.filter((k) => (env === "prod" ? k.environment === "prod" : k.environment !== "prod"));
  const fl = t.dash.filters;
  const { filters, set, reset, active } = useListFilters(DEFAULTS);
  // The search reads a key's name, ID, description and permissions; the role filter offers the roles in use.
  const matches = (k, skip) =>
    (skip === "role" || filters.role === "all" || k.role === filters.role) &&
    matchesQuery([k.name, k.id, k.description, roleLabels[k.role] || k.role, ...(Array.isArray(k.permissions) ? k.permissions : [])], filters.q);
  const shown = inEnv.filter((k) => matches(k, null));
  const roleCounts = countBy(inEnv.filter((k) => matches(k, "role")), (k) => k.role);
  const roles = [...new Set<string>([...inEnv.map((k) => k.role).filter(Boolean), ...(filters.role !== "all" ? [filters.role] : [])])];
  const pg = usePaged(shown, JSON.stringify(filters) + "|" + env);
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + shown.length);
  const showTable = !loading;
  const reached = atLimit(limit, keys.length);
  const usage = fmt(ak.usage, { used: keys.length, limit: limit == null ? "∞" : limit });
  const readOnly = !canCreate && !canEdit && !canDelete;
  return (
    <>
      <ViewHead title={ak.title} sub={usage} />
      {readOnly && <div className="note-bar" style={{ marginBottom: 16 }}>{DI.key}<span>{ak.readOnly}</span></div>}
      {((canCreate && reached) || liveLocked) && (
        <div className="note-bar" style={{ marginBottom: 16 }}>
          {DI.key}
          <span>{liveLocked ? ak.liveLocked : ak.limitReached} {!onUpgrade && ak.ownerPlan}</span>
          {onUpgrade && <button type="button" className="btn btn-dark btn-sm note-bar-act" onClick={onUpgrade}>{t.dash.common.viewPlans}</button>}
        </div>
      )}
      <FilterBar
        label={fl.label}
        query={filters.q} onQuery={(v) => set("q", v)} placeholder={ak.searchPlaceholder}
        selects={[{ key: "role", label: ak.tableHead.role, value: filters.role, onChange: (v) => set("role", v), options: [{ key: "all", label: fl.allStatuses, count: inEnv.filter((k) => matches(k, "role")).length }, ...roles.map((r) => ({ key: r, label: roleLabels[r] || r, count: roleCounts[r] || 0 }))] }]}
        active={active} onReset={reset}
        shown={shown.length} total={loading ? undefined : inEnv.length} loading={loading}
        actions={canCreate && <button className="btn btn-dark btn-sm" onClick={onCreate} disabled={reached}>{DI.plus} {ak.create}</button>}
      />
      <div className="panel">
        {showTable && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx"><thead><tr><th>{ak.tableHead.name}</th><th>{ak.tableHead.id}</th><th>{ak.tableHead.role}</th><th>{ak.tableHead.permissions}</th><th>{ak.tableHead.created}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
            <tbody>{!error && pg.slice.map((k) => { const locked = !!(lockedIds && lockedIds.has(k.id)); return (
              <tr key={k.id} className={locked ? "row-locked" : ""}>
                <td><span className="cell-mark"><span className="am-sq">{DI.key}</span><span><b>{k.name || ak.unnamed}</b>{locked && <span className="lock-badge">{ak.locked}</span>}{k.description ? <div className="as" style={{ marginTop: 2 }}>{k.description}</div> : null}</span></span></td>
                <td className="tid">
                  <RecordLink
                    onOpen={canEdit && !locked ? () => onEdit(k) : undefined} copy={k.id}
                    preview={() => <PreviewCard label={ak.tableHead.id} title={k.id} headline={<b>{k.name || ak.unnamed}</b>} fields={[[ak.tableHead.role, roleLabels[k.role] || k.role], [t.dash.env.heading, k.environment === "prod" ? t.dash.env.production : t.dash.env.sandbox], [ak.tableHead.permissions, Array.isArray(k.permissions) && k.permissions.length ? k.permissions.join(", ") : ak.none], [ak.tableHead.created, fmtDate(k.createdAt)]]} />}
                   title={k.id}><code>{shortAddress(k.id)}</code></RecordLink>
                </td>
                <td className="cust">{roleLabels[k.role] || k.role}</td>
                <td className="cust">{Array.isArray(k.permissions) && k.permissions.length ? k.permissions.join(", ") : ak.none}</td>
                <td className="cust">{fmtDate(k.createdAt)}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {canEdit && <button className="icon-mini" title={ak.edit} aria-label={ak.edit} onClick={() => onEdit(k)} disabled={locked}>{DI.edit}</button>}
                  {canDelete && <button className="icon-mini danger" title={ak.revoke} aria-label={ak.revoke} onClick={() => onRevoke(k)}>{DI.trash}</button>}
                  <KeyMenu k={k} locked={locked} canEdit={canEdit} canDelete={canDelete} onEdit={onEdit} onRevoke={onRevoke} />
                </td>
              </tr>
            ); })}
              <FillRows
                n={pg.size - (error ? 0 : pg.count)} cols={6}
                empty={error ? ak.loadError : null}
              />
            </tbody>
          </table></div>
        )}
        {loading && <TableSkeleton label={ak.loading} />}
        {showTable && <Pagination {...pg} />}
      </div>
    </>
  );
}
