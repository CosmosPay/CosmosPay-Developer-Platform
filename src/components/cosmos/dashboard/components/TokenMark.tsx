/* TokenMark: a token's mark with its network's beside it. Official artwork only, from
   public/media/brands (USDC, EURC, XLM, SOL, MON); any other token or network gets a neutral
   monogram, never a drawn approximation of someone else's logo. Decorative: the symbol and the
   network are always written next to it. */
const TOKEN_LOGOS: Record<string, string> = {
  USDC: "/media/brands/usdc.svg",
  EURC: "/media/brands/eurc.webp",
  XLM: "/media/brands/xlm.svg",
  SOL: "/media/brands/sol.svg",
  MON: "/media/brands/monad.webp",
};
const CHAIN_LOGOS: Record<string, string> = {
  stellar: "/media/brands/xlm.svg",
  solana: "/media/brands/sol.svg",
  monad: "/media/brands/monad.webp",
};

function Mono({ text, className }: { text: string; className: string }) {
  return <span className={className}>{text.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "?"}</span>;
}

export function TokenMark({ symbol, chain, chainName, size = 32 }: { symbol: string; chain: string; chainName: string; size?: number }) {
  const logo = TOKEN_LOGOS[symbol.toUpperCase()];
  const badge = CHAIN_LOGOS[chain];
  return (
    <span className="tmark" style={{ ["--tm" as string]: `${size}px` }} aria-hidden="true">
      {logo ? <img className="tmark-img" src={logo} alt="" width={size} height={size} loading="lazy" /> : <Mono className="tmark-mono" text={symbol} />}
      {badge ? <img className="tmark-badge" src={badge} alt="" width={14} height={14} loading="lazy" /> : <Mono className="tmark-badge tmark-badge-mono" text={chainName} />}
    </span>
  );
}
