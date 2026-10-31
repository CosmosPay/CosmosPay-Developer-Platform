/* Freighter as the confidential-token SDK's signer: it signs every Soroban transaction the SDK
   builds and the SEP-53 message the confidential key is derived from. The page never holds the
   Stellar key; Freighter shows each request and the person approves it there. */
import type { Signer } from "stellar-confidential-token-sdk";

/** A signer that can also sign a UTF-8 message (SEP-53) and return the raw signature. */
export interface MessageSigner extends Signer {
  signMessage(message: string): Promise<Uint8Array>;
}

export type FreighterProblem = "missing" | "declined" | "wrongNetwork";

export class FreighterError extends Error {
  constructor(readonly problem: FreighterProblem, message: string) {
    super(message);
  }
}

const DETECT_TIMEOUT_MS = 2500;
const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);

const errText = (e: unknown): string =>
  typeof e === "string" ? e : e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Freighter refused the request";

/** Freighter 4+ returns the signature as base64; older versions a structured-cloned Buffer. */
function signatureBytes(signed: unknown): Uint8Array {
  if (typeof signed === "string") return Uint8Array.from(atob(signed), (c) => c.charCodeAt(0));
  if (signed instanceof Uint8Array) return new Uint8Array(signed);
  if (signed && typeof signed === "object" && Array.isArray((signed as { data?: unknown }).data)) {
    return Uint8Array.from((signed as { data: number[] }).data);
  }
  throw new FreighterError("declined", "Freighter returned no usable message signature");
}

/** Connect Freighter on `networkPassphrase` and wrap it as a {@link MessageSigner}. */
export async function connectFreighter(networkPassphrase: string): Promise<MessageSigner> {
  const api = await import("@stellar/freighter-api");
  const conn = await withTimeout(api.isConnected().catch(() => ({ isConnected: false })), DETECT_TIMEOUT_MS, { isConnected: false });
  if (!conn.isConnected) throw new FreighterError("missing", "Freighter is not installed or not answering");
  const access = await api.requestAccess();
  if (access.error || !access.address) throw new FreighterError("declined", errText(access.error));
  const details = await api.getNetworkDetails().catch(() => null);
  if (details && !details.error && details.networkPassphrase && details.networkPassphrase !== networkPassphrase) {
    throw new FreighterError("wrongNetwork", "Freighter is on another network");
  }
  const address = access.address;
  return {
    publicKey: address,
    async sign(txXdrBase64: string): Promise<string> {
      const res = await api.signTransaction(txXdrBase64, { networkPassphrase, address });
      if (res.error || !res.signedTxXdr) throw new FreighterError("declined", errText(res.error));
      return res.signedTxXdr;
    },
    async signMessage(message: string): Promise<Uint8Array> {
      const res = await api.signMessage(message, { networkPassphrase, address });
      if (res.error) throw new FreighterError("declined", errText(res.error));
      if (res.signerAddress && res.signerAddress !== address) {
        throw new FreighterError("declined", `Freighter signed with ${res.signerAddress}, not ${address}`);
      }
      return signatureBytes(res.signedMessage);
    },
  };
}
