import { useRef, useState } from "react";
import { useT, fmt } from "@/lib/i18n/index";
import { atLimit } from "@/lib/plans.ts";
import { Modal } from "@/components/cosmos/shared";
import { IcCopy } from "@/components/cosmos/icons";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDate } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useGsapRows, useListFilters } from "@/components/cosmos/dashboard/hooks";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { ViewFigures } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { countBy, inRange, matchesQuery } from "@/lib/dashboard-filters";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { useCopy } from "@/components/cosmos/hooks/useCopy";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { PreviewCard, shortAddress } from "@/components/cosmos/dashboard/components/RecordPreview";

const DEFAULTS = { q: "", role: "all", date: "any" };

/* At the plan's key limit, or in Production on a plan without live keys, the page says so and, for
   the organization's owner who can change plan, offers the plan dialog (`onUpgrade`); anyone else is
   told the owner's plan decides. */
/* A key's menu: its id, and editing or revoking it for whoever may (editing disabled while the
   key is locked by the plan, saying so). */
function KeyMenu({ k, locked, canEdit, canDelete, onOpen, onEdit, onRevoke }) {
  const t = useT();
  const ak = t.dash.apikeys;
  const [, copy] = useCopy();
  return (
    <RowMenu
      label={fmt(t.dash.common.rowActions, { name: k.name || k.id })}
      items={[
        { key: "open", label: t.dash.common.details, icon: DI.docs, onClick: () => onOpen(k) },
        { key: "copy", label: t.dash.common.copyId, icon: <IcCopy />, onClick: () => copy(k.id, t.toasts.copied) },
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
  // The key whose detail is open (a locked key opens too: its detail says why it cannot change).
  const [detail, setDetail] = useState(null);
  const [, copy] = useCopy();
  // The search reads a key's name, ID, description and permissions; the role filter offers the roles in use.
  const matches = (k, skip) =>
    (skip === "role" || filters.role === "all" || k.role === filters.role) &&
    inRange(k.createdAt, filters.date) &&
    matchesQuery([k.name, k.id, k.description, roleLabels[k.role] || k.role, ...(Array.isArray(k.permissions) ? k.permissions : [])], filters.q);
  const shown = inEnv.filter((k) => matches(k, null));
  const roleCounts = countBy(inEnv.filter((k) => matches(k, "role")), (k) => k.role);
  const roles = [...new Set<string>([...inEnv.map((k) => k.role).filter(Boolean), ...(filters.role !== "all" ? [filters.role] : [])])];
  const pg = usePaged(shown, JSON.stringify(filters) + "|" + env);
  const tref = useRef(null); useGsapRows(tref, pg.page + "|" + shown.length);
  const showTable = !loading;
  const reached = atLimit(limit, keys.length);
  const readOnly = !canCreate && !canEdit && !canDelete;
  return (
    <>
      <ViewHead title={ak.title} />
      <ViewFigures
        label={ak.title} loading={loading} failed={!!error}
        items={[
          { key: "keys", label: ak.figures.keys, value: inEnv.length },
          { key: "plan", label: ak.figures.plan, value: `${keys.length} / ${limit == null ? "∞" : limit}` },
          { key: "admin", label: roleLabels.admin, value: inEnv.filter((k) => k.role === "admin").length },
          { key: "user", label: roleLabels.user, value: inEnv.filter((k) => k.role !== "admin").length },
        ]}
      />
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
        selects={[{ key: "role", label: ak.tableHead.role, value: filters.role, onChange: (v) => set("role", v), options: [{ key: "all", label: ak.allRoles, count: inEnv.filter((k) => matches(k, "role")).length }, ...roles.map((r) => ({ key: r, label: roleLabels[r] || r, count: roleCounts[r] || 0 }))] }]}
        date={filters.date} onDate={(v) => set("date", v)}
        active={active} onReset={reset}
        shown={shown.length} total={loading ? undefined : inEnv.length} loading={loading}
        actions={canCreate && <button className="btn btn-dark btn-sm" onClick={onCreate} disabled={reached}>{DI.plus} {ak.create}</button>}
      />
      <div className="panel">
        {showTable && (
          <div className="t-scroll" tabIndex={0} ref={tref}><table className="tx"><thead><tr><th>{ak.tableHead.name}</th><th>{ak.tableHead.id}</th><th>{ak.tableHead.role}</th><th>{ak.tableHead.permissions}</th><th>{ak.tableHead.created}</th><th><span className="sr-only">{t.dash.common.actions}</span></th></tr></thead>
            <tbody>{!error && pg.slice.map((k) => { const locked = !!(lockedIds && lockedIds.has(k.id)); return (
              <tr key={k.id} className={`row-click${locked ? " row-locked" : ""}`} onClick={() => setDetail(k)}>
                {/* The name opens the key's detail and previews it on hover. */}
                <td className="tid">
                  <span className="cell-mark">
                    <span className="am-sq">{DI.key}</span>
                    <span>
                      <RecordLink
                        onOpen={() => setDetail(k)} copy={k.id} title={k.name || k.id}
                        preview={() => <PreviewCard label={ak.tableHead.name} title={k.id} headline={<b>{k.name || ak.unnamed}</b>} fields={[[ak.tableHead.role, roleLabels[k.role] || k.role], [t.dash.env.heading, k.environment === "prod" ? t.dash.env.production : t.dash.env.sandbox], [ak.tableHead.permissions, Array.isArray(k.permissions) && k.permissions.length ? k.permissions.join(", ") : ak.none], [ak.tableHead.created, fmtDate(k.createdAt)]]} />}
                      >{k.name || ak.unnamed}</RecordLink>
                      {locked && <span className="lock-badge">{ak.locked}</span>}
                      {k.description ? <div className="as" style={{ marginTop: 2 }}>{k.description}</div> : null}
                    </span>
                  </span>
                </td>
                <td className="cust"><code>{shortAddress(k.id)}</code></td>
                <td className="cust">{roleLabels[k.role] || k.role}</td>
                <td className="cust">{Array.isArray(k.permissions) && k.permissions.length ? k.permissions.join(", ") : ak.none}</td>
                <td className="cust">{fmtDate(k.createdAt)}</td>
                <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="icon-mini" title={t.dash.common.details} aria-label={`${t.dash.common.details}: ${k.name || k.id}`} onClick={() => setDetail(k)}>{DI.docs}</button>
                  {canEdit && <button className="icon-mini" title={locked ? ak.locked : ak.edit} aria-label={`${ak.edit}: ${k.name || k.id}`} onClick={() => onEdit(k)} disabled={locked}>{DI.edit}</button>}
                  {canDelete && <button className="icon-mini danger" title={ak.revoke} aria-label={`${ak.revoke}: ${k.name || k.id}`} onClick={() => onRevoke(k)}>{DI.trash}</button>}
                  <KeyMenu k={k} locked={locked} canEdit={canEdit} canDelete={canDelete} onOpen={setDetail} onEdit={onEdit} onRevoke={onRevoke} />
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
        {loading && <TableSkeleton label={ak.loading} cols={6} />}
        {showTable && <Pagination {...pg} />}
      </div>
      {detail && (() => {
        const locked = !!(lockedIds && lockedIds.has(detail.id));
        return (
          <Modal onClose={() => setDetail(null)} label={detail.name || ak.unnamed}>
            <div className="modal-body">
              <div className="modal-eyebrow">{ak.title}</div>
              <h3>{detail.name || ak.unnamed}</h3>
              {locked && <p className="field-help">{ak.locked}</p>}
              <div className="paylink-fields" style={{ marginBottom: 18 }}>
                {[[ak.tableHead.id, detail.id], [t.dash.modals.key.descLabel, detail.description], [ak.tableHead.role, roleLabels[detail.role] || detail.role], [t.dash.env.heading, detail.environment === "prod" ? t.dash.env.production : t.dash.env.sandbox], [ak.tableHead.permissions, detail.role === "admin" ? t.dash.modals.key.adminHint : Array.isArray(detail.permissions) && detail.permissions.length ? detail.permissions.join(", ") : ak.none], [ak.tableHead.created, fmtDate(detail.createdAt)]]
                  .filter(([, v]) => v !== null && v !== undefined && v !== "")
                  .map(([k, v]) => (<div className="paylink-field" key={k}><span className="pf-k">{k}</span><span className="pf-v">{String(v)}</span></div>))}
              </div>
              <div className="paylink-actions">
                {canEdit && <button type="button" className="btn btn-dark btn-sm" disabled={locked} onClick={() => { setDetail(null); onEdit(detail); }}>{DI.edit} {ak.edit}</button>}
                <button type="button" className="btn btn-soft btn-sm" onClick={() => copy(detail.id, t.toasts.copied)}><IcCopy /> {t.dash.common.copyId}</button>
                {canDelete && <button type="button" className="btn btn-soft danger-soft btn-sm" onClick={() => { setDetail(null); onRevoke(detail); }}>{DI.trash} {ak.revoke}</button>}
              </div>
            </div>
          </Modal>
        );
      })()}
    </>
  );
}
