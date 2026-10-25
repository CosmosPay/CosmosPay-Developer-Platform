/* TokenPicker: the swap form's "select a token" sheet. Every token the catalogue offers, on
   every network: a search over symbol, network, issuer and address, a network filter, and one
   row per token (its mark, symbol, network, issuer or address, and the listed price). Arrow keys
   move between rows. A pasted token address on Stellar (CODE:ISSUER), Solana (mint) or Monad
   (contract) becomes a token of that chain's market. */
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Modal } from "@/components/cosmos/shared";
import { useT, useLang, fmt } from "@/lib/i18n/index";
import { DI } from "@/components/cosmos/dashboard/icons";
import { Select } from "@/components/cosmos/dashboard/components/Select";
import { TokenMark } from "@/components/cosmos/dashboard/components/TokenMark";
import { sortTokens, tokenMatches, DEX_CHAINS, type SwapToken } from "@/lib/swap-catalog";
import { ADDRESS_PATTERNS, CHAIN_NAMES } from "@/lib/chains";

const short = (a: string) => (a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
const MAX_ROWS = 250;

/* A token address someone pasted, on a chain whose market takes any token. */
function pastedToken(query: string, dexLive: (chain: string) => boolean): SwapToken | null {
  const q = query.trim();
  const stellar = q.match(/^([A-Za-z0-9]{1,12}):(G[A-Z2-7]{55})$/);
  if (stellar && dexLive("stellar")) {
    return { key: `stellar:${stellar[1]}:${stellar[2]}`, chain: "stellar", chainName: CHAIN_NAMES.stellar, symbol: stellar[1].toUpperCase(), contract: stellar[2], issuerName: null, decimals: 7, priceUsd: null, near: null, dex: true };
  }
  for (const chain of ["solana", "monad"] as const) {
    if (ADDRESS_PATTERNS[chain].test(q) && dexLive(chain)) {
      return { key: `${chain}:${q}:${q}`, chain, chainName: CHAIN_NAMES[chain], symbol: short(q), contract: q, issuerName: null, decimals: null, priceUsd: null, near: null, dex: true };
    }
  }
  return null;
}

export function TokenPicker({ tokens, selectedKey, onPick, onClose, title, dexLive }: {
  tokens: SwapToken[];
  selectedKey: string | null;
  onPick: (token: SwapToken) => void;
  onClose: () => void;
  title: string;
  /* Whether a chain's own market runs in this environment (custom tokens trade there). */
  dexLive: (chain: string) => boolean;
}) {
  const t = useT();
  const lang = useLang();
  const tp = t.dash.swaps.picker;
  const [query, setQuery] = useState("");
  const [network, setNetwork] = useState("all");
  const list = useRef<HTMLUListElement>(null);
  const price = new Intl.NumberFormat(lang, { style: "currency", currency: "USD", maximumSignificantDigits: 4 });

  // Networks with how many tokens each lists: ours first, then by name.
  const networks = useMemo(() => {
    const seen = new Map<string, { name: string; n: number }>();
    for (const tk of tokens) seen.set(tk.chain, { name: tk.chainName, n: (seen.get(tk.chain)?.n ?? 0) + 1 });
    return [...seen.entries()].sort(([a, x], [b, y]) => {
      const ra = DEX_CHAINS.indexOf(a as never), rb = DEX_CHAINS.indexOf(b as never);
      return (ra < 0 ? 9 : ra) - (rb < 0 ? 9 : rb) || x.name.localeCompare(y.name);
    });
  }, [tokens]);
  const shown = useMemo(
    () => sortTokens(tokens.filter((tk) => (network === "all" || tk.chain === network) && tokenMatches(tk, query))),
    [tokens, network, query],
  );
  const pasted = shown.length ? null : pastedToken(query, dexLive);

  // Arrow keys move between rows; Home and End jump to the ends.
  const onKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const rows = [...(list.current?.querySelectorAll<HTMLButtonElement>("button.tpick-row") ?? [])];
    const at = rows.indexOf(document.activeElement as HTMLButtonElement);
    const go = (i: number) => { e.preventDefault(); rows[Math.max(0, Math.min(rows.length - 1, i))]?.focus(); };
    if (e.key === "ArrowDown") go(at + 1);
    else if (e.key === "ArrowUp") go(at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(rows.length - 1);
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-body tpick">
        <h3>{title}</h3>
        <div className="tpick-tools">
          <div className="fbar-search">
            {DI.search}
            <input type="search" className="field" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tp.search} aria-label={tp.search} />
          </div>
          <Select
            variant="filter" className="tpick-net" label={tp.network} placeholder={tp.allNetworks} active={network !== "all"}
            value={network} onChange={setNetwork}
            options={[{ value: "all", label: tp.allNetworks, count: tokens.length }, ...networks.map(([id, x]) => ({ value: id, label: x.name, count: x.n }))]}
          />
        </div>
        <p className="tpick-count" role="status" aria-live="polite">{fmt(tp.count, { n: shown.length })}</p>
        <ul className="tpick-list" ref={list} role="list" onKeyDown={onKey}>
          {shown.slice(0, MAX_ROWS).map((tk, i, rows) => [
            // Across every network, each one's tokens sit under its name.
            network === "all" && (i === 0 || rows[i - 1].chain !== tk.chain) ? <li key={`h-${tk.chain}`} className="tpick-group" role="presentation">{tk.chainName}</li> : null,
            <li key={tk.key}>
              <button type="button" className={`tpick-row${tk.key === selectedKey ? " on" : ""}`} aria-pressed={tk.key === selectedKey} onClick={() => onPick(tk)}>
                <TokenMark symbol={tk.symbol} chain={tk.chain} chainName={tk.chainName} size={34} />
                <span className="tpick-main">
                  <b>{tk.symbol}</b>
                  <span>{tk.chainName}{tk.issuerName ? ` · ${tk.issuerName}` : tk.contract ? ` · ${short(tk.contract)}` : ""}</span>
                </span>
                {tk.priceUsd ? <span className="tpick-price">{price.format(tk.priceUsd)}</span> : null}
              </button>
            </li>,
          ])}
          {pasted && (
            <li>
              <button type="button" className="tpick-row" onClick={() => onPick(pasted)}>
                <TokenMark symbol={pasted.symbol} chain={pasted.chain} chainName={pasted.chainName} size={34} />
                <span className="tpick-main"><b>{fmt(tp.useToken, { token: pasted.symbol })}</b><span>{pasted.chainName} · {short(pasted.contract || "")}</span></span>
              </button>
            </li>
          )}
          {!shown.length && !pasted && <li className="tpick-empty">{tp.none}</li>}
        </ul>
        {shown.length > MAX_ROWS && <p className="tpick-count">{fmt(tp.more, { n: shown.length - MAX_ROWS })}</p>}
      </div>
    </Modal>
  );
}
