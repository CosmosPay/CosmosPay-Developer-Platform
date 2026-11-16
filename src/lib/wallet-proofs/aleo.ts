/* Aleo: the wallet's `signMessage` (Leo, Puzzle, Shield, Fox: the Aleo wallet adapter) signs the
   message's UTF-8 bytes with the account's private key and answers an Aleo signature
   (`sign1...`, as text or as its UTF-8 bytes). An Aleo signature verifies against the address
   itself, so no chain read is needed. The curve and hashes are snarkVM's, run through its own WASM
   build (`@provablehq/wasm`, mainnet), loaded on the first Aleo proof only: it is large, and no
   other request needs it. Node loads its CommonJS build, which reads the WASM file from disk (the
   ES module build fetches it by URL, which Node cannot do for a file). Server-only. */
import { createRequire } from "node:module";
import { str } from "@/lib/wallet-proofs/bytes";

interface AleoWasm {
  Address: { from_string(address: string): unknown };
  Signature: { from_string(signature: string): { verify(address: unknown, message: Uint8Array): boolean } };
}

let wasm: AleoWasm | null = null;
function aleo(): AleoWasm {
  if (!wasm) wasm = createRequire(import.meta.url)("@provablehq/wasm/mainnet.js") as AleoWasm;
  return wasm;
}

/** The signature text from what a wallet answered: `sign1...`, or its UTF-8 bytes as hex or a byte array. */
export function readAleoSignature(value: unknown): string | null {
  const text = str(value);
  if (text && /^sign1[02-9ac-hj-np-z]{20,400}$/.test(text)) return text;
  if (Array.isArray(value) && value.length <= 512 && value.every((b) => Number.isInteger(b) && b >= 0 && b < 256)) {
    return readAleoSignature(new TextDecoder().decode(Uint8Array.from(value as number[])));
  }
  return null;
}

export function verifyAleo(address: string, message: string, signature: string): boolean {
  if (!/^aleo1[02-9ac-hj-np-z]{58}$/.test(address.trim())) return false;
  try {
    const { Address, Signature } = aleo();
    return Signature.from_string(signature).verify(Address.from_string(address.trim()), new TextEncoder().encode(message)) === true;
  } catch {
    return false;
  }
}
