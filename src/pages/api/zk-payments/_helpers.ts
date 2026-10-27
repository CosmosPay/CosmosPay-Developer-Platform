/* Shared plumbing for the ZK payment proxy routes (underscore file, not a route): the same
   session -> organization membership -> Payments API path as the swap routes, with an error
   mapping of its own. */
import { ApiStatus, jsonError } from "@/lib/http";
import { CosmosApiError } from "@/lib/cosmos";

export { envFromQuery, requireOrgMember } from "@/pages/api/cross-chain-swaps/_helpers";

/* A 404 stays a 404 (a ZK payment that is not this organization's); anything else the Payments
   API refused (ZK payments not set up on that network, a recipient without a confidential
   account, a bad amount) comes back with its message and its HTTP code, so the dashboard can
   tell "not available here" (503) from a mistake to fix (400). */
export function zkErrorResponse(err: unknown): Response {
  if (err instanceof CosmosApiError) {
    const status = err.status === 404 ? ApiStatus.NOT_FOUND : ApiStatus.BAD_REQUEST;
    return jsonError({ message: err.message, code: err.status, status });
  }
  return jsonError({ message: "Private payment request failed", code: 500, status: ApiStatus.INTERNAL_ERROR });
}
