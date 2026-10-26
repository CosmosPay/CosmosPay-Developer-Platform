/* AddressLink: an account as a link to its page on the chain's explorer (a new tab), with a copy
   button beside it (product owner: "paid by" and "paid to" open and copy in one gesture each).
   Shortened on screen; the full address is the link's title and what the button copies. With no
   explorer for it (an unknown chain, a shape the chain does not use) it is the text alone. */
import type { MouseEvent } from "react";
import { useT, fmt } from "@/lib/i18n/index";
import { useCopy } from "@/components/cosmos/hooks/useCopy";
import { IcCheck, IcCopy } from "@/components/cosmos/icons";
import { explorerAccountUrl, isChain, tierOf } from "@/lib/chains";

export const shortAddress = (a: string) => (a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);

export function AddressLink({ chain, network, address }: { chain: string; network?: string | null; address?: string | null }) {
  const t = useT();
  const [done, copy] = useCopy();
  if (!address) return <span>-</span>;
  const url = isChain(chain) ? explorerAccountUrl(chain, tierOf(network ?? ""), address) : null;
  const text = <code>{shortAddress(address)}</code>;
  const onCopy = (e: MouseEvent) => { e.stopPropagation(); copy(address, t.toasts.copied); };
  return (
    <span className="addr">
      {url
        ? <a className="addr-link" href={url} target="_blank" rel="noopener noreferrer" title={address} onClick={(e) => e.stopPropagation()}>{text}</a>
        : <span title={address}>{text}</span>}
      <button type="button" className={`copy-mini addr-copy${done ? " done" : ""}`} onClick={onCopy} title={t.dash.common.copy} aria-label={fmt(t.dash.common.copyValue, { value: address })}>
        {done ? <IcCheck /> : <IcCopy />}
      </button>
    </span>
  );
}
