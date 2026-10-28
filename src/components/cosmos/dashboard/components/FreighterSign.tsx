/* FreighterSign: the one-click way to sign a Stellar transaction the Payments API built
   (a swap, a liquidity deposit or withdrawal). Freighter signs it and `onSigned` receives the
   signed XDR to submit; the QR and the paste box stay for every other wallet. */
import { useState } from "react";
import { useT, fmt } from "@/lib/i18n/index";
import { signWithFreighter, type StellarNetwork } from "@/lib/wallets/freighter";

const short = (a) => (a && a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || "");

export function FreighterSign({ xdr, network, signer, busy = false, onSigned }: {
  xdr: string;
  network: string;
  signer?: string;
  busy?: boolean;
  onSigned: (signedXdr: string) => void;
}) {
  const t = useT();
  const w = t.dash.wallet;
  const [signing, setSigning] = useState(false);
  const [note, setNote] = useState("");
  const net: StellarNetwork = network === "public" ? "public" : "testnet";

  const sign = async () => {
    if (signing || busy) return;
    setSigning(true);
    setNote("");
    try {
      const res = await signWithFreighter(xdr, net, signer);
      if (res.ok) { onSigned(res.signedXdr); return; }
      if (res.reason === "missing") setNote(w.missing);
      else if (res.reason === "wrongAccount") setNote(fmt(w.wrongAccount, { account: short(signer) }));
      else if (res.reason === "wrongNetwork") setNote(fmt(w.wrongNetwork, { network: w.networks[net] }));
      else setNote(w.declined);
    } catch {
      setNote(w.declined);
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="wallet-sign">
      <button type="button" className="btn btn-dark" disabled={signing || busy} onClick={sign}>
        {signing ? w.signing : busy ? w.submitting : w.freighter}
      </button>
      <p className="wallet-sign-note" role="status" aria-live="polite">{note}</p>
    </div>
  );
}
