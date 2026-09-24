/* sep-http.ts — responses for the endpoints that belong to a standard, not to this API.

   Everything else here answers in the house envelope, `{ data, code, status, message }`.
   The SEP-10 and SEP-30 routes do not, and that is the whole point of this file: they are
   endpoints someone else's client calls. A wallet that implements SEP-30 reads
   `signers[0].key` off the body it was handed; wrapped in `data` it reads undefined, and
   the failure arrives as "this server returned no signer" rather than as "this server is
   not the shape you think". So the standard endpoints answer in the standard's shape, and
   the envelope stops at the routes this API invented.

   Which ones those are is worth saying plainly, because the line is not the URL prefix:

   - SEP-10   `/api/sep10/auth`                      — bare, per SEP-10
   - SEP-30   `/api/recovery/accounts[/...]`          — bare, per SEP-30
   - ours     `/api/recovery/info`, `/api/recovery/identity` — enveloped, like the rest

   The last two are extensions. SEP-30 allows "External" authentication without saying what
   it looks like, and it defines no discovery at all, so `identity` and `info` are this
   operator's own answers to those. They are not part of any standard and do not pretend to
   be. `.well-known/stellar.toml` is what a third-party client actually discovers us with.

   Errors are `{ "error": "..." }` with the four status codes SEP-30 names: 400 for a
   request that is wrong, 401 for a missing or unacceptable token, 404 for an account that
   is absent OR that this caller may not see (the spec folds those together deliberately —
   distinguishing them would confirm an account exists to someone with no right to know),
   and 409 for registering something already registered. 403 and 429 are not in the
   spec's list; they are kept anyway, because inventing a 400 for "you hold the wrong key"
   would be less use to a client than a status it can read. */

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" } as const;

/** A SEP response body, exactly as the spec describes it — no wrapper. */
export function sepJson(data: unknown, httpStatus = 200): Response {
  return new Response(JSON.stringify(data), { status: httpStatus, headers: JSON_HEADERS });
}

/**
 * A SEP error: `{ "error": "..." }`.
 *
 * The message is for a human reading a log, never for a client to branch on. Nothing in
 * either spec assigns meaning to its text, so a caller that matches on it is one wording
 * away from breaking — the status code is the contract.
 */
export function sepError(error: string, httpStatus: number): Response {
  return sepJson({ error }, httpStatus);
}

/* The refusals that come up in more than one route, so their wording and their status
   cannot drift apart between them. */

/** This host is not configured as a recovery server. Not an error so much as an address. */
export const sepNotAServer = () => sepError("This deployment is not a recovery server.", 503);

export const sepRateLimited = () => sepError("Too many requests — wait a moment.", 429);

export const sepUnauthorized = () => sepError("No token, or a token for another server.", 401);

/**
 * Absent, or not yours. One answer for both on purpose: a 403 here would tell whoever
 * asked that the account IS registered for recovery, which is exactly what someone
 * holding a stolen email would like to learn before spending effort on it.
 */
export const sepNotFound = () => sepError("Not found.", 404);

/** Registering and changing identities need the account's own key, never an identity. */
export const sepNotTheKeyHolder = () => sepError("This needs the account's own key.", 403);
