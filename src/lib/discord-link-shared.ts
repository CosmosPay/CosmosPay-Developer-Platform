/* What the Discord link and the dashboard agree on, safe for the browser (no node:* import): the
   asset a merchant names for a linked server, and the outcome the callback hands back to Settings.

   The callback (src/pages/api/integrations/discord/callback.ts) ends with a redirect to
   `/dashboard?view=settings&discord=linked`, or `...&discord=error&reason=<code>` with, for a link
   the bot refused, `&detail=<the bot's code>`. Settings reads it back with `readLinkOutcome`, which
   accepts only the codes listed here: no text from the address ever reaches the screen, each code
   is a sentence in the viewer's language (dash.discord.reasons / refusals). */

export const DEFAULT_LINK_ASSET = "USDC";
export const LINK_ASSET_MAX = 160;

/* A ticker (Stellar's codes are up to 12 letters and digits; other networks' tickers carry dots
   and dashes, as USDC.e) and an issuer: a Stellar account, a mint, a contract, a NEAR token id. */
const ASSET_CODE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,15}$/;
const ASSET_ISSUER = /^[A-Za-z0-9][A-Za-z0-9._-]{0,139}$/;

/**
 * The asset as stored and sent to the bot: `native`, a code (`USDC`) or `CODE:ISSUER`. Null for
 * anything else (empty included); the bot decides whether the network has it.
 */
export function normalizeLinkAsset(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || value.length > LINK_ASSET_MAX) return null;
  if (/^native$/i.test(value)) return "native";
  const colon = value.indexOf(":");
  if (colon < 0) return ASSET_CODE.test(value) ? value : null;
  const code = value.slice(0, colon).trim();
  const issuer = value.slice(colon + 1).trim();
  return ASSET_CODE.test(code) && ASSET_ISSUER.test(issuer) ? `${code}:${issuer}` : null;
}

/** Why a link did not happen, as the callback says it. */
export const LINK_FAILURE_REASONS = [
  "denied", // the person cancelled on Discord
  "expired", // the request expired, was used, or is someone else's
  "forbidden", // the member lost the permission meanwhile
  "not_configured", // the deployment has no Discord application or bot secret
  "wallet_missing", // the wallet left the organization meanwhile
  "discord_error", // Discord refused the code, or named no server
  "bot_unreachable", // the bot did not answer, or refused our signature
  "bot_refused", // the bot refused the link (detail says why)
  "key_limit", // the plan's API key limit, or no production keys on the plan
  "internal", // anything else on our side
] as const;
export type LinkFailureReason = (typeof LINK_FAILURE_REASONS)[number];

/** The bot's refusals the dashboard can word (its `error` codes, and a 404's `guild_not_found`). */
export const BOT_REFUSAL_CODES = [
  "invalid_key",
  "network_unavailable",
  "invalid_address",
  "asset_needs_issuer",
  "asset_unknown",
  "asset_ambiguous",
  "guild_not_found",
] as const;
export type BotRefusalCode = (typeof BOT_REFUSAL_CODES)[number];

export type LinkOutcome =
  | { linked: true }
  | { linked: false; reason: LinkFailureReason; detail: BotRefusalCode | null };

export const isLinkFailureReason = (v: unknown): v is LinkFailureReason =>
  typeof v === "string" && (LINK_FAILURE_REASONS as readonly string[]).includes(v);

export const isBotRefusalCode = (v: unknown): v is BotRefusalCode =>
  typeof v === "string" && (BOT_REFUSAL_CODES as readonly string[]).includes(v);

/** Settings, where the callback always lands. */
export const LINK_OUTCOME_BASE = "/dashboard?view=settings";

/** The address the callback redirects to (same origin, a path). */
export function outcomeLocation(outcome: LinkOutcome): string {
  if (outcome.linked) return `${LINK_OUTCOME_BASE}&discord=linked`;
  const detail = outcome.reason === "bot_refused" && outcome.detail ? `&detail=${outcome.detail}` : "";
  return `${LINK_OUTCOME_BASE}&discord=error&reason=${outcome.reason}${detail}`;
}

/** The outcome the address names, or null when it names none (or something unknown). */
export function readLinkOutcome(discord: string | null, reason: string | null, detail: string | null): LinkOutcome | null {
  if (discord === "linked") return { linked: true };
  if (discord !== "error") return null;
  const why = isLinkFailureReason(reason) ? reason : "internal";
  return { linked: false, reason: why, detail: why === "bot_refused" && isBotRefusalCode(detail) ? detail : null };
}
