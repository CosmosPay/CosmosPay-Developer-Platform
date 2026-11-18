/* The calls the Discord link makes over the network: Discord's token exchange and `/users/@me`,
   and the bot's `POST /links` and `DELETE /links/{guildId}` (src/lib/discord-link.ts has the
   contract). Pure: `fetch` is a parameter, so tests/unit/discordHttp.test.ts runs them against a
   stand-in. Every call gives up after DISCORD_HTTP_TIMEOUT_MS and none is retried: the bot refuses
   a signature it has seen, so a retry would be a new request, signed again. Nothing here throws;
   failures come back with a `log` line that names the cause and never a secret. */
import {
  DISCORD_HTTP_TIMEOUT_MS,
  DISCORD_ME_URL,
  DISCORD_TOKEN_URL,
  LINK_SIGNATURE_HEADER,
  botLinkPath,
  botLinkResult,
  parseDiscordUser,
  parseTokenAnswer,
  signLinkRequest,
  type BotLinkPayload,
  type BotLinkResult,
  type DiscordGuild,
} from "@/lib/discord-link";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const timeout = () => AbortSignal.timeout(DISCORD_HTTP_TIMEOUT_MS);
const failure = (err: unknown) => ((err as Error)?.name === "TimeoutError" ? "timed out" : (err as Error)?.message || "request failed");

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Exchanges the authorization code for a token, as Discord's OAuth2 asks (form-encoded, the
 * application's id and secret in the body). The answer's `guild` is the server the bot was added
 * to; without one there is nothing to link.
 */
export async function exchangeDiscordCode(
  config: { clientId: string; clientSecret: string; redirectUri: string },
  code: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ ok: true; accessToken: string; guild: DiscordGuild } | { ok: false; log: string }> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });
  let res: Response;
  try {
    res = await fetchImpl(DISCORD_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: body.toString(),
      signal: timeout(),
    });
  } catch (err) {
    return { ok: false, log: `token exchange ${failure(err)}` };
  }
  const json = await readJson(res);
  if (!res.ok) {
    // Discord's OAuth2 errors carry a code (`invalid_grant`...); the description is not needed.
    const code = json && typeof json === "object" && typeof (json as { error?: unknown }).error === "string" ? (json as { error: string }).error : "no code";
    return { ok: false, log: `token exchange refused (${res.status}, ${/^[a-z_]{1,40}$/.test(code) ? code : "unreadable"})` };
  }
  const token = parseTokenAnswer(json);
  if (!token) return { ok: false, log: "token exchange answered no access token" };
  if (!token.guild) return { ok: false, log: "token exchange named no server" };
  return { ok: true, accessToken: token.accessToken, guild: token.guild };
}

/** Who authorized the bot. Best effort: a failure is two nulls, never a refused link. */
export async function readDiscordUser(accessToken: string, fetchImpl: FetchLike = fetch): Promise<{ id: string | null; name: string | null }> {
  try {
    const res = await fetchImpl(DISCORD_ME_URL, { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }, signal: timeout() });
    return res.ok ? parseDiscordUser(await readJson(res)) : { id: null, name: null };
  } catch {
    return { id: null, name: null };
  }
}

type BotConfig = { botUrl: string; linkSecret: string };

/* One signed request to the bot; the signature covers the method, the path the bot sees and the
   exact body. */
async function botCall(config: BotConfig, method: "POST" | "DELETE", path: string, body: string, fetchImpl: FetchLike, now: () => Date): Promise<{ status: number; json: unknown } | { error: string }> {
  const url = new URL(config.botUrl.replace(/\/+$/, "") + path);
  const headers: Record<string, string> = {
    [LINK_SIGNATURE_HEADER]: signLinkRequest(config.linkSecret, method, url.pathname, body, now()),
    Accept: "application/json",
  };
  if (body) headers["Content-Type"] = "application/json";
  try {
    const res = await fetchImpl(url.toString(), { method, headers, body: body || undefined, redirect: "manual", signal: timeout() });
    return { status: res.status, json: await readJson(res) };
  } catch (err) {
    return { error: failure(err) };
  }
}

/** Hands the server's link to the bot (`POST /links`). */
export async function postBotLink(config: BotConfig, payload: BotLinkPayload, fetchImpl: FetchLike = fetch, now: () => Date = () => new Date()): Promise<BotLinkResult> {
  const answer = await botCall(config, "POST", "/links", JSON.stringify(payload), fetchImpl, now);
  if ("error" in answer) return { ok: false, reason: "bot_unreachable", log: `unreachable (${answer.error})` };
  return botLinkResult(answer.status, answer.json);
}

/** Tells the bot a server is no longer linked (`DELETE /links/{guildId}`); a 404 is fine. */
export async function deleteBotLink(config: BotConfig, guildId: string, fetchImpl: FetchLike = fetch, now: () => Date = () => new Date()): Promise<{ ok: true } | { ok: false; log: string }> {
  const answer = await botCall(config, "DELETE", botLinkPath(guildId), "", fetchImpl, now);
  if ("error" in answer) return { ok: false, log: `unreachable (${answer.error})` };
  if ((answer.status >= 200 && answer.status < 300) || answer.status === 404) return { ok: true };
  return { ok: false, log: `unexpected answer ${answer.status}` };
}
