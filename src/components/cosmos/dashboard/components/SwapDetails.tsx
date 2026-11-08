/* The screens a swap opens once created, shared by the dashboard (the organization's proxies) and
   the public swap pages (the gateway with the shared public key): both pass a SwapApi
   (src/lib/swap-api.ts). One per kind of record:
   - a swap on Stellar: any Stellar wallet in this browser in one click (WalletSign), the SEP-7 QR /
     link / XDR for any other wallet, or a signed envelope pasted back;
   - a swap on Solana: any Solana wallet signs it in one click, or the transaction is signed
     elsewhere and pasted back;
   - a swap on Monad: any EVM wallet sends the approval (when there is one) and the swap, and the
     swap's hash is submitted; or the signed transaction, or the hash of one sent elsewhere, pasted;
   - a swap between chains: NEAR Intents' deposit address (CrossChainSwapDetailModal);
   - USDT0 out of Stellar: the Soroban transaction to sign (any Stellar wallet, or the QR / XDR),
     then the LayerZero message followed to its destination.
   Each reads its record again until it settles. */
import { useEffect, useState } from "react";
import { Modal, showToast } from "@/components/cosmos/shared";
import { fmt, useLang, useT } from "@/lib/i18n/index";
import { bpsPercent } from "@/lib/plans";
import { DI } from "@/components/cosmos/dashboard/icons";
import { fmtDateTime } from "@/components/cosmos/dashboard/helpers";
import { StellarWalletSign, WalletSign, type WalletProgress } from "@/components/cosmos/dashboard/components/WalletSign";
import { walletsSdk } from "@/lib/wallets/find";
import { CrossChainSwapDetailModal } from "@/components/cosmos/dashboard/components/CrossChainSwapDetail";
import { assetLabel, CopyBlock, CopyField } from "@/components/cosmos/dashboard/components/PayLinkDetail";
import { assetLabel as chainAssetLabel, explorerTxUrl, networkName, tierOf } from "@/lib/chains";
import { isRetryLater, type SwapApi, type SwapRecordKind } from "@/lib/swap-api";

const TERMINAL = ["SUCCEEDED", "FAILED", "DELIVERED"];
/* A record stops changing once it settled, failed, or expired without a transaction (an expired
   Solana or Monad swap with a hash is still looked for on-chain). */
const settled = (s) => TERMINAL.includes(s.status) || (s.status === "EXPIRED" && !s.txHash);
const chainOfSwap = (s) => s.chain || "stellar";
const swapExplorer = (s) => explorerTxUrl(chainOfSwap(s), tierOf(s.network), s.txHash);
const TX_HASH = /^0x[0-9a-fA-F]{64}$/;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/* How long the Payments API is given to see a Monad transaction the wallet just sent. */
const NODE_RETRIES = 10;
const NODE_RETRY_MS = 3000;

/* Polls a record until it is terminal so its status and hashes update live. */
function useRecord(api: SwapApi, kind: SwapRecordKind, rec, complete: (r) => boolean, everyMs = 5000) {
  const [data, setData] = useState(rec);
  useEffect(() => {
    if (complete(data)) return;
    let alive = true;
    api.get(kind, rec.id).then((full) => { if (alive && full) setData(full); }).catch(() => {});
    return () => { alive = false; };
  }, [rec.id, api]);
  useEffect(() => {
    if (settled(data)) return;
    let alive = true;
    const h = setInterval(() => {
      if (document.hidden) return;
      api.get(kind, rec.id).then((full) => { if (alive && full) setData(full); }).catch(() => {});
    }, everyMs);
    return () => { alive = false; clearInterval(h); };
  }, [rec.id, api, data.status, data.txHash]);
  return [data, setData];
}

/** The screen for a created record of any kind. */
export function SwapRecordDetail({ api, kind, record, canManage = true, onClose }: { api: SwapApi; kind: SwapRecordKind; record; canManage?: boolean; onClose: () => void }) {
  if (kind === "cross") return <CrossChainSwapDetailModal swap={record} api={api} canManage={canManage} onClose={onClose} />;
  if (kind === "usdt0") return <Usdt0TransferDetailModal transfer={record} api={api} canManage={canManage} onClose={onClose} />;
  if (chainOfSwap(record) === "stellar") return <SwapDetailModal swap={record} api={api} canManage={canManage} onClose={onClose} />;
  return <ChainSwapDetailModal swap={record} api={api} canManage={canManage} onClose={onClose} />;
}

/* ---------------- a swap on Stellar (QR + uri + xdr + submit signed tx) ---------------- */
function SwapDetailModal({ api, swap, canManage, onClose }) {
  const t = useT();
  const lang = useLang();
  const sw = t.dash.swaps;
  const d = sw.detail;
  // Seed with the row, then fetch the full record for the QR/uri/xdr.
  const [data, setData] = useRecord(api, "same", swap, (s) => !!(s.qr && s.uri));
  const [signed, setSigned] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);

  // The signed envelope comes from Freighter or from the paste box.
  const submit = (signedXdr = signed.trim()) => {
    if (!signedXdr || busy) return;
    setBusy(true);
    setOutcome(null);
    api.submit("same", swap.id, { signedXdr })
      .then((res) => {
        setOutcome(res || {});
        if (res && res.swap) setData((cur) => ({ ...cur, ...res.swap }));
        if (res && res.submitted) showToast(d.submitted);
      })
      .catch((err) => { setOutcome({ submitted: false, reason: (err && err.message) || d.submitFailed }); })
      .finally(() => setBusy(false));
  };

  const F = d.fields;
  const fields = [
    [F.id, data.id],
    [F.status, (sw.status && sw.status[data.status]) || data.status],
    [F.network, data.network],
    [F.source, data.source],
    [F.destination, data.destination],
    [F.sent, data.sendAmount ? `${data.sendAmount} ${assetLabel(data.sendAsset)}` : null],
    [F.received, data.destEstimated ? `${data.destEstimated} ${data.destAsset}` : null],
    [F.minimum, data.destMin ? `${data.destMin} ${data.destAsset}` : null],
    [F.fee, data.feeAmount ? `${data.feeAmount} ${assetLabel(data.sendAsset)} (${bpsPercent(data.feeBps, lang)})` : null],
    [F.memo, data.memo],
    [F.commissionMemo, data.commissionMemo],
    [F.txHash, data.txHash],
    [F.created, fmtDateTime(data.createdAt)],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  // Only a built, unsigned swap can be signed: a submitted one is on its way, an expired one's
  // time bounds have passed.
  const signable = canManage && !!data.xdr && data.status === "PENDING";

  return (
    <Modal onClose={onClose}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">{d.eyebrow}</div>
        <h3>{d.title}</h3>

        {/* Swapping into an asset the account does not trust yet: the same transaction adds the
            trustline first. Said before the signature, since it also holds 0.5 XLM in reserve. */}
        {data.status === "PENDING" && data.trustline && (
          <p className="field-help swap-trustline" role="note">{fmt(d.trustlineNote, { asset: data.trustline.code })}</p>
        )}

        {signable && <StellarWalletSign xdr={data.xdr} network={data.network} signer={data.source} busy={busy} onSigned={(x) => submit(x)} />}

        {/* What other wallets sign from, while the swap waits for its signature. */}
        {data.status === "PENDING" && data.qr && (
          <div className="paylink-qr-wrap">
            <img className="paylink-qr" src={data.qr} alt={d.scan} width={220} height={220} />
            <div className="paylink-qr-cap">{d.scan}</div>
            <a className="btn btn-soft btn-sm" href={data.qr} download={`swap-${data.id}.png`}>{DI.download} {d.downloadQr}</a>
          </div>
        )}

        {data.status === "PENDING" && data.uri && (
          <CopyBlock label={d.uri} value={data.uri}>
            <div className="paylink-actions">
              <a className="btn btn-dark btn-sm" href={data.uri}>{DI.link} {d.openWallet}</a>
            </div>
          </CopyBlock>
        )}

        {data.status === "PENDING" && data.xdr && <CopyBlock label={d.xdr} value={data.xdr} />}

        {/* The hash exists before signing; the explorer only knows it once it was sent. */}
        {data.txHash && data.status !== "PENDING" && (
          <div className="paylink-actions" style={{ marginBottom: 12 }}>
            <a className="btn btn-soft btn-sm" href={swapExplorer(data)} target="_blank" rel="noopener noreferrer">{DI.network} {d.viewExplorer}</a>
          </div>
        )}

        <div className="paylink-fields">
          {fields.map(([label, v]) => <CopyField key={label} label={label} value={v} />)}
        </div>

        {/* Or a transaction signed in another wallet, pasted back. */}
        {signable && (
          <div className="paylink-block">
            <div className="paylink-block-head"><label className="field-l" htmlFor={`swap-signed-${data.id}`}>{d.submitTitle}</label></div>
            <p className="field-note">{d.submitDesc}</p>
            <textarea id={`swap-signed-${data.id}`} className="field" rows={4} value={signed} onChange={(e) => setSigned(e.target.value)} placeholder={d.submitPlaceholder} />
            <div className="modal-actions">
              <button className="btn btn-violet" disabled={!signed.trim() || busy} onClick={() => submit()}>{busy ? d.submitting : d.submit}</button>
            </div>
          </div>
        )}

        <SubmitOutcome d={d} outcome={outcome} />
      </div>
    </Modal>
  );
}

/* ---------------- a swap on Solana / Monad (transaction + approval + submit) ---------------- */
function ChainSwapDetailModal({ api, swap, canManage, onClose }) {
  const t = useT();
  const lang = useLang();
  const sw = t.dash.swaps;
  const d = sw.detail;
  const c = sw.chainDetail;
  const chain = swap.chain;
  const w = t.dash.wallet;
  const [data, setData] = useRecord(api, "same", swap, (s) => !!s.transaction);
  const [signed, setSigned] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);

  /* Submits a signed transaction, or (Monad) the hash of one already sent. A hash the Payments
     API's node does not know yet records nothing and is asked again a few seconds later; one
     that still fails stays in the paste box to send again. */
  const send = async (body: { signedTransaction: string } | { txHash: string }, progress: WalletProgress = () => {}) => {
    setBusy(true);
    setOutcome(null);
    try {
      for (let attempt = 0; ; attempt += 1) {
        try {
          const res = await api.submit("same", swap.id, body);
          setOutcome(res || {});
          if (res && res.swap) setData((cur) => ({ ...cur, ...res.swap }));
          if (res && res.submitted) showToast(d.submitted);
          return;
        } catch (err) {
          if ("txHash" in body && isRetryLater(err) && attempt < NODE_RETRIES) {
            progress(w.waitingNode);
            await sleep(NODE_RETRY_MS);
            continue;
          }
          throw err;
        }
      }
    } catch (err) {
      if ("txHash" in body) setSigned(body.txHash);
      setOutcome({ submitted: false, reason: (err as Error | null)?.message || d.submitFailed });
    } finally {
      setBusy(false);
    }
  };

  // The paste box takes the signed transaction, or on Monad the hash of one sent elsewhere.
  const submit = () => {
    const value = signed.trim();
    if (!value || busy) return;
    send(chain === "monad" && TX_HASH.test(value) ? { txHash: value } : { signedTransaction: value });
  };

  /* Solana: the wallet signs the base64 transaction, the Payments API checks and relays it. */
  const signSolana = async (wallet, _address: string, progress: WalletProgress) => {
    if (wallet.ecosystem !== "solana") return;
    const cluster = tierOf(data.network) === "public" ? "solana:mainnet" : "solana:devnet";
    const signedTransaction = await wallet.signTransaction(data.transaction.data, cluster);
    progress(d.submitting);
    await send({ signedTransaction }, progress);
  };

  /* Monad: an EVM wallet sends (it cannot hand a signed transaction back): the approval first
     when the swap has one, mined before the swap, then the swap, whose hash is submitted. */
  const sendMonad = async (wallet, from: string, progress: WalletProgress) => {
    if (wallet.ecosystem !== "evm") return;
    const { EvmChains } = await walletsSdk();
    const chainFor = (id) => (id === EvmChains.monad.chainId ? EvmChains.monad : id === EvmChains.monadTestnet.chainId ? EvmChains.monadTestnet : undefined);
    const call = (c) => ({ from, to: c.to, data: c.data, value: c.value, chainId: c.chainId });
    if (data.approval) {
      progress(fmt(w.approveIn, { wallet: wallet.name }));
      const approval = await wallet.sendTransaction(call(data.approval), chainFor(data.approval.chainId));
      progress(w.approvalMining);
      const receipt = await wallet.waitForTransaction(approval);
      if (receipt.status !== "success") throw new Error(w.approvalFailed);
    }
    progress(fmt(w.confirmIn, { wallet: wallet.name }));
    const txHash = await wallet.sendTransaction(call(data.transaction), chainFor(data.transaction.chainId));
    progress(d.submitting);
    await send({ txHash }, progress);
  };

  const tx = data.transaction || {};
  // Solana hands out base64 bytes; Monad a call object the wallet signs as EIP-1559.
  const txText = tx.encoding === "base64" ? tx.data : JSON.stringify(tx, null, 2);
  const F = d.fields;
  const fields = [
    [F.id, data.id],
    [F.status, (sw.status && sw.status[data.status]) || data.status],
    [c.provider, `${sw.venues[chain]} · ${sw.chains[chain]}`],
    [F.source, data.source],
    [F.sent, data.sendAmount ? `${data.sendAmount} ${chainAssetLabel(chain, data.sendAsset)}` : null],
    [F.received, data.destEstimated ? `${data.destEstimated} ${chainAssetLabel(chain, data.destAsset)}` : null],
    [F.minimum, data.destMin ? `${data.destMin} ${chainAssetLabel(chain, data.destAsset)}` : null],
    [F.fee, data.feeAmount ? `${data.feeAmount} ${chainAssetLabel(chain, data.destAsset)} (${bpsPercent(data.feeBps, lang)})` : null],
    [c.expires, data.status === "PENDING" ? fmtDateTime(data.expiresAt) : null],
    [F.txHash, data.txHash],
    [F.created, fmtDateTime(data.createdAt)],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  const isTerminal = TERMINAL.includes(data.status);
  const walletSignable = canManage && data.status === "PENDING" && !!data.transaction && (chain === "solana" || chain === "monad");

  return (
    <Modal onClose={onClose}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">{d.eyebrow} · {sw.chains[chain]}</div>
        <h3>{c.title}</h3>

        {walletSignable && (
          <WalletSign
            ecosystem={chain === "monad" ? "evm" : "solana"}
            chainName={sw.chains[chain]}
            signer={data.source}
            busy={busy}
            onUse={chain === "monad" ? sendMonad : signSolana}
          />
        )}

        {data.approval && data.status === "PENDING" && (
          <CopyBlock label={c.approval} value={JSON.stringify(data.approval, null, 2)} lang="json">
            <p className="field-note">{c.approvalNote}</p>
          </CopyBlock>
        )}
        {data.transaction && data.status === "PENDING" && <CopyBlock label={c.transaction} value={txText} lang={tx.encoding === "base64" ? undefined : "json"} />}
        {data.txHash && (
          <div className="paylink-actions" style={{ marginBottom: 12 }}>
            <a className="btn btn-soft btn-sm" href={swapExplorer(data)} target="_blank" rel="noopener noreferrer">{DI.network} {d.viewExplorer}</a>
          </div>
        )}

        <div className="paylink-fields">
          {fields.map(([label, v]) => <CopyField key={label} label={label} value={v} />)}
        </div>

        {canManage && !isTerminal && data.status !== "EXPIRED" && (
          <div className="paylink-block">
            <div className="paylink-block-head"><label className="field-l">{d.submitTitle}</label></div>
            <p className="field-note">{chain === "monad" ? c.submitDescMonad : c.submitDesc}</p>
            <textarea className="field" rows={4} value={signed} onChange={(e) => setSigned(e.target.value)} placeholder={chain === "monad" ? c.submitPlaceholderMonad : c.submitPlaceholder} />
            <div className="modal-actions">
              <button className="btn btn-violet" disabled={!signed.trim() || busy} onClick={submit}>{busy ? d.submitting : d.submit}</button>
            </div>
          </div>
        )}

        <SubmitOutcome d={d} outcome={outcome} />
      </div>
    </Modal>
  );
}

/* ---------------- USDT0 out of Stellar (LayerZero's OFT) ---------------- */
function Usdt0TransferDetailModal({ api, transfer, canManage, onClose }) {
  const t = useT();
  const lang = useLang();
  const sw = t.dash.swaps;
  const d = sw.detail;
  const u = sw.usdt0;
  const [data, setData] = useRecord(api, "usdt0", transfer, (x) => !!(x.xdr || x.status !== "PENDING"), 8000);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const dest = networkName(data.to);

  const submit = (signedXdr: string) => {
    if (!signedXdr || busy) return;
    setBusy(true);
    setOutcome(null);
    api.submit("usdt0", transfer.id, { signedXdr })
      .then((res) => {
        setOutcome(res || {});
        if (res && res.transfer) setData((cur) => ({ ...cur, ...res.transfer }));
        if (res && res.submitted) showToast(d.submitted);
      })
      .catch((err) => { setOutcome({ submitted: false, reason: (err && err.message) || d.submitFailed }); })
      .finally(() => setBusy(false));
  };

  const F = d.fields;
  const fields = [
    [F.id, data.id],
    [F.status, (sw.status && sw.status[data.status]) || data.status],
    [F.source, data.source],
    [u.destination, dest],
    [u.recipient, data.recipient],
    [F.sent, data.amountSent ? `${data.amountSent} USDT0` : null],
    [u.arrives, data.amountReceived ? `${data.amountReceived} ${data.receives}` : null],
    // Cosmos Pay's commission, paid by the fee wrapper (none without one).
    [F.fee, Number(data.feeAmount) > 0 ? `${data.feeAmount} USDT0 (${bpsPercent(data.feeBps, lang)})` : null],
    [u.fee, data.nativeFee ? `${data.nativeFee} XLM` : null],
    [F.txHash, data.txHash],
    [u.destTx, data.destinationTxHash],
    [F.created, fmtDateTime(data.createdAt)],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  const signable = canManage && !!data.xdr && data.status === "PENDING";
  const stellarTx = data.txHash ? explorerTxUrl("stellar", tierOf(data.network), data.txHash) : null;

  return (
    <Modal onClose={onClose}>
      <div className="modal-body paylink-detail">
        <div className="modal-eyebrow">USDT0</div>
        <h3>{fmt(u.title, { chain: dest })}</h3>

        {data.status === "SUBMITTED" && <p className="field-help swap-trustline" role="status">{fmt(u.travelling, { chain: dest })}</p>}
        {data.status === "DELIVERED" && <p className="field-help swap-trustline" role="status">{fmt(u.delivered, { chain: dest })}</p>}

        {signable && <StellarWalletSign xdr={data.xdr} network={data.network} signer={data.source} busy={busy} onSigned={(x) => submit(x)} />}

        {data.status === "PENDING" && data.qr && (
          <div className="paylink-qr-wrap">
            <img className="paylink-qr" src={data.qr} alt={d.scan} width={220} height={220} />
            <div className="paylink-qr-cap">{d.scan}</div>
          </div>
        )}
        {data.status === "PENDING" && data.uri && (
          <CopyBlock label={d.uri} value={data.uri}>
            <div className="paylink-actions"><a className="btn btn-dark btn-sm" href={data.uri}>{DI.link} {d.openWallet}</a></div>
          </CopyBlock>
        )}
        {data.status === "PENDING" && data.xdr && <CopyBlock label={d.xdr} value={data.xdr} />}

        {(stellarTx || data.scanUrl) && (
          <div className="paylink-actions" style={{ marginBottom: 12 }}>
            {stellarTx && <a className="btn btn-soft btn-sm" href={stellarTx} target="_blank" rel="noopener noreferrer">{DI.network} {d.viewExplorer}</a>}
            {data.scanUrl && <a className="btn btn-soft btn-sm" href={data.scanUrl} target="_blank" rel="noopener noreferrer">{DI.network} {u.scan}</a>}
          </div>
        )}

        <div className="paylink-fields">
          {fields.map(([label, v]) => <CopyField key={label} label={label} value={v} />)}
        </div>

        <SubmitOutcome d={d} outcome={outcome} />
      </div>
    </Modal>
  );
}

function SubmitOutcome({ d, outcome }) {
  if (!outcome) return null;
  return (
    <div className="paylink-fields" style={{ marginTop: 8 }}>
      <CopyField label={d.fields.status} value={outcome.submitted ? d.submitted : (outcome.reason || d.submitFailed)} />
      {outcome.txHash && <CopyField label={d.fields.txHash} value={outcome.txHash} />}
      {Array.isArray(outcome.resultCodes?.operations) && outcome.resultCodes.operations.length > 0 && <CopyField label={d.resultCodes} value={outcome.resultCodes.operations.join(", ")} />}
      {typeof outcome.resultCodes === "string" && <CopyField label={d.resultCodes} value={outcome.resultCodes} />}
    </div>
  );
}
