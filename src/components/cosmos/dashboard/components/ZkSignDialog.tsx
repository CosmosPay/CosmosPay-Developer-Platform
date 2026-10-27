/* ZkSignDialog: one signature for a private account, which is a customer's wallet: the XDR copied
   for the customer to sign in any Stellar wallet and the signed XDR pasted back, the copy and paste
   half of a swap's signing (SwapDetails). No wallet opens here (product owner, 2026-10-27): the
   account is the customer's, not the person's at the screen. It says what the signature is for
   and, for a transaction that expires, how long is left; a signed XDR that is not this
   transaction, signed by the account, is refused with the reason. */
import { useEffect, useState } from "react";
import { Modal } from "@/components/cosmos/shared";
import { fmt, useT } from "@/lib/i18n/index";
import { CopyBlock } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { shortAddress } from "@/lib/org-wallets";
import { signatureOn, type SignRequest } from "@/lib/zk/xdr-signer";

const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function ZkSignDialog({ request, onSigned, onCancel }: {
  request: SignRequest;
  onSigned: (signedXdr: string) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const zs = t.zk.sign;
  const [signed, setSigned] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!request.expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [request.expiresAt]);
  const left = request.expiresAt ? Math.max(0, request.expiresAt - now) : null;
  const expired = left === 0;
  const account = shortAddress(request.account);
  const copy = zs[request.purpose];

  const accept = (xdr: string) => {
    const check = signatureOn(request.xdr, xdr, request.account, request.networkPassphrase);
    if (check.ok) { onSigned(xdr.trim()); return; }
    setProblem(check.problem === "notSigned" ? fmt(zs.notSigned, { account }) : zs[check.problem]);
  };

  return (
    <Modal onClose={onCancel} label={copy.title}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">{zs.eyebrow}</div>
        <h3>{copy.title}</h3>
        <p className="field-note">{copy.desc}</p>
        {left !== null && (
          <p className={`zks-clock${expired ? " expired" : ""}`} role="status">{expired ? zs.expired : fmt(zs.expires, { time: clock(left) })}</p>
        )}

        <CopyBlock label={zs.xdr} value={request.xdr} />

        {/* The transaction signed by the customer, pasted back. */}
        <div className="paylink-block">
          <div className="paylink-block-head"><label className="field-l" htmlFor="zks-signed">{zs.customerTitle}</label></div>
          <p className="field-note">{fmt(zs.customerDesc, { account })}</p>
          <textarea
            id="zks-signed" className="field" rows={4} value={signed} placeholder={zs.pastePlaceholder} spellCheck={false}
            onChange={(e) => { setSigned(e.target.value); setProblem(null); }}
            aria-invalid={problem ? true : undefined}
          />
          {problem && <p className="field-err" role="alert">{problem}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-violet" disabled={!signed.trim() || expired} onClick={() => accept(signed)}>{zs.continue}</button>
            <button type="button" className="btn btn-soft" onClick={onCancel}>{t.dash.common.cancel}</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
