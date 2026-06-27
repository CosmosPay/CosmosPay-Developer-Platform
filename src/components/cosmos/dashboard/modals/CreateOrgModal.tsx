import { useState, useId } from "react";
import { Modal, IcArrow } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";

export function CreateOrgModal({ onClose, onAdd, count, limit, planName }) {
  const t = useT();
  const m = t.dash.modals.org;
  const nameId = useId();
  const [name, setName] = useState("");
  const atLimit = count >= limit;
  const remaining = limit === Infinity ? null : (limit - count);
  return (
    <Modal onClose={onClose}><div className="modal-body"><div className="modal-eyebrow">{m.eyebrow}</div><h3>{m.title}</h3>
      {atLimit ? (<><p>{fmt(m.atLimit, { plan: planName, limit, s: limit > 1 ? "s" : "" })}</p><a className="btn btn-violet" href="/pricing">{t.dash.common.viewPlans} <IcArrow /></a></>)
        : (<><p>{limit === Infinity ? fmt(m.bodyUnlimited, { plan: planName }) : fmt(m.body, { n: remaining, plan: planName })}</p>
          <label className="field-l" htmlFor={nameId}>{m.nameLabel}</label><input id={nameId} className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={m.namePlaceholder} autoFocus />
          <div className="modal-actions"><button className="btn btn-violet" disabled={!name.trim()} onClick={() => { onAdd(name.trim()); onClose(); }}>{m.create}</button><button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button></div></>)}
    </div></Modal>
  );
}
