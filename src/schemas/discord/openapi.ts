/* OpenAPI registration for the Discord link (src/pages/api/organizations/[id]/discord/** and
   src/pages/api/integrations/discord/callback.ts; auto-loaded by src/lib/openapi/auto-load.ts).

   A member links a Discord server to the organization from Settings: the install route answers
   Discord's authorize address, Discord adds the bot to the server the person picks and sends the
   browser to the callback, which mints an API key for the organization and hands it to the bot
   (never to the browser). Every route answers 503 `not_configured` while the deployment has no
   Discord application. A caller who is not a member is answered 404, as on every organization route. */
import { errors, jsonCreated, jsonOk, registerRoutes, sessionSecurity } from "@/lib/openapi/route-helpers";
import { z } from "@/lib/openapi/zod";
import { jsonBody, pathParam } from "@/schemas/shared/openapi-params";
import { DISCORD_KEY_SCOPES } from "@/lib/discord-link";
import { BOT_REFUSAL_CODES, LINK_FAILURE_REASONS } from "@/lib/discord-link-shared";

const TAG = "Integrations";
const orgIdParam = pathParam("id", "org_123", "Organization id.");
const linkParams = orgIdParam.extend(pathParam("linkId", "clx9z8a1b0000dslk1234abcd", "Discord link id.").shape);
const notConfigured = { description: "Discord linking is not configured on this server (`not_configured`)", content: errors.internalError.content };
const planLimit = { description: "No permission, or the plan's limit (`plan_limit`: the API key limit, or no production keys)", content: errors.forbidden.content };

const installBody = z
  .object({
    environment: z.enum(["dev", "prod"]).openapi({ example: "dev", description: "The dashboard's environment: the API key the bot holds is minted for it." }),
    walletId: z.string().openapi({ example: "clx9z8a1b0000wllt1234abcd", description: "One of the organization's wallets (any network): where the server's payments go." }),
    asset: z.string().optional().openapi({ example: "USDC", description: "`native`, a code such as `USDC`, or `CODE:ISSUER`. USDC when absent or empty; the bot decides whether the wallet's network has it." }),
  })
  .openapi("DiscordInstallBody");

const installAnswer = z
  .object({
    url: z.string().openapi({ example: "https://discord.com/oauth2/authorize?client_id=1300000000000000000&scope=bot+applications.commands+identify&permissions=268553216&integration_type=0&response_type=code&redirect_uri=https%3A%2F%2Fdev.cosmospay.lat%2Fapi%2Fintegrations%2Fdiscord%2Fcallback&state=Wm9x3qKcY2v8b1T0d4hLr6sQeA7uPzJgN5iMfXwCkHo", description: "Discord's authorize address: open it in the browser." }),
    expiresAt: z.string().openapi({ example: "2026-11-18T12:10:00.000Z", description: "The request behind it is good for one link until then (ten minutes)." }),
  })
  .openapi("DiscordInstall");

const linkSchema = z
  .object({
    id: z.string().openapi({ example: "clx9z8a1b0000dslk1234abcd" }),
    guildId: z.string().openapi({ example: "1180000000000000000", description: "The Discord server's id." }),
    guildName: z.string().openapi({ example: "Andes Commerce" }),
    environment: z.enum(["dev", "prod"]).openapi({ example: "prod" }),
    chain: z.string().openapi({ example: "stellar", description: "The wallet's network." }),
    address: z.string().openapi({ example: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTGG" }),
    asset: z.string().openapi({ example: "USDC" }),
    apiKeyId: z.string().openapi({ example: "cosmos_6f1c2a7e-0d3b-4a51-9a3e-2b8f6c1d4e5a", description: "The id of the API key the bot holds (listed in API keys for the member who linked it). The secret is never stored or returned." }),
    discordUserId: z.string().nullable().openapi({ example: "1170000000000000000", description: "The Discord account that authorized the bot, when Discord said." }),
    discordUsername: z.string().nullable().openapi({ example: "ana.salta" }),
    createdBy: z
      .object({
        id: z.string().openapi({ example: "usr_123" }),
        name: z.string().nullable().openapi({ example: "Ana Gómez" }),
        email: z.string().nullable().openapi({ example: "ana@andes.dev" }),
      })
      .openapi({ description: "The dashboard member who linked it." }),
    createdAt: z.string().openapi({ example: "2026-11-18T12:04:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2026-11-18T12:04:00.000Z" }),
  })
  .openapi("DiscordLink", { description: "A Discord server linked to the organization." });

registerRoutes([
  {
    method: "get",
    path: "/api/organizations/{id}/discord",
    tags: [TAG],
    summary: "List the linked Discord servers",
    description: "Any member may read them.",
    security: sessionSecurity,
    request: { params: orgIdParam },
    responses: {
      200: jsonOk(z.array(linkSchema), "ListDiscordLinksResponse", "Discord servers loaded"),
      401: errors.unauthorized,
      404: errors.notFound,
      500: errors.internalError,
      503: notConfigured,
    },
  },
  {
    method: "post",
    path: "/api/organizations/{id}/discord/install",
    tags: [TAG],
    summary: "Start linking a Discord server",
    description:
      "Linking mints an API key for the organization, so it needs what creating one needs: `apiKeysTest:create` or `apiKeysLive:create` for the environment, production keys on the owner's plan, and room under the plan's API key limit (403 `plan_limit` otherwise). The wallet must be one of the organization's. Stores a single-use request (ten minutes, bound to this member) and answers Discord's authorize address. 429 when the member already holds ten open requests in the organization.",
    security: sessionSecurity,
    request: { params: orgIdParam, ...jsonBody(installBody) },
    responses: {
      201: jsonCreated(installAnswer, "DiscordInstallResponse", "Continue in Discord"),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: planLimit,
      404: errors.notFound,
      429: { description: "Too many open link requests", content: errors.badRequest.content },
      500: errors.internalError,
      503: notConfigured,
    },
  },
  {
    method: "delete",
    path: "/api/organizations/{id}/discord/{linkId}",
    tags: [TAG],
    summary: "Unlink a Discord server",
    description:
      "Needs `apiKeysTest:delete` or `apiKeysLive:delete` for the link's environment. Tells the bot (best effort), revokes the API key it held, then removes the link. A key the gateway could not revoke keeps the link (500), so the call can be made again.",
    security: sessionSecurity,
    request: { params: linkParams },
    responses: {
      200: jsonOk(
        z.object({ id: z.string().openapi({ example: "clx9z8a1b0000dslk1234abcd" }), apiKeyId: z.string().openapi({ example: "cosmos_6f1c2a7e-0d3b-4a51-9a3e-2b8f6c1d4e5a" }) }),
        "UnlinkDiscordResponse",
        "Discord server unlinked",
      ),
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
      503: notConfigured,
    },
  },
  {
    method: "get",
    path: "/api/integrations/discord/callback",
    tags: [TAG],
    summary: "Discord's return after adding the bot",
    description: [
      "A browser navigation from Discord, with the session cookie: never called by hand. It uses up the install request `state` names (it must be this member's, unused and alive), exchanges `code` with Discord, whose token names the server the bot was added to (`guild_id` is never trusted), mints an API key for the organization with every scope but KYC's",
      `(${DISCORD_KEY_SCOPES.length} scopes, role \`user\`, named \`Discord: <server>\`) and hands it to the bot over a signed request. The key never reaches the browser; a link that fails after the key was minted revokes it.`,
      "Linking a server again, from any organization, replaces its link and revokes the old key.",
      `Always a 302: to \`/dashboard?view=settings&discord=linked\`, or \`&discord=error&reason=<code>\` (${LINK_FAILURE_REASONS.map((r) => `\`${r}\``).join(", ")}), with \`&detail=<code>\` for a link the bot refused (${BOT_REFUSAL_CODES.map((r) => `\`${r}\``).join(", ")}). Signed out, to \`/login\` with that address as \`next\`.`,
    ].join(" "),
    request: {
      query: z.object({
        code: z.string().optional().openapi({ param: { name: "code", in: "query" }, description: "Discord's authorization code." }),
        state: z.string().optional().openapi({ param: { name: "state", in: "query" }, description: "The install request (43 characters, base64url)." }),
        guild_id: z.string().optional().openapi({ param: { name: "guild_id", in: "query" }, description: "Discord's hint of the server; ignored in favour of the token's." }),
        error: z.string().optional().openapi({ param: { name: "error", in: "query" }, example: "access_denied", description: "Set by Discord when the person cancelled." }),
      }),
    },
    responses: {
      302: { description: "Back to Settings, with the outcome in the address (or to /login when signed out)" },
    },
  },
]);
