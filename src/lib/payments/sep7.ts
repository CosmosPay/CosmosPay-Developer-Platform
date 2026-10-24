/* sep7.ts — the SEP-7 `pay` reader behind /pay. The wallet re-parses the URI and the payer
   confirms everything in its approval window before anything is signed, but this page shows
   the request first, so what it SHOWS must be what the wallet will read:

   - nothing partial: the asset's issuer is part of the asset (anyone can issue a "USDC"), the
     network decides whether real money moves, and a callback or an origin domain changes
     where the result goes and who claims to ask;
   - nothing ambiguous: a key given twice, in another case, or unknown to SEP-7 could be read
     one way here and another way by a wallet, so the URI is refused rather than guessed.

   The URI is handed to the wallet as received (its `signature` covers that exact string),
   which is safe because a URI this reader accepts has one meaning. */

export interface Sep7Pay {
  destination: string;
  amount: string;
  memo: string;
  /** "XLM" for the native coin. */
  asset: string;
  /** Required for any asset but XLM. */
  assetIssuer: string | null;
  /** From `network_passphrase`; Stellar's public network when absent. */
  network: "public" | "testnet";
  /** Host the wallet would POST the signed result to (`callback=url:…`), or null. */
  callbackHost: string | null;
  /** `origin_domain` as the URI states it. Unverified here: the wallet checks its signature. */
  originDomain: string | null;
}

/** Every parameter SEP-7 defines for `pay`, exactly as spelled there. */
const PAY_KEYS = new Set([
  "destination", "amount", "asset_code", "asset_issuer", "memo", "memo_type",
  "callback", "msg", "network_passphrase", "origin_domain", "signature",
]);
const MEMO_TYPES = new Set(["MEMO_TEXT", "MEMO_ID", "MEMO_HASH", "MEMO_RETURN"]);
const PASSPHRASES: Record<string, Sep7Pay["network"]> = {
  "Public Global Stellar Network ; September 2015": "public",
  "Test SDF Network ; September 2015": "testnet",
};

/** A Stellar account id: G + 55 base32 characters. */
const STELLAR_ACCOUNT = /^G[A-Z2-7]{55}$/;
/** A Stellar asset code: 1–12 alphanumerics. */
const ASSET_CODE = /^[A-Za-z0-9]{1,12}$/;
/** A bare domain name, as origin_domain must be. */
const DOMAIN = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export function parseSep7Pay(raw: string): Sep7Pay | null {
  if (!/^web\+stellar:/i.test(raw)) return null;
  const rest = raw.slice("web+stellar:".length);
  const q = rest.indexOf("?");
  if ((q === -1 ? rest : rest.slice(0, q)).toLowerCase() !== "pay") return null;
  const p = new URLSearchParams(q === -1 ? "" : rest.slice(q + 1));

  const seen = new Set<string>();
  for (const key of p.keys()) {
    if (!PAY_KEYS.has(key) || seen.has(key)) return null;
    seen.add(key);
  }

  const destination = (p.get("destination") || "").trim();
  if (!STELLAR_ACCOUNT.test(destination)) return null;

  const code = (p.get("asset_code") || "").trim();
  const issuer = (p.get("asset_issuer") || "").trim();
  const native = !code || (code.toUpperCase() === "XLM" && !issuer);
  if (!native && (!ASSET_CODE.test(code) || !STELLAR_ACCOUNT.test(issuer))) return null;

  const memoType = p.get("memo_type");
  if (memoType !== null && !MEMO_TYPES.has(memoType)) return null;

  const passphrase = p.get("network_passphrase");
  const network = passphrase === null ? "public" : PASSPHRASES[passphrase];
  if (!network) return null;

  let callbackHost: string | null = null;
  const callback = p.get("callback");
  if (callback) {
    if (!callback.startsWith("url:")) return null;
    try {
      callbackHost = new URL(callback.slice(4)).host;
    } catch {
      return null;
    }
  }

  const origin = (p.get("origin_domain") || "").trim();
  if (origin && !DOMAIN.test(origin)) return null;

  return {
    destination,
    amount: p.get("amount") || "",
    memo: p.get("memo") || "",
    asset: native ? "XLM" : code,
    assetIssuer: native ? null : issuer,
    network,
    callbackHost,
    originDomain: origin || null,
  };
}
