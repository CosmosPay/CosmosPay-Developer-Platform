import { useState, useEffect, Fragment } from "react";
import { Modal, ConfirmModal, IcCheck, showToast } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { organizations as orgsApi } from "@/lib/api-client";
import { planLimits } from "@/lib/plans.ts";
import { ORG_RESOURCES, ORG_ACTIONS, permKey } from "@/lib/org-permissions.ts";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDate } from "@/components/cosmos/dashboard/helpers";
import { ViewHead } from "@/components/cosmos/dashboard/components/ViewHead";
import { OrgWalletsPanel } from "@/components/cosmos/dashboard/components/OrgWallets";
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

/* Organization members: invite by email (role + granular permissions), edit a member's
   role/permissions, and remove (with confirmation). Members join via the emailed magic
   link, never added directly. Seats are per organization (the owner's plan). */
function OrgMembersPanel({ org, orgLimits }) {
  const t = useT();
  const og = t.dash.orgs;
  const sv = t.dash.settings;
  const canManage = org.role === "owner" || org.role === "admin";
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState(null);
  // The member to remove or the invitation to revoke, both confirmed first.
  const [confirm, setConfirm] = useState(null);
  const [membersState, setMembersState] = useState("loading"); // loading | ready | failed
  const loadMembers = () => {
    if (!org.id) return;
    orgsApi.members(org.id)
      .then((d) => { setMembers(Array.isArray(d) ? d : []); setMembersState("ready"); })
      .catch(() => setMembersState("failed"));
  };
  const loadInvites = () => { if (org.id && canManage) orgsApi.invitations(org.id).then((d) => setInvites(Array.isArray(d) ? d : [])).catch(() => {}); };
  useEffect(() => { loadMembers(); loadInvites(); }, [org.id]);
  const remove = (m) => orgsApi.removeMember(org.id, m.userId).then(loadMembers).catch(() => showToast(og.memberRemoveError, "error"));
  const revoke = (id) => orgsApi.revokeInvite(org.id, id).then(loadInvites).catch(() => showToast(og.revokeError, "error"));
  const seatLimit = orgLimits ? orgLimits.maxSeats : null;
  return (
    <div className="panel set-panel">
      <div className="panel-head">
        <h3>{sv.team.title}{canManage && <span className="seat-usage">{members.length} / {seatLimit == null ? "∞" : seatLimit}</span>}</h3>
        {canManage && <button type="button" className="btn btn-dark btn-sm" onClick={() => setInviting(true)}>{DI.plus} {og.inviteMember}</button>}
      </div>
      <div className="set-body">
        {membersState === "failed" && <div className="empty" style={{ padding: "18px 8px" }}>{og.loadError}</div>}
        {membersState === "ready" && !members.length && <div className="empty" style={{ padding: "18px 8px" }}>{og.empty}</div>}
        {members.map((m) => (
          <div className="set-member" key={m.userId}>
            <span className="av-sm">{(m.name || m.email || "?").slice(0, 2).toUpperCase()}</span>
            <div><b>{m.name || m.email}</b><span>{m.email}</span></div>
            <span className="kg pub" style={{ marginLeft: "auto" }}>{(og.roles && og.roles[m.role]) || m.role}</span>
            {canManage && m.role !== "owner" && (
              <>
                <button className="icon-mini" title={og.editMember} aria-label={og.editMember} style={{ marginLeft: 8 }} onClick={() => setEditing(m)}>{DI.edit}</button>
                <button className="icon-mini danger" title={og.remove} aria-label={og.remove} onClick={() => setConfirm({ member: m })}>{DI.trash}</button>
              </>
            )}
          </div>
        ))}
        {canManage && invites.length > 0 && (
          <>
            <div className="set-subhead">{og.pending}</div>
            {invites.map((iv) => (
              <div className="set-member invite" key={iv.id}>
                <span className="av-sm pending">{(iv.email || "?").slice(0, 2).toUpperCase()}</span>
                <div><b>{iv.email}</b><span>{fmt(og.expires, { date: fmtDate(iv.expiresAt) })}</span></div>
                <span className="kg" style={{ marginLeft: "auto" }}>{(og.roles && og.roles[iv.role]) || iv.role}</span>
                <button className="icon-mini danger" title={og.revokeInvite} aria-label={og.revokeInvite} style={{ marginLeft: 8 }} onClick={() => setConfirm({ invite: iv })}>{DI.trash}</button>
              </div>
            ))}
          </>
        )}
      </div>
      {inviting && <InviteMemberModal org={org} onClose={() => setInviting(false)} onInvited={loadInvites} />}
      {editing && <MemberEditModal org={org} member={editing} onClose={() => setEditing(null)} onSaved={loadMembers} />}
      {confirm && confirm.member && (
        <ConfirmModal
          title={og.removeMemberTitle}
          body={fmt(og.removeMemberBody, { name: confirm.member.name || confirm.member.email, org: org.name })}
          confirmLabel={og.removeMemberConfirm}
          cancelLabel={t.dash.common.cancel}
          onConfirm={() => remove(confirm.member)}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm && confirm.invite && (
        <ConfirmModal
          title={og.revokeInviteTitle}
          body={fmt(og.revokeInviteBody, { email: confirm.invite.email, org: org.name })}
          confirmLabel={og.revokeInvite}
          cancelLabel={t.dash.common.cancel}
          onConfirm={() => revoke(confirm.invite.id).then(() => setConfirm(null))}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

export function SettingsView({ org, orgCount, limits, keyCount, walletPerms = { create: false, edit: false, remove: false }, onRenameOrg, onDeleteOrg }) {
  const t = useT();
  const sv = t.dash.settings;
  const og = t.dash.orgs;
  // An organization's limits come from the OWNER's plan (the org's subscription).
  const orgLimits = planLimits(org.plan);
  const fmtLimit = (n) => (n == null ? "∞" : n);
  const canManageOrg = org.role === "owner" || org.role === "admin";
  const isOrgOwner = org.role === "owner";
  return (
    <>
      <ViewHead title={sv.title} />
      <div className="set-grid">
        <div className="panel set-panel"><div className="panel-head"><h3>{sv.org.title}</h3>{canManageOrg && org.id && <button type="button" className="btn btn-outline-w btn-sm" onClick={() => onRenameOrg(org)}>{og.rename}</button>}</div><div className="set-body">
          <div className="set-row"><div className="set-l">{sv.org.name}</div><div className="set-v">{org.name}</div></div>
          <div className="set-row"><div className="set-l">{sv.org.id}</div><div className="set-v tid">{org.id || "-"}</div></div>
          <div className="set-row"><div className="set-l">{sv.org.created}</div><div className="set-v">{org.createdAt ? fmtDate(org.createdAt) : "-"}</div></div>
          <div className="set-row"><div className="set-l">{sv.plan.current}</div><div className="set-v"><span className="kg pub">{t.dash.planNames[org.plan] || org.plan}</span></div></div>
          <div className="set-row"><div className="set-l">{sv.plan.seats}</div><div className="set-v">{fmtLimit(orgLimits.maxSeats)}</div></div>
          <div className="set-row"><div className="set-l">{sv.plan.apiKeys}</div><div className="set-v">{keyCount} / {fmtLimit(orgLimits.maxApiKeys)}</div></div>
          {isOrgOwner && org.id && orgCount > 1 && <button className="btn btn-soft danger-soft" style={{ marginTop: 8 }} onClick={() => onDeleteOrg(org)}>{DI.trash} {og.delete}</button>}
        </div></div>
        <OrgMembersPanel org={org} orgLimits={orgLimits} />
        {org.id && <OrgWalletsPanel orgId={org.id} perms={walletPerms} />}
      </div>
    </>
  );
}
