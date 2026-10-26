/* AddressLink: an account as a reference (RecordLink): a link to its page on the chain's
   explorer (a new tab), its copy button, and a preview (product owner: "paid by" and "paid to"
   open, copy and preview like everything else). Shortened on screen; the full address is in the
   card, its title and what the button copies. The card names the role it plays (`label`), its
   network, and what the caller knows of it (`context`: the organization wallet it is, the
   payments listed with it). With no explorer for it, it still copies and previews. */
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n/index";
import { explorerAccountUrl, isChain, tierOf } from "@/lib/chains";
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
