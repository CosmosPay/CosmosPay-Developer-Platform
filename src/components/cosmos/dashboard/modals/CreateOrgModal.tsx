import { useState, useId } from "react";
import { Modal, IcArrow, PRICING } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";

/* At the plan's organization limit it offers the plan dialog in its place (`onUpgrade`, for whoever
   can change plan), or the public pricing page otherwise. */
export function CreateOrgModal({ onClose, onAdd, count, limit, planName, onUpgrade = null }) {
  const t = useT();
  const m = t.dash.modals.org;
  const nameId = useId();
  const [name, setName] = useState("");
  const atLimit = count >= limit;
  const remaining = limit === Infinity ? null : (limit - count);
  return (
    <Modal onClose={onClose}><div className="modal-body"><div className="modal-eyebrow">{m.eyebrow}</div><h3>{m.title}</h3>
      {atLimit ? (<><p>{fmt(limit === 1 ? m.atLimitOne : m.atLimit, { plan: planName, limit })}</p>{onUpgrade ? <div className="modal-actions"><button type="button" className="btn btn-violet" onClick={onUpgrade}>{t.dash.common.viewPlans}</button></div> : <a className="btn btn-violet" href={PRICING}>{t.dash.common.viewPlans} <IcArrow /></a>}</>)
        : (<><p>{limit === Infinity ? fmt(m.bodyUnlimited, { plan: planName }) : fmt(m.body, { n: remaining, plan: planName })}</p>
          <label className="field-l" htmlFor={nameId}>{m.nameLabel}</label><input id={nameId} className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={m.namePlaceholder} autoFocus />
          <div className="modal-actions"><button className="btn btn-violet" disabled={!name.trim()} onClick={() => { onAdd(name.trim()); onClose(); }}>{m.create}</button><button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button></div></>)}
    </div></Modal>
  );
}
