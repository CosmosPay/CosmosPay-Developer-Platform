/* Curated list of well-known Stellar assets, per network, for the dashboard's
   asset pickers. Every form that asks for an asset + issuer offers these as a
   dropdown plus a "Custom…" escape hatch (and, where the asset is optional, an
   "Any" option). Issuers are the official Circle deployments, verified against
   Circle/Stellar docs. Extend these arrays to surface more standard assets —
   the UI needs no other change. */
export type StellarNetwork = "public" | "testnet";

export interface StandardAsset {
  /** Stable option key (also used as the native/custom/any sentinels). */
  key: string;
  /** Display label in the dropdown. */
  label: string;
  code: string;
  /** null for native XLM. */
  issuer: string | null;
}

/** Sentinel option keys (kept distinct from any real asset code). */
export const CUSTOM_KEY = "__custom__";
export const ANY_KEY = "__any__";

const NATIVE: StandardAsset = {
  key: "native",
  label: "XLM",
  code: "XLM",
  issuer: null,
};

const ASSETS: Record<StellarNetwork, StandardAsset[]> = {
  public: [
    NATIVE,
    {
      key: "USDC",
      label: "USDC",
      code: "USDC",
      issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTR6F3DSZL5A3W4G4M4N4A5U4QY3T6",
    },
  ],
  testnet: [
    NATIVE,
    {
      key: "USDC",
      label: "USDC",
      code: "USDC",
      issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    },
  ],
};

/** The standard assets available on a network (defaults to testnet). */
export function standardAssets(network: StellarNetwork): StandardAsset[] {
  return ASSETS[network] ?? ASSETS.testnet;
}

const isNativeCode = (code: string): boolean => {
  const c = (code || "").trim().toLowerCase();
  return c === "xlm" || c === "native";
};

/** Whether a (non-empty, non-native) asset code still needs an issuer. */
export function needsIssuer(code: string): boolean {
  const c = (code || "").trim();
  return !!c && !isNativeCode(c);
}

/**
 * The standard asset matching (code, issuer), or null when it is custom. Native
 * matches XLM/native regardless of issuer; an issued code matches when the code
 * lines up and the issuer is either empty (the UI fills it in) or identical.
 */
export function matchStandard(
  assets: StandardAsset[],
  code: string,
  issuer: string,
): StandardAsset | null {
  const c = (code || "").trim();
  if (!c) return null;
  if (isNativeCode(c)) return assets.find((a) => a.issuer === null) ?? null;
  const iss = (issuer || "").trim();
  return (
    assets.find(
      (a) =>
        a.issuer !== null &&
        a.code.toLowerCase() === c.toLowerCase() &&
        (iss === "" || iss === a.issuer),
    ) ?? null
  );
}
