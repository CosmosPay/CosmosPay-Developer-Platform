/* Whether a member may have the Discord link mint an API key for the organization in an
   environment: the same rules as creating one in API keys (src/pages/api/api-keys/index.ts), asked
   by the install route and again by the callback, since the member's role or the plan may change
   while Discord is open. Server-only. */
import { getMembership, orgOwnerPlanLimits } from "@/lib/organizations";
import { hasOrgPermission } from "@/lib/org-permissions";
import { atLimit } from "@/lib/plans";
import { listUserApiKeys } from "@/utils/apisix";
import type { LinkEnvironment } from "@/lib/discord-link";

export type KeyMintRefusal = "not_member" | "forbidden" | "live_not_allowed" | "key_limit";

/** Why the key cannot be minted, or null when it can. */
export async function keyMintRefusal(orgId: string, userId: string, environment: LinkEnvironment): Promise<KeyMintRefusal | null> {
  const membership = await getMembership(orgId, userId).catch(() => null);
  if (!membership) return "not_member";
  const resource = environment === "prod" ? "apiKeysLive" : "apiKeysTest";
  if (!hasOrgPermission(membership.role, membership.permissions, `${resource}:create`)) return "forbidden";
  // Keys belong to the organization: its owner's plan sets production access and the limit, and
  // the count is this member's keys in the organization, as the API keys route counts them.
  const limits = await orgOwnerPlanLimits(orgId);
  if (environment === "prod" && !limits.allowLive) return "live_not_allowed";
  const keys = await listUserApiKeys(userId).catch(() => []);
  const count = Array.isArray(keys) ? keys.filter((k: { value?: { labels?: { org?: string } } }) => k.value?.labels?.org === orgId).length : 0;
  return atLimit(limits.maxApiKeys, count) ? "key_limit" : null;
}
