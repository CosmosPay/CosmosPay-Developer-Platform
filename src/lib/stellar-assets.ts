/* Well-known Stellar assets, per network, for the dashboard's asset pickers.
   Every form that asks for an asset + issuer offers these as a dropdown plus a
   "Custom…" escape hatch (and, where the asset is optional, an "Any" option).

   THE CANONICAL LIST IS `GET /v1/assets` on the Payments service, mirrored
   unauthenticated at `/api/assets`. This table is the synchronous copy the
   pickers render before any fetch resolves, and it is deliberately short: the
   fewer rows here, the less there is to drift.

   Every issuer below is verified against live Horizon — the pair exists, and the
   account's `home_domain` is the organization named. That check is not
   ceremonial. The mainnet USDC issuer in this file was for some time
   `GA5ZSEJYB37JRC5AVCIA5MOP4RHTR6F3DSZL5A3W4G4M4N4A5U4QY3T6`, which shares
   Circle's first 28 characters, is exactly 56 characters long, and is not a valid
   Stellar address at all — Horizon answers `400 invalid_field` for it. It looked
   right in a diff, it type-checked, and every mainnet form offering "USDC" built
   an asset nobody could hold. Paste an issuer, then resolve it before committing. */
export type StellarNetwork = "public" | "testnet";

export interface StandardAsset {
  /** Stable option key (also used as the native/custom/any sentinels). */
  key: string;
  /** Display label in the dropdown. */
  label: string;
  code: string;
  /** null for native XLM. */
  issuer: string | null;
  /** Who issues it — `Circle`, `Tether`. Shown next to the code, because the
   *  code alone does not identify an asset: mainnet carries two legitimate
   *  `EURC`s from different issuers, and twenty impostor `USDC`s. */
  issuerName: string;
}

/** Sentinel option keys (kept distinct from any real asset code). */
export const CUSTOM_KEY = "__custom__";
export const ANY_KEY = "__any__";

const NATIVE: StandardAsset = {
  key: "native",
  label: "XLM",
  code: "XLM",
  issuer: null,
  issuerName: "Stellar network",
};

const ASSETS: Record<StellarNetwork, StandardAsset[]> = {
  public: [
    NATIVE,
    {
      // 2,390,585 trustlines, home_domain circle.com.
      key: "USDC",
      label: "USDC",
      code: "USDC",
      issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      issuerName: "Circle",
    },
    {
      // Tether's omnichain USDT0. 12,212 trustlines against 8 code-squatters,
      // none of which clears 300. The issuing account publishes no home_domain,
      // so its SAC id (CBSJZEIO…26YF) is what identifies it.
      key: "USDT0",
      label: "USDT0",
      code: "USDT0",
      issuer: "GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q",
      issuerName: "Tether",
    },
    {
      // 34,568 trustlines, home_domain circle.com. Note that MyKobo issues a
      // second, equally legitimate EURC — hence the issuer name on the option.
      key: "EURC",
      label: "EURC",
      code: "EURC",
      issuer: "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2",
      issuerName: "Circle",
    },
  ],
  testnet: [
    NATIVE,
    {
      // 64,325 trustlines, home_domain centre.io. Circle's testnet faucet asset.
      key: "USDC",
      label: "USDC",
      code: "USDC",
      issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      issuerName: "Circle",
    },
    {
      // BlindPay's test stablecoin — the one this platform's fiat rails settle in.
      key: "USDB",
      label: "USDB",
      code: "USDB",
      issuer: "GCQSSIMOW5OCGULZATDXKU5MOJBOMFX6G65X6CXZDQ7AIB3SKFUZ67NX",
      issuerName: "BlindPay",
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
