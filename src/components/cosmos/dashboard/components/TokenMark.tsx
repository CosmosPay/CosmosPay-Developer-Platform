import { networkLogoUrl, tokenLogoUrl } from "@/lib/logo-urls";

/* TokenMark: a token's mark with its network's beside it. Official artwork only, from the
   generated manifest (src/lib/token-logos.ts: every NEAR Intents token we could source and every
   network); a token or network missing there gets a neutral monogram, never a drawn
   approximation of someone else's logo. Decorative: the symbol and the network are always
   written next to it. */

function Mono({ text, className }: { text: string; className: string }) {
  return <span className={className}>{text.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "?"}</span>;
}

export function TokenMark({ symbol, chain, chainName, size = 32 }: { symbol: string; chain: string; chainName: string; size?: number }) {
  const logo = tokenLogoUrl(symbol);
  const badge = networkLogoUrl(chain);
  return (
    <span className="tmark" style={{ ["--tm" as string]: `${size}px` }} aria-hidden="true">
      {logo ? <img className="tmark-img" src={logo} alt="" width={size} height={size} loading="lazy" decoding="async" /> : <Mono className="tmark-mono" text={symbol} />}
      {badge ? <img className="tmark-badge" src={badge} alt="" width={14} height={14} loading="lazy" decoding="async" /> : <Mono className="tmark-badge tmark-badge-mono" text={chainName} />}
    </span>
  );
}
