import { Modal, IcCheck, IcCopy, useCopy } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";

export function RevealKeyModal({ k, onClose }) {
  const t = useT();
  const m = t.dash.modals.reveal;
  const [done, run] = useCopy();
  return (
    <Modal onClose={onClose}><div className="modal-body"><div className="modal-eyebrow">{m.eyebrow}</div><h3>{m.title}</h3>
      <p>{m.body}</p>
      <label className="field-l">{m.idLabel}</label>
      <div className="reveal-key"><code>{k.id}</code></div>
      <div className="reveal-key" style={{ marginTop: 10 }}><code>{k.secret}</code><button className={`copy-inline${done ? " done" : ""}`} title={t.dash.common.copy} onClick={() => run(k.secret, t.toasts.copied)}>{done ? <IcCheck /> : <IcCopy />}</button></div>
      <div className="modal-actions"><button className="btn btn-violet" onClick={onClose}>{m.saved}</button></div>
    </div></Modal>
  );
}
