/* deposit-limits.ts: the limits a merchant may set on payments from another network for one
   payment link, and the account a merchant fee on a deposit network is credited to.

   Both mirror the Payments API, which has the last word:
   - `depositLimits` (its DepositLimitsDto): how many deposit addresses one payer (one client
     address) may have open on the link, and how many new ones the link takes every five minutes
     from all payers. The defaults are the API's own (PAYMENT_DEPOSIT_MAX_OPEN_PER_CLIENT,
     PAYMENT_DEPOSIT_LINK_BUDGET); a merchant may only raise them, up to the ceilings it fixes
     (PAYMENT_DEPOSIT_MAX_OPEN_PER_CLIENT_CEILING, PAYMENT_DEPOSIT_LINK_BUDGET_CEILING).
   - A merchant fee on a network paid through a deposit address rides as the cross-chain route's
     own app fee, credited inside the route to one account: a NEAR account id, or an EVM address
     (stored lowercase). It is never sent to an address on the link's network.

   Pure, shared by the create schema, the create route and the form. */
import { NETWORK_ADDRESS_RULES, NETWORK_IDS, isChain, isDepositNetwork, type NetworkId } from "@/lib/chains";

/** Open deposit addresses one payer may have on a link: the API's default, and its ceiling. */
export const DEPOSIT_LIMIT_PER_PAYER = { min: 2, max: 10 } as const;
/** New deposit addresses a link takes per window from all payers: the default, and the ceiling. */
export const DEPOSIT_LIMIT_PER_WINDOW = { min: 20, max: 200 } as const;
/** The window the second limit counts in, in minutes (PAYMENT_DEPOSIT_LINK_WINDOW_MS). */
export const DEPOSIT_LIMIT_WINDOW_MINUTES = 5;

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/* The networks whose accounts are EVM addresses: the same key holds the same address on each. */
export const EVM_NETWORK_IDS: readonly NetworkId[] = NETWORK_IDS.filter(
  (id) => NETWORK_ADDRESS_RULES[id].hex && NETWORK_ADDRESS_RULES[id].test("0x0000000000000000000000000000000000000000"),
);

/** The spelling the route credits a fee to: an EVM address lowercase, a NEAR account as it is. */
export function routeFeeAccount(wallet: string): string {
  const w = wallet.trim();
  return EVM_ADDRESS.test(w) ? w.toLowerCase() : w;
}

/** Whether `wallet` can receive a merchant fee inside the cross-chain route. */
export function isRouteFeeAccount(wallet: string): boolean {
  return NETWORK_ADDRESS_RULES.near.test(routeFeeAccount(wallet));
}

/** Whether an organization wallet on `chain` can take a merchant fee on a deposit network. */
export function isRouteFeeWallet(chain: string, address: string): boolean {
  if (chain === "near") return NETWORK_ADDRESS_RULES.near.test(address.trim());
  return (EVM_NETWORK_IDS as readonly string[]).includes(chain) && EVM_ADDRESS.test(address.trim());
}

/**
 * Whether a link takes payments from another network, so its deposit limits matter: every link on
 * a network paid through a deposit address, and a mainnet link on Stellar, Solana or Monad without
 * a merchant fee (the API also refuses a Monad link it recognises by amount; that is its call).
 */
export function takesDeposits(chain: string, mainnet: boolean, merchantFee: boolean): boolean {
  if (isDepositNetwork(chain)) return true;
  return isChain(chain) && mainnet && !merchantFee;
}
