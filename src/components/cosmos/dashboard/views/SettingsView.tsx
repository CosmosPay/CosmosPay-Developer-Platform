import { useState, useEffect, useCallback, Fragment } from "react";
import { Modal, ConfirmModal, IcCheck, showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { organizations as orgsApi } from "@/lib/api-client";
import { planLimits } from "@/lib/plans.ts";
import { ORG_RESOURCES, ORG_ACTIONS, permKey } from "@/lib/org-permissions.ts";
import { DI } from "@/components/cosmos/dashboard/icons";
import { IcCopy } from "@/components/cosmos/icons";
import { fmtDate } from "@/components/cosmos/dashboard/helpers";
import { usePaged, useListFilters } from "@/components/cosmos/dashboard/hooks";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { ViewFigures } from "@/components/cosmos/dashboard/components/ActivityPanel";
import { FilterBar } from "@/components/cosmos/dashboard/components/FilterBar";
import { Pagination } from "@/components/cosmos/dashboard/components/Pagination";
import { FillRows } from "@/components/cosmos/dashboard/components/FillRows";
import { TableSkeleton } from "@/components/cosmos/dashboard/components/Skeleton";
import { RowMenu } from "@/components/cosmos/dashboard/components/RowMenu";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { RecordDetail } from "@/components/cosmos/dashboard/components/RecordDetail";
import { PreviewCard } from "@/components/cosmos/dashboard/components/RecordPreview";
import { Pill } from "@/components/cosmos/dashboard/components/Pill";
import { StatusIcon } from "@/components/cosmos/dashboard/components/StatusIcon";
import { OrgWalletsSection, useOrgWallets } from "@/components/cosmos/dashboard/components/OrgWallets";
import { countBy, matchesQuery } from "@/lib/dashboard-filters";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { FormSteps, FormStep, FormStepsFooter, useFormSteps } from "@/components/cosmos/dashboard/components/FormSteps";

/* Per-action permission matrix (resource × create/edit/delete) as multi-select checkboxes,
   shared by the invite form and the member editor. */
function PermissionPicker({ value, onChange }) {
  const t = useT();
  const og = t.dash.orgs;
  const resLabels = og.resources;
  const actLabels = og.actions;
  const has = (r, a) => value.includes(permKey(r, a));
  const toggle = (r, a) => {
    const k = permKey(r, a);
    onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  };
  return (
    <div className="perm-table">
      <span className="perm-corner">{og.permResource}</span>
      {ORG_ACTIONS.map((a) => <span key={a} className="perm-act">{actLabels[a]}</span>)}
      {ORG_RESOURCES.map((r) => (
        <Fragment key={r}>
          <span className="perm-res">{resLabels[r] || r}</span>
          {ORG_ACTIONS.map((a) => (
            <label key={a} className={`perm-chk${has(r, a) ? " on" : ""}`} title={`${resLabels[r] || r} · ${actLabels[a]}`}>
              <input type="checkbox" checked={has(r, a)} onChange={() => toggle(r, a)} />
              <span className="chk-box">{has(r, a) && <IcCheck />}</span>
            </label>
          ))}
        </Fragment>
      ))}
    </div>
  );
}

/* Edit an existing member's role + per-action permissions. */
function MemberEditModal({ org, member, onClose, onSaved }) {
  const t = useT();
  const og = t.dash.orgs;
  const [role, setRole] = useState(member.role === "admin" ? "admin" : "member");
  const [perms, setPerms] = useState(Array.isArray(member.permissions) ? member.permissions : []);
  const [saving, setSaving] = useState(false);
  const save = () => {
    if (saving) return;
    setSaving(true);
    orgsApi.updateMember(org.id, member.userId, { role, permissions: role === "member" ? perms : [] })
      .then(() => { showToast(og.memberUpdated); onSaved(); onClose(); })
      .catch(() => showToast(og.memberUpdateError, "error"))
      .finally(() => setSaving(false));
  };
  return (
    <Modal onClose={onClose}><div className="modal-body">
      <div className="modal-eyebrow">{og.members}</div>
      <h3>{og.editMemberTitle}</h3>
      <p>{member.name || member.email}</p>
      <RolePicker id="member-role-l" role={role} onChange={setRole} />
      {role === "member" ? (
        <>
          <label className="field-l" style={{ marginTop: 14 }}>{og.permissionsLabel}</label>
          <PermissionPicker value={perms} onChange={setPerms} />
        </>
      ) : <div className="field-hint" style={{ display: "block", marginTop: 10 }}>{og.adminAllNote}</div>}
      <div className="modal-actions"><button className="btn btn-violet" disabled={saving} onClick={save}>{og.save}</button><button className="btn btn-soft" disabled={saving} onClick={onClose}>{t.dash.common.cancel}</button></div>
    </div></Modal>
  );
}

/* The role of a member to be: member (with the permissions picked) or admin (everything). */
function RolePicker({ id, role, onChange }) {
  const t = useT();
  const og = t.dash.orgs;
  return (
    <div className="fld">
      <span className="field-l" id={id}>{og.roleLabel}</span>
      <div className="seg-tabs seg-fill" role="group" aria-labelledby={id}>
        {["member", "admin"].map((r) => <button key={r} type="button" className={role === r ? "on" : ""} aria-pressed={role === r} onClick={() => onChange(r)}>{og.roles[r]}</button>)}
      </div>
    </div>
  );
}

/* Invite a member, in two steps (product owner, 2026-10-27: a long form goes in steps): the email
   and the role, then the permissions (an admin's is everything, so it says so). The invited person
   joins through the emailed link. */
function InviteMemberModal({ org, onClose, onInvited }) {
  const t = useT();
  const og = t.dash.orgs;
  const steps = useFormSteps(2);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [perms, setPerms] = useState([]);
  const [sending, setSending] = useState(false);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const invite = () => {
    if (!emailOk || sending) return;
    setSending(true);
    orgsApi.invite(org.id, email.trim(), role, role === "member" ? perms : [])
      .then(() => { showToast(og.invited); onInvited(); onClose(); })
      .catch((err) => showToast((err && err.message) || og.inviteError, "error"))
      .finally(() => setSending(false));
  };
  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div className="modal-eyebrow">{og.members}</div>
        <h3>{og.inviteMember}</h3>
        <FormSteps names={[og.steps.who, og.steps.permissions]} steps={steps} />
        <FormStep steps={steps}>
          {steps.step === 0 && (<>
            <Field label={og.memberEmail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ana@acme.com" autoFocus aria-invalid={email.trim() && !emailOk ? true : undefined} />
            <RolePicker id="invite-role-l" role={role} onChange={setRole} />
            <p className="field-help">{role === "admin" ? og.roleAdminHint : og.inviteHint}</p>
          </>)}
          {steps.step === 1 && (role === "member" ? (<>
            <span className="field-l">{og.permissionsLabel}</span>
            <PermissionPicker value={perms} onChange={setPerms} />
          </>) : <p className="field-help">{og.adminAllNote}</p>)}
        </FormStep>
        <FormStepsFooter steps={steps} canNext={emailOk} onCancel={onClose} submitLabel={sending ? og.sending : og.send} onSubmit={invite} busy={sending} submitDisabled={!emailOk} />
      </div>
    </Modal>
  );
}

/* The organization's people: its members and, for whoever manages it, its pending invitations,
   read together. */
function useTeam(org) {
  const canManage = org.role === "owner" || org.role === "admin";
  const [team, setTeam] = useState({ members: [], invites: [], state: "loading" }); // loading | ready | failed
  const load = useCallback(() => {
    if (!org.id) { setTeam({ members: [], invites: [], state: "ready" }); return; }
    Promise.allSettled([orgsApi.members(org.id), canManage ? orgsApi.invitations(org.id) : Promise.resolve([])])
      .then(([m, i]) => setTeam({
        members: m.status === "fulfilled" && Array.isArray(m.value) ? m.value : [],
        invites: i.status === "fulfilled" && Array.isArray(i.value) ? i.value : [],
        state: m.status === "fulfilled" ? "ready" : "failed",
      }));
  }, [org.id, canManage]);
  useEffect(() => { setTeam({ members: [], invites: [], state: "loading" }); load(); }, [load]);
  return { ...team, reload: load };
}

const TEAM_DEFAULTS = { tq: "", tstatus: "all", trole: "all" };
const TEAM_ALLOWED = { tstatus: ["all", "active", "invited"], trole: ["all", "owner", "admin", "member"] };
const TEAM_COLS = 6;

/* The team as every list (product owner, 2026-10-27: every list is the Payments table): members
   and pending invitations in one table, filtered by status and role, a row opening its detail,
   and for whoever manages the organization: invite (people join through the emailed magic link,
   never added directly), edit a member's role and permissions, remove a member or revoke an
   invitation, each confirmed first. The owner is neither edited nor removed (drawn disabled). */
function TeamSection({ org, team, meId }) {
  const t = useT();
  const og = t.dash.orgs;
  const sv = t.dash.settings;
  const fl = t.dash.filters;
  const cm = t.dash.common;
  const canManage = org.role === "owner" || org.role === "admin";
  const { filters, set, reset, active } = useListFilters(TEAM_DEFAULTS, TEAM_ALLOWED);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(null);
  // The member to remove or the invitation to revoke, both confirmed first.
  const [confirm, setConfirm] = useState(null);

  const people = [
    ...team.members.map((m) => ({ key: `m:${m.userId}`, kind: "member", name: m.name || m.email || "?", email: m.email, role: m.role, permissions: m.permissions || [], since: m.joinedAt, me: !!meId && m.userId === meId, member: m })),
    ...team.invites.map((iv) => ({ key: `i:${iv.id}`, kind: "invite", name: iv.email, email: iv.email, role: iv.role, permissions: iv.permissions || [], since: iv.createdAt, expiresAt: iv.expiresAt, invite: iv })),
  ];
  const statusOf = (x) => (x.kind === "member" ? "active" : "invited");
  const matches = (x, skip) =>
    (skip === "status" || filters.tstatus === "all" || statusOf(x) === filters.tstatus) &&
    (skip === "role" || filters.trole === "all" || x.role === filters.trole) &&
    matchesQuery([x.name, x.email], filters.tq);
  const rows = people.filter((x) => matches(x, null));
  const statusCounts = countBy(people.filter((x) => matches(x, "status")), statusOf);
  const roleCounts = countBy(people.filter((x) => matches(x, "role")), (x) => x.role);
  const pg = usePaged(rows, JSON.stringify(filters));
  const loading = team.state === "loading";
  const failed = team.state === "failed";

  const roleName = (r) => (og.roles && og.roles[r]) || r;
  const nameOf = (x) => (x.me ? `${x.name} (${og.you})` : x.name);
  const isManager = (x) => x.role === "owner" || x.role === "admin";
  const permsLabel = (x) => (isManager(x) ? og.permsAll : !x.permissions.length ? og.permsNone : x.permissions.length === 1 ? og.permsOne : fmt(og.permsN, { n: x.permissions.length }));
  // Each resource with the actions granted on it, as the permission picker reads them.
  const permsList = (x) => (isManager(x)
    ? (x.role === "owner" ? og.permsAll : og.adminAllNote)
    : x.permissions.length
      ? <span className="team-perms">{ORG_RESOURCES.filter((r) => ORG_ACTIONS.some((a) => x.permissions.includes(permKey(r, a)))).map((r) => <span key={r}>{og.resources[r] || r}: {ORG_ACTIONS.filter((a) => x.permissions.includes(permKey(r, a))).map((a) => og.actions[a]).join(", ")}</span>)}</span>
      : og.permsNone);
  const statusPill = (x) => (x.kind === "member" ? <Pill st="ok" label={og.memberStatus.active} /> : <Pill st="ref" tone="wait" label={og.memberStatus.invited} />);
  // What a row may do: edit only a member who isn't the owner, remove anyone but the owner.
  const editHint = (x) => (x.kind === "invite" ? og.inviteFixed : x.role === "owner" ? og.ownerFixed : null);
  const removeHint = (x) => (x.role === "owner" ? og.ownerFixed : null);
  const removeLabel = (x) => (x.kind === "invite" ? og.revokeInvite : og.remove);
  const copy = (v) => navigator.clipboard?.writeText(v).then(() => showToast(t.toasts.copied)).catch(() => {});
  const edit = (x) => { setOpen(null); setEditing(x.member); };
  const askRemove = (x) => setConfirm(x.kind === "invite" ? { invite: x.invite } : { member: x.member });
  const remove = (m) => orgsApi.removeMember(org.id, m.userId).then(() => { setOpen(null); team.reload(); }).catch(() => showToast(og.memberRemoveError, "error"));
  const revoke = (id) => orgsApi.revokeInvite(org.id, id).then(() => { setOpen(null); team.reload(); }).catch(() => showToast(og.revokeError, "error"));
  const items = (x) => [
    { key: "open", label: cm.details, icon: DI.docs, onClick: () => setOpen(x) },
    ...(canManage ? [{ key: "edit", label: og.editMember, icon: DI.edit, disabled: !!editHint(x), hint: editHint(x), onClick: () => edit(x) }] : []),
    { key: "email", label: og.copyEmail, icon: <IcCopy />, disabled: !x.email, onClick: () => copy(x.email) },
    ...(canManage ? [{ key: "delete", label: removeLabel(x), icon: DI.trash, danger: true, disabled: !!removeHint(x), hint: removeHint(x), onClick: () => askRemove(x) }] : []),
  ];
  const seatLimit = planLimits(org.plan).maxSeats;

  return (
    <section className="hub-section set-section" aria-labelledby="team-title">
      <div className="hub-section-head">
        <h2 id="team-title">{sv.team.title}{canManage && <span className="seat-usage">{team.members.length} / {seatLimit == null ? "∞" : seatLimit}</span>}</h2>
      </div>
      <FilterBar
        label={fl.label}
        query={filters.tq} onQuery={(v) => set("tq", v)} placeholder={og.searchPlaceholder}
        status={canManage ? {
          label: fl.status, value: filters.tstatus, onChange: (v) => set("tstatus", v),
          options: [
            { key: "all", label: fl.allStatuses, count: people.filter((x) => matches(x, "status")).length },
            { key: "active", label: og.memberStatus.active, count: statusCounts.active || 0, icon: <StatusIcon tone="ok" size={16} /> },
            { key: "invited", label: og.memberStatus.invited, count: statusCounts.invited || 0, icon: <StatusIcon tone="wait" size={16} /> },
          ],
        } : null}
        selects={[{ key: "trole", label: og.roleLabel, value: filters.trole, onChange: (v) => set("trole", v), options: [{ key: "all", label: og.allRoles }, ...["owner", "admin", "member"].map((r) => ({ key: r, label: roleName(r), count: roleCounts[r] || 0 }))] }]}
        active={active} onReset={reset}
        shown={rows.length} total={loading ? undefined : people.length} loading={loading}
        actions={canManage && <button type="button" className="btn btn-dark btn-sm" onClick={() => setInviting(true)}>{DI.plus} {og.inviteMember}</button>}
      />
      <div className="panel">
        {loading && <TableSkeleton label={sv.team.title} cols={TEAM_COLS} />}
        {!loading && (
          <div className="t-scroll" tabIndex={0}><table className="tx">
            <thead><tr><th>{og.tableHead.person}</th><th>{og.tableHead.role}</th><th>{og.tableHead.permissions}</th><th>{og.tableHead.status}</th><th>{og.tableHead.since}</th><th><span className="sr-only">{cm.actions}</span></th></tr></thead>
            <tbody>
              {!failed && pg.slice.map((x) => {
                const name = nameOf(x);
                return (
                  <tr key={x.key} className="row-click" onClick={() => setOpen(x)}>
                    <td className="tid">
                      <div className="cust-cell">
                        <span className={`av-sm${x.kind === "invite" ? " pending" : ""}`} aria-hidden="true">{(x.name || "?").slice(0, 2).toUpperCase()}</span>
                        <span>
                          <RecordLink
                            onOpen={() => setOpen(x)} copy={x.email || undefined} title={x.email || x.name}
                            preview={() => <PreviewCard label={x.kind === "member" ? og.memberDetail : og.inviteDetail} title={x.email || x.name} headline={<b>{name}</b>} fields={[[og.tableHead.role, roleName(x.role)], [og.tableHead.permissions, permsLabel(x)], [og.tableHead.status, x.kind === "member" ? og.memberStatus.active : fmt(og.expires, { date: fmtDate(x.expiresAt) })]]} />}
                          >{name}</RecordLink>
                          {x.kind === "member" && x.email && x.email !== x.name && <small className="cust-wallet-net">{x.email}</small>}
                        </span>
                      </div>
                    </td>
                    <td className="cust">{roleName(x.role)}</td>
                    <td className="cust">{permsLabel(x)}</td>
                    <td title={x.kind === "invite" ? fmt(og.expires, { date: fmtDate(x.expiresAt) }) : undefined}>{statusPill(x)}</td>
                    <td className="cust">{x.since ? fmtDate(x.since) : "-"}</td>
                    <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="icon-mini" title={cm.details} aria-label={`${cm.details}: ${name}`} onClick={() => setOpen(x)}>{DI.docs}</button>
                      {canManage && <button type="button" className="icon-mini" title={editHint(x) || og.editMember} aria-label={`${og.editMember}: ${name}`} disabled={!!editHint(x)} onClick={() => edit(x)}>{DI.edit}</button>}
                      {canManage && <button type="button" className="icon-mini danger" title={removeHint(x) || removeLabel(x)} aria-label={`${removeLabel(x)}: ${name}`} disabled={!!removeHint(x)} onClick={() => askRemove(x)}>{DI.trash}</button>}
                      <RowMenu label={fmt(cm.rowActions, { name })} items={items(x)} />
                    </td>
                  </tr>
                );
              })}
              <FillRows n={pg.size - (failed ? 0 : pg.count)} cols={TEAM_COLS} empty={failed ? og.loadError : null} />
            </tbody>
          </table></div>
        )}
        {!loading && <Pagination {...pg} />}
      </div>
      {open && (
        <RecordDetail
          eyebrow={open.kind === "member" ? og.memberDetail : og.inviteDetail} title={nameOf(open)} onClose={() => setOpen(null)}
          fields={[
            [t.dash.settings.teamModal.email, open.email],
            [og.tableHead.role, roleName(open.role)],
            [og.tableHead.permissions, permsList(open)],
            [og.tableHead.status, statusPill(open)],
            ...(open.kind === "member"
              ? [[og.tableHead.since, open.since ? fmtDate(open.since) : null]]
              : [[og.sentOn, fmtDate(open.since)], [og.expiresOn, fmtDate(open.expiresAt)]]),
          ]}
          actions={[
            ...(canManage && !editHint(open) ? [{ key: "edit", label: og.editMember, icon: DI.edit, kind: "dark" as const, onClick: () => edit(open) }] : []),
            ...(open.email ? [{ key: "email", label: og.copyEmail, icon: <IcCopy />, onClick: () => copy(open.email) }] : []),
            ...(canManage && !removeHint(open) ? [{ key: "delete", label: removeLabel(open), icon: DI.trash, kind: "danger" as const, onClick: () => askRemove(open) }] : []),
          ]}
        />
      )}
      {inviting && <InviteMemberModal org={org} onClose={() => setInviting(false)} onInvited={team.reload} />}
      {editing && <MemberEditModal org={org} member={editing} onClose={() => setEditing(null)} onSaved={team.reload} />}
      {confirm && confirm.member && (
        <ConfirmModal
          title={og.removeMemberTitle}
          body={fmt(og.removeMemberBody, { name: confirm.member.name || confirm.member.email, org: org.name })}
          confirmLabel={og.removeMemberConfirm}
          cancelLabel={cm.cancel}
          onConfirm={() => remove(confirm.member)}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm && confirm.invite && (
        <ConfirmModal
          title={og.revokeInviteTitle}
          body={fmt(og.revokeInviteBody, { email: confirm.invite.email, org: org.name })}
          confirmLabel={og.revokeInvite}
          cancelLabel={cm.cancel}
          onConfirm={() => revoke(confirm.invite.id).then(() => setConfirm(null))}
          onClose={() => setConfirm(null)}
        />
      )}
    </section>
  );
}

/* Settings as every view (product owner, 2026-10-27): its figures first (members and seats,
   pending invitations, wallets, API keys), the organization's details and plan, then its lists:
   the team and the wallets, each the Payments table with its own filter bar. */
export function SettingsView({ org, orgCount, limits, keyCount, env = "dev", meId = null, walletPerms = { create: false, edit: false, remove: false }, onRenameOrg, onDeleteOrg }) {
  const t = useT();
  const sv = t.dash.settings;
  const sf = sv.figures;
  const og = t.dash.orgs;
  // An organization's limits come from the OWNER's plan (the org's subscription).
  const orgLimits = planLimits(org.plan);
  const fmtLimit = (n) => (n == null ? "∞" : n);
  const canManageOrg = org.role === "owner" || org.role === "admin";
  const isOrgOwner = org.role === "owner";
  const team = useTeam(org);
  const wallets = useOrgWallets(org.id);
  const networks = wallets ? new Set(wallets.map((x) => x.chain)).size : 0;
  const copy = (v) => navigator.clipboard?.writeText(v).then(() => showToast(t.toasts.copied)).catch(() => {});
  return (
    <>
      <ViewHead title={sv.title} />
      <ViewFigures
        label={sv.title} loading={team.state === "loading" || (!!org.id && wallets === undefined)} failed={team.state === "failed"}
        items={[
          { key: "members", label: sf.members, value: team.members.length, sub: orgLimits.maxSeats == null ? sf.seatsFree : fmt(sf.seats, { n: team.members.length, max: orgLimits.maxSeats }) },
          ...(canManageOrg ? [{ key: "invites", label: sf.invites, value: team.invites.length, sub: sf.invitesSub }] : []),
          { key: "wallets", label: sf.wallets, value: wallets ? wallets.length : "-", sub: networks ? (networks === 1 ? sf.networksOne : fmt(sf.networksN, { n: networks })) : undefined },
          { key: "keys", label: sf.apiKeys, value: keyCount, sub: orgLimits.maxApiKeys == null ? sf.keysFree : fmt(sf.keysLimit, { max: orgLimits.maxApiKeys }) },
        ]}
      />
      <div className="set-grid">
        <div className="panel set-panel"><div className="panel-head"><h3>{sv.org.title}</h3>{canManageOrg && org.id && <button type="button" className="btn btn-outline-w btn-sm" onClick={() => onRenameOrg(org)}>{og.rename}</button>}</div><div className="set-body">
          <div className="set-row"><div className="set-l">{sv.org.name}</div><div className="set-v">{org.name}</div></div>
          <div className="set-row"><div className="set-l">{sv.org.id}</div><div className="set-v tid">{org.id || "-"}{org.id && <button type="button" className="icon-mini" title={t.dash.common.copyId} aria-label={t.dash.common.copyId} style={{ marginLeft: 6 }} onClick={() => copy(org.id)}><IcCopy /></button>}</div></div>
          <div className="set-row"><div className="set-l">{sv.org.created}</div><div className="set-v">{org.createdAt ? fmtDate(org.createdAt) : "-"}</div></div>
          {isOrgOwner && org.id && orgCount > 1 && <button className="btn btn-soft danger-soft" style={{ marginTop: 8 }} onClick={() => onDeleteOrg(org)}>{DI.trash} {og.delete}</button>}
        </div></div>
        <div className="panel set-panel"><div className="panel-head"><h3>{sv.plan.title}</h3></div><div className="set-body">
          <div className="set-row"><div className="set-l">{sv.plan.current}</div><div className="set-v">{t.dash.planNames[org.plan] || org.plan}</div></div>
          <div className="set-row"><div className="set-l">{sv.plan.seats}</div><div className="set-v">{fmtLimit(orgLimits.maxSeats)}</div></div>
          <div className="set-row"><div className="set-l">{sv.plan.apiKeys}</div><div className="set-v">{keyCount} / {fmtLimit(orgLimits.maxApiKeys)}</div></div>
        </div></div>
      </div>
      <TeamSection org={org} team={team} meId={meId} />
      {org.id && <OrgWalletsSection orgId={org.id} wallets={wallets} perms={walletPerms} network={env === "prod" ? "public" : "testnet"} />}
    </>
  );
}
