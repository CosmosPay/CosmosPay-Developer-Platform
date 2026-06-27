import { useState, Fragment, useId } from "react";
import { Modal, IcCheck } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { COSMOS_RESOURCES, COSMOS_ACTIONS, cosmosScopeKey } from "@/lib/cosmos-scopes.ts";

/* Resource × action scope matrix for an API key (e.g. payments:read, webhooks:write).
   Mirrors the org-member permission picker, but with the Cosmos API's own scopes. */
function ScopePicker({ value, m }: any) {
  const has = (r: string, a: string) => value.perms.includes(cosmosScopeKey(r, a));
  const toggle = (r: string, a: string) => {
    const k = cosmosScopeKey(r, a);
    value.setPerms((v: string[]) => (v.includes(k) ? v.filter((x) => x !== k) : [...v, k]));
  };
  return (
    <div className="perm-table cols-2">
      <span className="perm-corner">{m.permResource}</span>
      {COSMOS_ACTIONS.map((a) => <span key={a} className="perm-act">{m.perms[a]}</span>)}
      {COSMOS_RESOURCES.map((r) => (
        <Fragment key={r}>
          <span className="perm-res">{m.scopeResources[r] || r}</span>
          {COSMOS_ACTIONS.map((a) => (
            <label key={a} className={`perm-chk${has(r, a) ? " on" : ""}`} title={`${m.scopeResources[r] || r} · ${m.perms[a]}`}>
              <input type="checkbox" checked={has(r, a)} onChange={() => toggle(r, a)} />
              <span className="chk-box">{has(r, a) && <IcCheck />}</span>
            </label>
          ))}
        </Fragment>
      ))}
    </div>
  );
}

/* Create + edit API keys. The environment (test vs production) is NOT chosen here — it
   follows the dashboard's test/production switch and is injected by the caller, so the
   key is always created for the environment the user is currently viewing. */
export function ApiKeyModal({ mode, initial, onClose, onSubmit }) {
  const t = useT();
  const m = t.dash.modals.key;
  const nameId = useId();
  const descId = useId();
  const isEdit = mode === "edit";
  const [name, setName] = useState((initial && initial.name) || "");
  const [description, setDescription] = useState((initial && initial.description) || "");
  const [role, setRole] = useState((initial && initial.role) || "user");
  const [perms, setPerms] = useState(initial && initial.permissions && initial.permissions.length ? initial.permissions : ["payments:read"]);
  // admin keys bypass scopes upstream, so the matrix only matters for "user" keys.
  const valid = name.trim().length > 0 && (role === "admin" || perms.length > 0);
  const submit = () => {
    const body = { role, permissions: role === "admin" ? [] : perms, name: name.trim(), description: description.trim() };
    onSubmit(body);
    onClose();
  };
  return (
    <Modal onClose={onClose}><div className="modal-body"><div className="modal-eyebrow">{m.eyebrow}</div><h3>{isEdit ? m.editTitle : m.title}</h3>
      <p>{isEdit ? m.editDesc : m.desc}</p>
      <label className="field-l" htmlFor={nameId}>{m.nameLabel}</label><input id={nameId} className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={m.namePlaceholder} autoFocus />
      <label className="field-l" htmlFor={descId} style={{ marginTop: 14 }}>{m.descLabel} <span className="field-hint">{t.dash.common.optional}</span></label><input id={descId} className="field" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={m.descPlaceholder} />
      <label className="field-l" style={{ marginTop: 14 }}>{m.roleLabel}</label>
      <div className="seg2 wrap">{["user", "admin"].map((r) => <button key={r} className={role === r ? "on" : ""} onClick={() => setRole(r)}>{m.roles[r]}</button>)}</div>
      {role === "admin" ? (
        <div className="field-hint" style={{ display: "block", marginTop: 12 }}>{m.adminHint}</div>
      ) : (<>
        <label className="field-l" style={{ marginTop: 14 }}>{m.permsLabel}</label>
        <ScopePicker value={{ perms, setPerms }} m={m} />
      </>)}
      <div className="modal-actions"><button className="btn btn-violet" disabled={!valid} onClick={submit}>{isEdit ? m.save : m.create}</button><button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button></div>
    </div></Modal>
  );
}
