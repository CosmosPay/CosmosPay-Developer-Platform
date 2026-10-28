/* AddressLink: an account as a reference (RecordLink): a link to its page on the chain's
   explorer (a new tab), its copy button, and a preview (product owner: "paid by" and "paid to"
   open, copy and preview like everything else). Shortened on screen; the full address is in the
   card, its title and what the button copies. The card names the role it plays (`label`), its
   network, and what the caller knows of it (`context`: the organization wallet it is, the
   payments listed with it). With no explorer for it, it still copies and previews. */
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n/index";
import { explorerAccountUrl, explorerTxUrl, isChain, tierOf } from "@/lib/chains";
import { RecordLink } from "@/components/cosmos/dashboard/components/RecordLink";
import { PreviewCard, shortAddress } from "@/components/cosmos/dashboard/components/RecordPreview";
import { networkLabel } from "@/components/cosmos/dashboard/components/PayLinkDetail";

export { shortAddress };

export function AddressLink({ chain, network, address, label, context }: {
  chain: string;
  network?: string | null;
  address?: string | null;
  label?: string;
  context?: () => [string, ReactNode][];
}) {
  const t = useT();
  if (!address) return <span>-</span>;
  const url = isChain(chain) ? explorerAccountUrl(chain, tierOf(network ?? ""), address) : null;
  return (
    <RecordLink
      href={url} external className="addr-link" title={address} copy={address}
      preview={() => (
        <PreviewCard
          label={label || t.dash.common.account} title={address} wrap
          fields={[[t.dash.paylinks.detail.fields.network, networkLabel({ chain, network })], ...(context ? context() : [])]}
        />
      )}
    >
      <code>{shortAddress(address)}</code>
    </RecordLink>
  );
}

/* A transaction as a reference, the same way: its explorer page (a new tab), its copy button and
   a preview. `label` names what the transaction did. */
export function TxLink({ chain, network, hash, label }: {
  chain: string;
  network?: string | null;
  hash?: string | null;
  label: string;
}) {
  const t = useT();
  if (!hash) return <span>-</span>;
  const url = isChain(chain) ? explorerTxUrl(chain, tierOf(network ?? ""), hash) : null;
  return (
    <RecordLink
      href={url} external className="addr-link" title={hash} copy={hash}
      preview={() => <PreviewCard label={label} title={hash} wrap fields={[[t.dash.paylinks.detail.fields.network, networkLabel({ chain, network })]]} />}
    >
      <code>{shortAddress(hash)}</code>
    </RecordLink>
  );
}
