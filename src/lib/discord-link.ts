/* Linking a merchant's Discord server to an organization (Settings > Discord), the pure half:
   node:crypto and pure @/lib modules only, so tests/unit/discordLink.test.ts reaches it. The
   routes (src/pages/api/organizations/[id]/discord/*, src/pages/api/integrations/discord/callback.ts)
   read the environment (src/lib/discord-env.ts) and the database (src/lib/discord-links-store.ts);
   the calls to Discord and to the bot are src/lib/discord-http.ts.

   The flow: the member picks a wallet and an asset, the install route stores a single-use request
   (its `state`: 32 random bytes, base64url, ten minutes, bound to the member) and answers Discord's
   authorize address; Discord adds the bot to the server the person picks and sends the browser to
   the callback with a code; the callback uses the request up, exchanges the code (the token's
   `guild` names the server; the `guild_id` query parameter is never trusted), mints an API key for
   the organization and hands it to the bot over a signed request. The key never reaches a browser.

   The bot's requests are signed like Cosmos Pay's webhooks, over the method and the path too, so a
   signed request cannot be replayed as another one: `X-Cosmos-Link-Signature: t=<unix seconds>,
   v1=<hex HMAC-SHA256(secret, "<t>.<METHOD>.<path>.<raw body>")>`, the body empty for GET. The bot refuses a signature it has seen, so every attempt is signed again. */
import { createHash, createHmac, randomBytes } from "node:crypto";

export const DISCORD_AUTHORIZE_URL = "https://discord.com/oauth2/authorize";
export const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
export const DISCORD_ME_URL = "https://discord.com/api/users/@me";
/* `bot` adds it to the server, `applications.commands` its slash commands, `identify` who linked it. */
export const DISCORD_OAUTH_SCOPES = ["bot", "applications.commands", "identify"] as const;
/* What the bot asks for in the server it joins (Discord's permission bitfield). */
export const DISCORD_BOT_PERMISSIONS = "268553216";
export const DISCORD_CALLBACK_PATH = "/api/integrations/discord/callback";
export const DEFAULT_BOT_LINK_URL = "http://127.0.0.1:3800";
/* Every call to Discord and to the bot gives up after this. */
export const DISCORD_HTTP_TIMEOUT_MS = 10_000;

export const INSTALL_TTL_MS = 10 * 60_000;
/* Open (unused, alive) install requests one member may hold in one organization. */
export const MAX_OPEN_INSTALLS = 10;
export const LINK_SECRET_MIN = 32;
export const LINK_SIGNATURE_HEADER = "X-Cosmos-Link-Signature";

/* The key handed to the bot, least privilege: what its payments flow and the commands around it
   use (CosmosPay-Discord-Bot: src/links, src/discord/commands, src/tools/groups, src/tracking),
   nothing that moves funds by other routes or changes the organization's records beyond payments:
   - payments:read / payments:write  checking the key on link, the networks a link settles on,
     /charge and role purchases (POST /payment-intents/pay), following and cancelling them, a
     payer's transaction hash; /payment, /protected, /private and /alias, which are payments too;
   - webhooks:read / webhooks:write  the bot's own webhook endpoint for those payments (POST and
     DELETE /webhooks), /webhook, and /stats' webhook log;
   - products:read                   /charge from a product (GET /products/{id});
   - activity:read                   /stats' client activity (read only).
   Commands that need more answer 403 `insufficient_scope` with this key, and the bot says which
   scope is missing: /swap, /cross-swap and /usdt0 (swaps), /liquidity and /vault (liquidity),
   /plugin, /fiat (on-ramp, off-ramp and QR charges), /customer, and creating, editing or deleting
   with /product. Granting them is the organization's call: a key of its own from API keys, linked
   with the bot's /setup. Its role is `user`, as every key minted here (src/lib/api-key-role.ts). */
export const DISCORD_KEY_SCOPES: string[] = [
  "payments:read",
  "payments:write",
  "webhooks:read",
  "webhooks:write",
  "products:read",
  "activity:read",
];
export const DISCORD_KEY_DESCRIPTION = "Linked from the dashboard";
/* The API keys form takes names up to 80 characters: a longer one could not be edited there. */
export const DISCORD_KEY_NAME_MAX = 80;

export type LinkEnvironment = "dev" | "prod";

/* ---------------- configuration ---------------- */

export interface DiscordConfig {
  clientId: string;
  clientSecret: string;
  botUrl: string;
  linkSecret: string;
  redirectUri: string;
}

/**
 * The deployment's Discord settings, or null when linking is off: no application id or secret, no
 * bot secret of at least LINK_SECRET_MIN characters, a platform address that is not http(s), or a
 * bot address `botLinkUrlProblem` refuses.
 */
export function discordConfigFrom(env: {
  clientId?: string | null;
  clientSecret?: string | null;
  botUrl?: string | null;
  linkSecret?: string | null;
  platformUrl: string;
}): DiscordConfig | null {
  const clientId = (env.clientId ?? "").trim();
  const clientSecret = (env.clientSecret ?? "").trim();
  const linkSecret = (env.linkSecret ?? "").trim();
  const botUrl = ((env.botUrl ?? "").trim() || DEFAULT_BOT_LINK_URL).replace(/\/+$/, "");
  if (!clientId || !clientSecret || linkSecret.length < LINK_SECRET_MIN) return null;
  if (botLinkUrlProblem(botUrl) || !isHttpUrl(env.platformUrl)) return null;
  return { clientId, clientSecret, botUrl, linkSecret, redirectUri: discordCallbackUrl(env.platformUrl) };
}

const isLoopbackHost = (host: string) => host === "localhost" || host === "[::1]" || /^127(\.\d{1,3}){3}$/.test(host);

/**
 * Why the bot's address (DISCORD_BOT_LINK_URL, trailing slashes dropped) cannot carry the key, or
 * null when it can: it must be https, or http on a loopback host only (the bot beside the
 * platform), with no credentials, query or fragment, and no path: the bot checks the signature
 * over its own path (`/links...`), so a prefix would break every request.
 */
export function botLinkUrlProblem(value: string): "not_url" | "not_https" | "has_path" | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "not_url";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "not_url";
  if (url.username || url.password || url.search || url.hash) return "not_url";
  if (url.protocol === "http:" && !isLoopbackHost(url.hostname)) return "not_https";
  if (url.pathname !== "/" && url.pathname !== "") return "has_path";
  return null;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** `<platform>/api/integrations/discord/callback`, as registered with the Discord application. */
export function discordCallbackUrl(platformUrl: string): string {
  return new URL(DISCORD_CALLBACK_PATH, platformUrl).toString();
}

/** Discord's authorize address: add the bot to a server the person picks, then the callback. */
export function authorizeUrl({ clientId, redirectUri, state }: { clientId: string; redirectUri: string; state: string }): string {
  const query = [
    `client_id=${encodeURIComponent(clientId)}`,
    `scope=${DISCORD_OAUTH_SCOPES.join("+")}`,
    `permissions=${DISCORD_BOT_PERMISSIONS}`,
    "integration_type=0",
    "response_type=code",
    `redirect_uri=${encodeURIComponent(redirectUri)}`,
    `state=${encodeURIComponent(state)}`,
  ];
  return `${DISCORD_AUTHORIZE_URL}?${query.join("&")}`;
}

/* ---------------- the install request ---------------- */

const STATE_RE = /^[A-Za-z0-9_-]{43}$/;

/** 32 random bytes, base64url (43 characters): the install request's id and Discord's `state`. */
export function newInstallState(): string {
  return randomBytes(32).toString("base64url");
}

export const isInstallState = (value: unknown): value is string => typeof value === "string" && STATE_RE.test(value);

export function installExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + INSTALL_TTL_MS);
}

export function installStateExpired(expiresAt: Date | string, now: Date = new Date()): boolean {
  const at = typeof expiresAt === "string" ? Date.parse(expiresAt) : expiresAt.getTime();
  return !(at > now.getTime());
}

/** Why a stored request cannot finish a link for this member, or null when it can. */
export function installRequestProblem(
  request: { userId: string; expiresAt: Date | string; usedAt: Date | string | null } | null,
  userId: string,
  now: Date = new Date(),
): "missing" | "other_user" | "used" | "expired" | null {
  if (!request) return "missing";
  if (request.userId !== userId) return "other_user";
  if (request.usedAt) return "used";
  if (installStateExpired(request.expiresAt, now)) return "expired";
  return null;
}

/* ---------------- signing the bot's requests ---------------- */

/** The string the signature covers: `<t>.<METHOD>.<path>.<raw body>`. */
export function linkSignaturePayload(t: number, method: string, path: string, body: string): string {
  return `${t}.${method.toUpperCase()}.${path}.${body}`;
}

/**
 * The `X-Cosmos-Link-Signature` value for one request: `t=<unix seconds>,v1=<hex HMAC-SHA256>`.
 * `path` is the request's path alone (no host, no query); `body` the exact JSON sent, or "" for
 * GET. Sign again for every attempt: the bot refuses a signature it has seen.
 */
export function signLinkRequest(secret: string, method: string, path: string, body: string, now: Date = new Date()): string {
  if (!path.startsWith("/") || path.includes("?") || path.includes("#")) throw new Error("A link request is signed over its path alone");
  const t = Math.floor(now.getTime() / 1000);
  const v1 = createHmac("sha256", secret).update(linkSignaturePayload(t, method, path, body)).digest("hex");
  return `t=${t},v1=${v1}`;
}

/* ---------------- what Discord and the bot answer ---------------- */

const SNOWFLAKE = /^\d{5,25}$/;
export const isSnowflake = (value: unknown): value is string => typeof value === "string" && SNOWFLAKE.test(value);

/** `/links/<guildId>`: a server's link at the bot. */
export function botLinkPath(guildId: string): string {
  if (!isSnowflake(guildId)) throw new Error("Not a Discord server id");
  return `/links/${guildId}`;
}

/* A name as Discord gives it, made safe to store and show: no control characters, trimmed, cut. */
function cleanName(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!clean) return null;
  const chars = Array.from(clean);
  return chars.length > max ? chars.slice(0, max).join("") : clean;
}

export interface DiscordGuild {
  id: string;
  name: string;
}

/** The token exchange's answer: the access token and the server the bot was added to. */
export function parseTokenAnswer(json: unknown): { accessToken: string; guild: DiscordGuild | null } | null {
  if (!json || typeof json !== "object") return null;
  const answer = json as { access_token?: unknown; guild?: unknown };
  if (typeof answer.access_token !== "string" || !answer.access_token) return null;
  const guild = answer.guild && typeof answer.guild === "object" ? (answer.guild as { id?: unknown; name?: unknown }) : null;
  const name = guild ? cleanName(guild.name, 100) : null;
  return {
    accessToken: answer.access_token,
    guild: guild && isSnowflake(guild.id) && name ? { id: guild.id, name } : null,
  };
}

/** Who authorized the bot (`/users/@me`): their id and the name they show, each null when unreadable. */
export function parseDiscordUser(json: unknown): { id: string | null; name: string | null } {
  if (!json || typeof json !== "object") return { id: null, name: null };
  const user = json as { id?: unknown; username?: unknown; global_name?: unknown };
  return {
    id: isSnowflake(user.id) ? user.id : null,
    name: cleanName(user.global_name, 64) ?? cleanName(user.username, 64),
  };
}

/** Lowercase hex SHA-256 of an API key: how the bot's `DELETE /links/{guildId}` names the key the
    link was made with, so it unlinks only the link this platform made. Kept beside the link (the key
    itself is never stored). */
export function apiKeySha256(apiKey: string): string {
  return createHash("sha256").update(apiKey, "utf8").digest("hex");
}

/**
 * Whether a member may link a server that `existing` already links (null: it links none). A server
 * linked to another organization is refused until that one unlinks it there; replacing this
 * organization's own link revokes its key, so it takes what revoking that key takes: the delete
 * permission of the old link's environment.
 */
export function relinkRefusal(
  existing: { orgId: string; environment: LinkEnvironment } | null,
  orgId: string,
  canDeleteKeys: (environment: LinkEnvironment) => boolean,
): "linked_elsewhere" | "replace_forbidden" | null {
  if (!existing) return null;
  if (existing.orgId !== orgId) return "linked_elsewhere";
  return canDeleteKeys(existing.environment) ? null : "replace_forbidden";
}

/** The key's name in the API keys list: `Discord: <server>`, within what that form accepts. */
export function discordKeyName(guildName: string): string {
  const name = `Discord: ${guildName.trim()}`;
  const chars = Array.from(name);
  return chars.length > DISCORD_KEY_NAME_MAX ? chars.slice(0, DISCORD_KEY_NAME_MAX).join("") : name;
}

/** The body of the bot's `POST /links`, as its contract names the fields. */
export interface BotLinkPayload {
  guildId: string;
  apiKey: string;
  chain: string;
  address: string;
  asset: string | null;
  linkedBy: { discordUserId: string | null; name: string | null };
}

export type BotLinkResult =
  | { ok: true }
  | { ok: false; reason: "bot_refused"; detail: string | null; log: string }
  | { ok: false; reason: "bot_unreachable"; log: string };

const REFUSALS = new Set(["invalid_key", "network_unavailable", "invalid_address", "asset_needs_issuer", "asset_unknown", "asset_ambiguous"]);

/**
 * What the bot's answer to `POST /links` means: any 2xx is a link; a 400 is a refusal with its code
 * (only the codes the dashboard words are passed on), a 404 a server the bot is not in; a 401 (our
 * signature refused), a 503 (links off at the bot) and anything else is a bot we could not use.
 * `log` names the cause for the server log, never a secret.
 */
export function botLinkResult(status: number, json: unknown): BotLinkResult {
  if (status >= 200 && status < 300) return { ok: true };
  const code = json && typeof json === "object" && typeof (json as { error?: unknown }).error === "string" ? (json as { error: string }).error : null;
  const safeCode = code && /^[a-z_]{1,40}$/.test(code) ? code : null;
  if (status === 400) return { ok: false, reason: "bot_refused", detail: safeCode && REFUSALS.has(safeCode) ? safeCode : null, log: `refused (${safeCode ?? "no code"})` };
  if (status === 404) return { ok: false, reason: "bot_refused", detail: "guild_not_found", log: "the bot is not in that server" };
  if (status === 401 || status === 403) return { ok: false, reason: "bot_unreachable", log: `signature refused (${status}): check DISCORD_BOT_LINK_SECRET on both sides` };
  if (status === 503) return { ok: false, reason: "bot_unreachable", log: "links are disabled at the bot (503)" };
  return { ok: false, reason: "bot_unreachable", log: `unexpected answer ${status}` };
}
