/* ZkSignDialog: one signature for a private account, which is a customer's wallet: the XDR copied
   for the customer to sign in any Stellar wallet and the signed XDR pasted back, the copy and paste
   half of a swap's signing (SwapDetails). No wallet opens here (product owner, 2026-10-27): the
   account is the customer's, not the person's at the screen. It says what the signature is for,
   which account the transaction is and which one signs it (both as links), and, for a transaction
   that expires, how long is left. A sub-account's transaction is signed by its address, its only
   signer: a warning says so, since there is no other key to look for. It names the network to sign
   on, since a wallet signs for the one it is set to, and a signature for another network is told
   apart from a missing one. A signed XDR that is not this transaction, signed by that account, is
   refused with the reason. */
import { useEffect, useMemo, useState } from "react";
import { Networks, TransactionBuilder } from "@stellar/stellar-sdk";
import { Modal } from "@/components/cosmos/shared";
import { fmt, fmtNodes, useT } from "@/lib/i18n/index";
import { CopyBlock } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { AddressLink } from "@/components/cosmos/dashboard/components/AddressLink";
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
  const network = request.networkPassphrase === Networks.PUBLIC ? "public" : "testnet";
  const networkLabel = network === "public" ? "Mainnet" : "Testnet";
  // The transaction's own account: another one than the signer's for a sub-account.
  const source = useMemo(() => {
    try { return TransactionBuilder.fromXDR(request.xdr, request.networkPassphrase).source; } catch { return request.account; }
  }, [request.xdr, request.networkPassphrase, request.account]);
  const forSub = source !== request.account;
  const link = (address: string, label: string) => <AddressLink chain="stellar" network={network} address={address} label={label} />;

  const accept = (xdr: string) => {
    const check = signatureOn(request.xdr, xdr, request.account, request.networkPassphrase);
    if (check.ok) { onSigned(xdr.trim()); return; }
    setProblem(
      check.problem === "notSigned" ? fmt(zs.notSigned, { account })
        : check.problem === "otherNetwork" ? fmt(zs.otherNetwork, { network: networkLabel })
        : zs[check.problem],
    );
  };

  return (
    <Modal onClose={onCancel} label={copy.title}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">{zs.eyebrow}</div>
        <h3>{copy.title}</h3>
        <p className="field-note">{copy.desc}</p>

        {/* Which account the transaction is, and which one signs it. */}
        <div className="paylink-fields zks-who">
          {forSub && <div className="paylink-field"><span className="pf-k">{zs.txAccount}</span><span className="pf-v">{link(source, zs.txAccount)}</span></div>}
          <div className="paylink-field"><span className="pf-k">{zs.signer}</span><span className="pf-v">{link(request.account, zs.signer)}</span></div>
          <div className="paylink-field"><span className="pf-k">{zs.network}</span><span className="pf-v">{networkLabel}</span></div>
        </div>
        {forSub && (
          <div className="zka-exists" role="note">
            <div className="zka-exists-head">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M12 7.5v5.5M12 16.4v.1" /></svg>
              <b>{zs.subTitle}</b>
            </div>
            <p className="zka-exists-meta">{fmtNodes(zs.subBody, { sub: link(source, zs.txAccount), account: link(request.account, zs.signer) })}</p>
          </div>
        )}
        {left !== null && (
          <p className={`zks-clock${expired ? " expired" : ""}`} role="status">{expired ? zs.expired : fmt(zs.expires, { time: clock(left) })}</p>
        )}

        <CopyBlock label={zs.xdr} value={request.xdr} />

        {/* The transaction signed by the customer, pasted back. */}
        <div className="paylink-block">
          <div className="paylink-block-head"><label className="field-l" htmlFor="zks-signed">{zs.customerTitle}</label></div>
          <p className="field-note">{fmtNodes(zs.customerDesc, { account: link(request.account, zs.signer) })}</p>
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
