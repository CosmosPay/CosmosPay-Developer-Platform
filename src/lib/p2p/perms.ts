/* perms.ts: what a merchant lets one of its bots do on the P2P market contract
   (`setOperator(operator, perms)`), a bitmask the contract defines. The dashboard shows it as
   checkboxes; this turns one into the other. Pure; tests/unit/p2pPerms.test.ts. */

/** The contract's permission bits, in the order the screens list them. */
export const OPERATOR_PERMS = {
  open: 1, //     PERM_OPEN: open orders on the merchant's balance
  release: 2, //  PERM_RELEASE: release the merchant's orders (pay their buyer)
  trade: 4, //    PERM_TRADE: accept, mark paid, cancel and dispute for the merchant
  withdraw: 8, // PERM_WITHDRAW: withdraw to the merchant (never anywhere else)
} as const;

export type OperatorPerm = keyof typeof OPERATOR_PERMS;
export const OPERATOR_PERM_KEYS = Object.keys(OPERATOR_PERMS) as OperatorPerm[];
const ALL = OPERATOR_PERM_KEYS.reduce((n, k) => n | OPERATOR_PERMS[k], 0);

/** The bitmask for a set of permissions. */
export function permsToMask(perms: Iterable<OperatorPerm>): number {
  let mask = 0;
  for (const p of perms) if (Object.hasOwn(OPERATOR_PERMS, p)) mask |= OPERATOR_PERMS[p];
  return mask;
}

/** The permissions a bitmask grants (bits the contract does not define are ignored). */
export function maskToPerms(mask: number): OperatorPerm[] {
  const m = Number.isInteger(mask) && mask > 0 ? mask & ALL : 0;
  return OPERATOR_PERM_KEYS.filter((k) => (m & OPERATOR_PERMS[k]) !== 0);
}

/** Whether `mask` is one the contract accepts: only its bits (0 revokes the operator). */
export function isValidMask(mask: number): boolean {
  return Number.isInteger(mask) && mask >= 0 && (mask & ~ALL) === 0;
}
