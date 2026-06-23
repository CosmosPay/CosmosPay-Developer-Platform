import { useState } from "react";
import { Modal } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";

export function RenameOrgModal({ current, onClose, onRename }) {
  const t = useT();
  const og = t.dash.orgs;
  const mo = t.dash.modals.org;
  const [name, setName] = useState(current?.name || "");
  return (
    <Modal onClose={onClose}><div className="modal-body"><div className="modal-eyebrow">{mo.eyebrow}</div><h3>{og.renameTitle}</h3>
      <label className="field-l">{mo.nameLabel}</label><input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={mo.namePlaceholder} autoFocus />
      <div className="modal-actions"><button className="btn btn-violet" disabled={!name.trim() || name.trim() === current?.name} onClick={() => { onRename(name.trim()); onClose(); }}>{og.rename}</button><button className="btn btn-soft" onClick={onClose}>{t.dash.common.cancel}</button></div>
    </div></Modal>
  );
}
