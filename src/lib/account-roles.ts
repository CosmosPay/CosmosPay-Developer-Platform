/* account-roles.ts — account role hierarchy, shared by server + client (no imports).
   Higher index = more privilege. Used to enforce: you can only assign roles strictly
   below your own, you can't change your own role, and you can't modify peers/superiors. */
export const ACCOUNT_ROLES = ["user", "support", "admin", "owner"] as const;
export type AccountRoleName = (typeof ACCOUNT_ROLES)[number];

export function roleLevel(role: string | null | undefined): number {
  const i = ACCOUNT_ROLES.indexOf((role || "user") as AccountRoleName);
  return i < 0 ? 0 : i;
}
