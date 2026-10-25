/* Signing a Stellar transaction with Freighter, the Stellar Development Foundation's browser
   wallet, from the dashboard. The page never sees a key: Freighter shows the transaction, the
   person approves it there, and only the signed envelope comes back. The package is loaded on
   the first click, so the dashboard does not carry it until someone signs. */

export type StellarNetwork = "testnet" | "public";

export const NETWORK_PASSPHRASE: Record<StellarNetwork, string> = {
  testnet: "Test SDF Network ; September 2015",
  public: "Public Global Stellar Network ; September 2015",
};

export type FreighterOutcome =
  | { ok: true; signedXdr: string; signer: string }
  | { ok: false; reason: "missing" | "declined" | "wrongAccount" | "wrongNetwork"; account?: string };

/* How long the extension has to answer before the page treats it as absent. */
const DETECT_TIMEOUT_MS = 2500;

const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);

/**
 * Asks Freighter to sign `xdr` for `network`. When `signer` is given (the transaction's source),
 * an account mismatch is reported before Freighter is asked, since its signature would not count.
 */
export async function signWithFreighter(xdr: string, network: StellarNetwork, signer?: string): Promise<FreighterOutcome> {
  const api = await import("@stellar/freighter-api");
  const connected = await withTimeout(api.isConnected().catch(() => ({ isConnected: false })), DETECT_TIMEOUT_MS, { isConnected: false });
  if (!connected.isConnected) return { ok: false, reason: "missing" };

  const access = await api.requestAccess().catch(() => ({ address: "", error: { message: "" } }));
  if (access.error || !access.address) return { ok: false, reason: "declined" };
  if (signer && access.address !== signer) return { ok: false, reason: "wrongAccount", account: access.address };

  const details = await api.getNetworkDetails().catch(() => null);
  const passphrase = NETWORK_PASSPHRASE[network];
  // Freighter refuses a transaction for another network than its own; say which one to pick.
  if (details && !details.error && details.networkPassphrase && details.networkPassphrase !== passphrase) {
    return { ok: false, reason: "wrongNetwork" };
  }

  const res = await api.signTransaction(xdr, { networkPassphrase: passphrase, address: signer }).catch(() => null);
  if (!res || res.error || !res.signedTxXdr) return { ok: false, reason: "declined" };
  return { ok: true, signedXdr: res.signedTxXdr, signer: res.signerAddress };
}
