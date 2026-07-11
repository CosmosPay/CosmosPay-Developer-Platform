import { useId, useMemo, useState, useEffect } from "react";
import { Field } from "./Field";
import {
  standardAssets,
  matchStandard,
  needsIssuer as assetNeedsIssuer,
  CUSTOM_KEY,
  ANY_KEY,
  type StellarNetwork,
} from "@/lib/stellar-assets";

/**
 * Asset picker used everywhere a form asks for an asset code + issuer. It offers
 * the network's standard assets (XLM, USDC, …), an optional "Any" (when the
 * asset is a filter), and a "Custom…" option that reveals free-text code +
 * issuer inputs. `code`/`issuer` stay owned by the parent; picking a standard
 * asset fills both in (and hides the issuer input, since it is known).
 */
export function AssetSelect({
  network,
  label,
  codeLabel,
  issuerLabel,
  hint,
  issuerHint,
  code,
  issuer,
  onCode,
  onIssuer,
  customText,
  anyText,
  allowAny = false,
  codePlaceholder = "USDC",
}: {
  network: StellarNetwork;
  label: string;
  codeLabel: string;
  issuerLabel: string;
  hint?: string;
  issuerHint?: string;
  code: string;
  issuer: string;
  onCode: (v: string) => void;
  onIssuer: (v: string) => void;
  customText: string;
  anyText?: string;
  allowAny?: boolean;
  codePlaceholder?: string;
}) {
  const id = useId();
  const assets = useMemo(() => standardAssets(network), [network]);

  const initial = () => {
    const matched = matchStandard(assets, code, issuer);
    if (matched) return matched.key;
    if (allowAny && !(code || "").trim()) return ANY_KEY;
    return CUSTOM_KEY;
  };
  const [sel, setSel] = useState<string>(initial);
  const isCustom = sel === CUSTOM_KEY;

  // Keep the parent's code/issuer aligned to the picked standard asset — also on
  // mount, so a listed default like "USDC" fills in its issuer automatically.
  useEffect(() => {
    if (sel === CUSTOM_KEY || sel === ANY_KEY) return;
    const a = assets.find((x) => x.key === sel);
    if (!a) return;
    if (code !== a.code) onCode(a.code);
    if ((issuer || "") !== (a.issuer || "")) onIssuer(a.issuer || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, network]);

  const pick = (key: string) => {
    setSel(key);
    if (key === ANY_KEY) {
      onCode("");
      onIssuer("");
      return;
    }
    if (key === CUSTOM_KEY) return; // keep current inputs for editing
    const a = assets.find((x) => x.key === key);
    if (a) {
      onCode(a.code);
      onIssuer(a.issuer || "");
    }
  };

  const showIssuer = isCustom && assetNeedsIssuer(code);

  return (
    <>
      <div className="fld">
        <label className="field-l" htmlFor={id}>
          {label}
        </label>
        <select
          id={id}
          className="field"
          value={sel}
          onChange={(e) => pick(e.target.value)}
        >
          {allowAny && <option value={ANY_KEY}>{anyText}</option>}
          {assets.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
          <option value={CUSTOM_KEY}>{customText}</option>
        </select>
      </div>
      {isCustom && (
        <Field
          label={codeLabel}
          hint={hint}
          value={code}
          onChange={(e) => onCode(e.target.value)}
          placeholder={codePlaceholder}
        />
      )}
      {showIssuer && (
        <Field
          label={issuerLabel}
          hint={issuerHint}
          value={issuer}
          onChange={(e) => onIssuer(e.target.value)}
          placeholder="G…"
        />
      )}
    </>
  );
}
