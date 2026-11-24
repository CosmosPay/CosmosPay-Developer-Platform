import { z } from "zod";
import { requestSession } from "@/lib/request-session";
import { jsonError, jsonNotFound, jsonSuccess, jsonUnauthorized } from "@/lib/http";
import { getMembership } from "@/lib/organizations";
import { discordConfig, discordNotConfigured } from "@/lib/discord-env";
import { listDiscordLinks } from "@/lib/discord-links-store";
import type { APIRoute } from "astro";

const paramsSchema = z.object({ id: z.string().min(1) });

/* GET /api/organizations/:id/discord: the Discord servers linked to the organization (any member).
   503 `not_configured` while this deployment has no Discord application: Settings then draws no
   Discord section. */
export const GET: APIRoute = async (ctx) => {
  const session = await requestSession(ctx.request.headers);
  if (!session) return jsonUnauthorized("Session required");
  if (!discordConfig()) return discordNotConfigured();

  const params = paramsSchema.safeParse(ctx.params);
  if (!params.success) return jsonNotFound("Organization not found");

  const membership = await getMembership(params.data.id, session.user.id).catch(() => null);
  if (!membership) return jsonNotFound("Organization not found");

  const links = await listDiscordLinks(params.data.id).catch((err: unknown) => {
    console.error(`[discord] failed to list the links of ${params.data.id}: ${(err as Error)?.message ?? err}`);
    return null;
  });
  if (!links) return jsonError({ message: "Failed to load the Discord servers", code: 500, status: "internal_error" });
  return jsonSuccess({ data: links, message: "Discord servers loaded" });
};
