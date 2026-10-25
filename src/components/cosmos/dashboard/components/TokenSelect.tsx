/* TokenSelect: the asset picker on Solana and Monad. The chain's coin, the tokens we can vouch
   for on this network (TOKEN_PRESETS in src/lib/chains.ts, each named with its address), or
   another token by its ticker and its SPL mint / ERC-20 contract. Stellar keeps AssetSelect,
   whose assets are codes with issuers. `code` and `issuer` stay the parent's: the coin is an
   empty code and issuer. */
import { useId, useState } from "react";
import { useT } from "@/lib/i18n/index";
import { Field } from "@/components/cosmos/dashboard/components/Field";
import { Select } from "@/components/cosmos/dashboard/components/Select";
import { NATIVE_CODES, TOKEN_PRESETS, ADDRESS_PLACEHOLDERS, type Chain, type Tier } from "@/lib/chains";

const NATIVE = "native";
const CUSTOM = "custom";
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

export function TokenSelect({ chain, tier, label, code, issuer, onChange, withTicker = true }: {
  chain: Exclude<Chain, "stellar">;
  tier: Tier;
  label: string;
  code: string;
  issuer: string;
  onChange: (next: { code: string; issuer: string }) => void;
  /* A payment link names a token by its ticker too; a swap only needs the address. */
  withTicker?: boolean;
}) {
  const t = useT();
  const tk = t.dash.tokens;
  const id = useId();
  const presets = TOKEN_PRESETS[chain][tier];
  const [sel, setSel] = useState(() => {
    if (!issuer) return NATIVE;
    const preset = presets.find((p) => p.issuer.toLowerCase() === issuer.toLowerCase());
    return preset ? `preset:${preset.issuer}` : CUSTOM;
  });

  const pick = (key: string) => {
    setSel(key);
    if (key === NATIVE) onChange({ code: "", issuer: "" });
    else if (key === CUSTOM) onChange({ code: "", issuer: "" });
    else {
      const preset = presets.find((p) => `preset:${p.issuer}` === key);
      if (preset) onChange({ code: preset.code, issuer: preset.issuer });
    }
  };

  return (
    <>
      <div className="fld">
        <span className="field-l" id={`${id}-l`}>{label}</span>
        <Select
          value={sel}
          onChange={pick}
          labelledBy={`${id}-l`}
          options={[
            { value: NATIVE, label: NATIVE_CODES[chain] },
            ...presets.map((p) => ({ value: `preset:${p.issuer}`, label: p.code, hint: short(p.issuer) })),
            { value: CUSTOM, label: tk.custom },
          ]}
        />
      </div>
      {sel === CUSTOM && !withTicker && (
        <Field label={tk.address[chain]} hint={tk.addressHint[chain]} value={issuer} onChange={(e) => onChange({ code, issuer: e.target.value })} placeholder={ADDRESS_PLACEHOLDERS[chain]} />
      )}
      {sel === CUSTOM && withTicker && (
        <div className="field-row">
          <Field label={tk.ticker} hint={tk.tickerHint} value={code} onChange={(e) => onChange({ code: e.target.value, issuer })} placeholder="USDC" />
          <Field label={tk.address[chain]} hint={tk.addressHint[chain]} value={issuer} onChange={(e) => onChange({ code, issuer: e.target.value })} placeholder={ADDRESS_PLACEHOLDERS[chain]} />
        </div>
      )}
    </>
  );
}
