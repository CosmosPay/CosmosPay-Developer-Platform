import { z } from "zod";
import { requestSession } from "@/lib/request-session";
import { ApiStatus, jsonBadRequest, jsonCreated, jsonError, jsonForbidden, jsonNotFound, jsonUnauthorized, parseJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { discordConfig, discordNotConfigured } from "@/lib/discord-env";
import { authorizeUrl } from "@/lib/discord-link";
import { keyMintRefusal } from "@/lib/discord-link-guard";
import { createInstallRequest, TooManyInstallsError } from "@/lib/discord-links-store";
import { discordInstallBodySchema } from "@/schemas/discord";
import type { APIRoute } from "astro";

const paramsSchema = z.object({ id: z.string().min(1) });

/* POST /api/organizations/:id/discord/install: starts linking a Discord server. Linking mints an
   API key for the organization in the dashboard's environment, so it asks what creating one asks
   (`apiKeysTest:create` / `apiKeysLive:create`, production keys on the owner's plan, the plan's key
   limit), and the wallet must be one of the organization's. Stores a single-use request (ten
   minutes, this member's) and answers Discord's authorize address for the browser to open. */
export const POST: APIRoute = async (ctx) => {
  const session = await requestSession(ctx.request.headers);
  if (!session) return jsonUnauthorized("Session required");
  const config = discordConfig();
  if (!config) return discordNotConfigured();

  const params = paramsSchema.safeParse(ctx.params);
  if (!params.success) return jsonNotFound("Organization not found");
  const orgId = params.data.id;

  const body = await parseJson(ctx.request, discordInstallBodySchema).catch(() => null);
  if (!body || !body.ok) {
    return body?.response ?? jsonError({ message: "Invalid request", code: 400, status: "bad_request" });
  }
  const { environment, walletId, asset } = body.data;

  const refusal = await keyMintRefusal(orgId, session.user.id, environment);
  if (refusal === "not_member") return jsonNotFound("Organization not found");
  if (refusal === "forbidden") return jsonForbidden("You don't have permission to create this kind of API key in this organization.");
  if (refusal === "live_not_allowed") return jsonError({ code: 403, status: ApiStatus.PLAN_LIMIT, message: "Your plan does not allow production (live) API keys. Upgrade to create one." });
  if (refusal === "key_limit") return jsonError({ code: 403, status: ApiStatus.PLAN_LIMIT, message: "You have reached your plan's API key limit for this organization. Upgrade to create more." });

  const wallet = await prisma.organizationWallet.findFirst({ where: { id: walletId, orgId }, select: { id: true } }).catch(() => undefined);
  if (wallet === undefined) return jsonError({ message: "Failed to read the organization's wallets", code: 500, status: "internal_error" });
  if (!wallet) return jsonBadRequest("That wallet is not one of the organization's.");

  try {
    const request = await createInstallRequest({ orgId, userId: session.user.id, environment, walletId, asset });
    return jsonCreated({
      data: { url: authorizeUrl({ clientId: config.clientId, redirectUri: config.redirectUri, state: request.state }), expiresAt: request.expiresAt.toISOString() },
      message: "Continue in Discord",
    });
  } catch (err) {
    if (err instanceof TooManyInstallsError) return jsonError({ message: err.message, code: 429, status: ApiStatus.BAD_REQUEST });
    console.error(`[discord] failed to store an install request for ${orgId}: ${(err as Error)?.message ?? err}`);
    return jsonError({ message: "Failed to start linking Discord", code: 500, status: "internal_error" });
  }
};
