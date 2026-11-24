/* The Wallet Standard's discovery, for the wallets that prove a Sui, Aptos or Movement address
   (src/lib/wallets/prove-networks.ts). A wallet registers itself by dispatching
   `wallet-standard:register-wallet`; the page announces itself with `wallet-standard:app-ready`
   so wallets that loaded first register too. The same protocol as `@wallet-standard/app`, without
   the dependency (the SDK's `@cosmosapp/pay_sdk/wallets` keeps its own for Solana). Browser-only;
   nothing is asked of a wallet here, only listed. */

export interface StandardAccount {
  address: string;
  publicKey: Uint8Array;
  chains?: readonly string[];
}

export interface StandardWallet {
  name: string;
  icon?: string;
  chains?: readonly string[];
  accounts?: readonly StandardAccount[];
  features: Record<string, Record<string, unknown> | undefined>;
}

const found = new Set<StandardWallet>();
let listening = false;

function listen(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  const api = { register: (...wallets: StandardWallet[]) => { for (const w of wallets) found.add(w); return () => { for (const w of wallets) found.delete(w); }; } };
  window.addEventListener("wallet-standard:register-wallet", (event) => {
    const callback = (event as CustomEvent<(api: unknown) => void>).detail;
    try {
      callback(api);
    } catch {
      /* a wallet that fails to register is not listed */
    }
  });
  try {
    window.dispatchEvent(new CustomEvent("wallet-standard:app-ready", { detail: api }));
  } catch {
    /* no wallet listens */
  }
}

/** The wallets registered in this browser that offer every one of `features`. */
export function standardWallets(features: string[]): StandardWallet[] {
  listen();
  return [...found].filter((w) => features.every((f) => !!w.features?.[f]));
}
