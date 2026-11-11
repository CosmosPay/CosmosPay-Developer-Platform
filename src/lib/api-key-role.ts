/* api-key-role.ts: the role an API key carries to the Payments API, and what the dashboard
   shows for it. Pure (no astro:env, no database), so the rules are unit-tested.

   The role the gateway forwards (`X-Consumer-Role`) is not a dashboard setting. The Payments
   API reads `admin` as the PLATFORM's own key: it skips every scope check, may approve a KYC
   review (the second pair of eyes on a tenant's submission) and may lift an operator's
   kill-switch on a fiat account. The dashboard used to let anyone mint such a key for their
   own organization, so any account could sign off its own KYC review. No key minted here is
   `admin` any more, and the consumer forwarder never sends it for one minted before. */
import { COSMOS_SCOPES } from "@/lib/cosmos-scopes";

/* What the forwarder may send: `user` for every key minted from the dashboard and `public`
   for the shared key of the open-source wallet (`public-key.ts`). */
export type ForwardedKeyRole = "user" | "public";

/* The roles `createApiKey` accepts. The request bodies have no role field to choose from. */
export const MINTABLE_KEY_ROLES: readonly ForwardedKeyRole[] = ["user", "public"];

export function isMintableKeyRole(role: unknown): role is ForwardedKeyRole {
  return (MINTABLE_KEY_ROLES as readonly unknown[]).includes(role);
}

/* The role and scopes the consumer forwarder bakes for one credential, from its labels.

   A credential labelled `admin` (minted before this rule) was the dashboard's "full access"
   key: every resource of its own organization. It keeps exactly that, every scope of the
   catalog, and stops being a platform key: `user` is forwarded. Everything else that is not
   `public` is `user` with the scopes it was given. */
export function forwardedKeyAuth(
  labelRole: unknown,
  permissions: readonly string[],
): { role: ForwardedKeyRole; permissions: string[] } {
  if (labelRole === "public") return { role: "public", permissions: [...permissions] };
  if (labelRole === "admin") {
    return { role: "user", permissions: [...new Set([...permissions, ...COSMOS_SCOPES])] };
  }
  return { role: "user", permissions: [...permissions] };
}

/* What a key's row shows as its role in the dashboard: "admin" (the copy calls it full access
   to every resource) for a key that holds every scope of the catalog, or a legacy `admin`
   key, and "user" for a key with a narrower set. */
export function keyAccess(key: { role?: unknown; permissions?: unknown }): "admin" | "user" {
  if (key.role === "admin") return "admin";
  const granted = Array.isArray(key.permissions) ? key.permissions : [];
  return COSMOS_SCOPES.every((scope) => granted.includes(scope)) ? "admin" : "user";
}
