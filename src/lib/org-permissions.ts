/* org-permissions.ts — per-action permissions for organization collaborators.
   Pure data (no server-only imports) so it's shared by the API and the React islands.

   Roles: owner / admin / member. Owners and admins implicitly have EVERY permission.
   "member" collaborators get exactly the actions granted to them, per resource and per
   action (create / edit / delete), e.g. "webhooks:create" or "apiKeysLive:delete". */
export const ORG_RESOURCES = ["apiKeysTest", "apiKeysLive", "webhooks", "products", "customers", "payments"] as const;
export const ORG_ACTIONS = ["create", "edit", "delete"] as const;

export type OrgResource = (typeof ORG_RESOURCES)[number];
export type OrgAction = (typeof ORG_ACTIONS)[number];
export type OrgPermission = `${OrgResource}:${OrgAction}`;

export function permKey(resource: OrgResource, action: OrgAction): OrgPermission {
  return `${resource}:${action}` as OrgPermission;
}

/* Every valid "resource:action" permission string. */
export const ORG_PERMISSIONS: OrgPermission[] = ORG_RESOURCES.flatMap((r) => ORG_ACTIONS.map((a) => permKey(r, a)));

export function isManagerRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/* The full set of actions a (role, permissions) pair can perform. */
export function effectivePermissions(role: string | null | undefined, perms: string[] | null | undefined): Set<string> {
  if (isManagerRole(role)) return new Set<string>(ORG_PERMISSIONS);
  return new Set(Array.isArray(perms) ? perms : []);
}

export function hasOrgPermission(role: string | null | undefined, perms: string[] | null | undefined, permission: string): boolean {
  return effectivePermissions(role, perms).has(permission);
}

/* Keep only valid "resource:action" keys (drops anything unknown from a request body). */
export function sanitizePermissions(perms: unknown): OrgPermission[] {
  if (!Array.isArray(perms)) return [];
  const valid = new Set<string>(ORG_PERMISSIONS);
  return (perms as unknown[]).filter((p): p is OrgPermission => typeof p === "string" && valid.has(p));
}
