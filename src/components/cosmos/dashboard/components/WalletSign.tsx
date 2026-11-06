/* WalletSign: signing what the Payments API built with any wallet this browser has, in one click
   (product owner, 2026-11-06: "from the Stellar Wallets Kit to MetaMask, every compatible one").
   The wallets come from the SDK's wallets module (src/lib/wallets/find.ts): every Stellar wallet,
   every EVM wallet that announces itself, every Solana wallet. The block lists the ones found;
   a click connects that wallet, checks it is the account the transaction was built for, and hands
   it to `onUse`, which signs (or, on an EVM chain, sends) and submits. With no wallet found the
   block is not drawn: the QR, the link and the paste box under it serve every other wallet.
   StellarWalletSign is the Stellar case (a swap, a USDT0 transfer, a liquidity operation): the
   signed envelope goes to `onSigned`. */
import { useEffect, useRef, useState } from "react";
import { fmt, useT } from "@/lib/i18n/index";
import { Sk } from "@/components/cosmos/dashboard/components/Skeleton";
import { findWallets, sameAccount, walletsSdk, type AnyWallet, type Ecosystem } from "@/lib/wallets/find";

/* The wallets the SDK reaches without an icon of their own, drawn with their official artwork
   (the landing's wallet row uses the same files); any other one draws its monogram. */
const OWN_ART: Record<string, string> = {
  "stellar:cosmos": "/brand/isotipo-variante-1.svg",
  "stellar:freighter": "/media/brands/freighter.webp",
  "stellar:lobstr": "/media/brands/lobstr.webp",
  "stellar:xbull": "/media/brands/xbull.webp",
  "stellar:albedo": "/media/brands/albedo.webp",
  "stellar:rabet": "/media/brands/rabet.webp",
};

const short = (a?: string | null) => (a && a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || "");

/* A wallet's error as one readable line: the SDK prefixes its wallet's id in brackets. */
function reasonOf(err: unknown): string {
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return message.replace(/^\[[^\]]+\]\s*/, "").trim();
}

function WalletMark({ wallet }: { wallet: AnyWallet }) {
  const [failed, setFailed] = useState(false);
  const src = OWN_ART[wallet.id] ?? wallet.icon;
  if (src && !failed) {
    return <img className="wsign-mark" src={src} alt="" width={28} height={28} decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
  }
  return <span className="wsign-mark wsign-mono" aria-hidden="true">{wallet.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "?"}</span>;
}

export type WalletProgress = (note: string) => void;

export function WalletSign({ ecosystem, chainName, signer, network = "public", busy = false, title, onUse }: {
  ecosystem: Ecosystem;
  /* The network's name, for the wallets' list label. */
  chainName: string;
  /* The account the transaction was built for: another one's signature would not count. */
  signer?: string | null;
  /* Stellar only: the network the wallet connects on. */
  network?: "public" | "testnet";
  busy?: boolean;
  title?: string;
  /* Signs or sends with the connected wallet and submits; reports its steps through `progress`. */
  onUse: (wallet: AnyWallet, address: string, progress: WalletProgress) => Promise<void>;
}) {
  const t = useT();
  const w = t.dash.wallet;
  const [wallets, setWallets] = useState<AnyWallet[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let current = true;
    findWallets(ecosystem)
      .then((list) => { if (current) setWallets(list); })
      .catch(() => { if (current) setWallets([]); });
    return () => { current = false; mounted.current = false; };
  }, [ecosystem]);

  const say = (text: string) => { if (mounted.current) setNote(text); };

  const use = async (wallet: AnyWallet) => {
    if (active || busy) return;
    setActive(wallet.id);
    say(fmt(w.confirmIn, { wallet: wallet.name }));
    try {
      const address = wallet.ecosystem === "stellar" ? await wallet.connect(network) : await wallet.connect();
      if (signer && !sameAccount(ecosystem, address, signer)) {
        say(fmt(w.otherAccount, { wallet: wallet.name, account: short(signer) }));
        return;
      }
      await onUse(wallet, address, say);
      say("");
    } catch (err) {
      const { isUserRejection } = await walletsSdk();
      const reason = reasonOf(err);
      say(isUserRejection(err) || !reason ? fmt(w.declinedBy, { wallet: wallet.name }) : fmt(w.failedIn, { wallet: wallet.name, reason }));
    } finally {
      if (mounted.current) setActive(null);
    }
  };

  // Nothing found: the block is not drawn (the QR and the paste box below stay).
  if (wallets && wallets.length === 0) return null;

  return (
    <div className="paylink-block wsign">
      <div className="paylink-block-head"><span className="field-l">{title ?? w.signTitle}</span></div>
      {wallets === null ? (
        <div className="wsign-list" role="status" aria-busy="true">
          <span className="sr-only">{w.finding}</span>
          {[0, 1].map((r) => (
            <div className="wsign-opt is-sk" key={r} aria-hidden="true"><Sk className="round" r={r} /><Sk r={r} /></div>
          ))}
        </div>
      ) : (
        <ul className="wsign-list" aria-label={fmt(w.walletsOn, { chain: chainName })}>
          {wallets.map((x) => (
            <li key={x.id}>
              <button type="button" className={`wsign-opt${active === x.id ? " on" : ""}`} disabled={!!active || busy} aria-busy={active === x.id} onClick={() => use(x)}>
                <WalletMark wallet={x} />
                <span className="wsign-name">{x.name}</span>
                {active === x.id ? <span className="wsign-spin" aria-hidden="true" /> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="wallet-sign-note" role="status" aria-live="polite">{note}</p>
    </div>
  );
}

/** A Stellar transaction signed by any Stellar wallet: `onSigned` gets the signed envelope. */
export function StellarWalletSign({ xdr, network, signer, busy = false, onSigned }: {
  xdr: string;
  network: string;
  signer?: string;
  busy?: boolean;
  onSigned: (signedXdr: string) => void;
}) {
  const net = network === "public" ? "public" : "testnet";
  return (
    <WalletSign
      ecosystem="stellar"
      chainName="Stellar"
      network={net}
      signer={signer}
      busy={busy}
      onUse={async (wallet, address) => {
        if (wallet.ecosystem !== "stellar") return;
        onSigned(await wallet.signTransaction(xdr, { network: net, address }));
      }}
    />
  );
}
