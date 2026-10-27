import { useState, Fragment } from "react";
import { Modal, IcCheck } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { COSMOS_RESOURCES, COSMOS_ACTIONS, cosmosScopeKey } from "@/lib/cosmos-scopes.ts";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { FormSteps, FormStep, FormStepsFooter, useFormSteps } from "@/components/cosmos/dashboard/components/FormSteps";

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

/* Create + edit API keys. The environment (test vs production) is NOT chosen here: it
   follows the dashboard's test/production switch and is injected by the caller, so the
   key is always created for the environment the user is currently viewing. Two steps (product
   owner, 2026-10-27: a long form goes in steps): its name and role, then its scopes (the
   resource × action matrix, or an admin key's note). */
export function ApiKeyModal({ mode, initial, onClose, onSubmit }) {
  const t = useT();
  const m = t.dash.modals.key;
  const steps = useFormSteps(2);
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
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div className="modal-eyebrow">{m.eyebrow}</div>
        <h3>{isEdit ? m.editTitle : m.title}</h3>
        <FormSteps names={[m.steps.details, m.steps.scopes]} steps={steps} />
        <FormStep steps={steps}>
          {steps.step === 0 && (<>
            <Field label={m.nameLabel} value={name} onChange={(e) => setName(e.target.value)} placeholder={m.namePlaceholder} autoFocus />
            <Field label={m.descLabel} hint={t.dash.common.optional} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={m.descPlaceholder} />
            <div className="fld">
              <span className="field-l" id="key-role-l">{m.roleLabel}</span>
              <div className="seg-tabs seg-fill" role="group" aria-labelledby="key-role-l">
                {["user", "admin"].map((r) => <button key={r} type="button" className={role === r ? "on" : ""} aria-pressed={role === r} onClick={() => setRole(r)}>{m.roles[r]}</button>)}
              </div>
            </div>
          </>)}
          {steps.step === 1 && (role === "admin" ? (
            <p className="field-help">{m.adminHint}</p>
          ) : (<>
            <span className="field-l">{m.permsLabel}</span>
            <ScopePicker value={{ perms, setPerms }} m={m} />
          </>))}
        </FormStep>
        <FormStepsFooter steps={steps} canNext={name.trim().length > 0} onCancel={onClose} submitLabel={isEdit ? m.save : m.create} onSubmit={submit} submitDisabled={!valid} />
      </div>
    </Modal>
  );
}
