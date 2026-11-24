/* Request bodies of the Discord link routes (src/pages/api/organizations/[id]/discord). `z` comes
   from @/lib/openapi/zod so these schemas can be documented (CLAUDE.md). */
import { z } from "@/lib/openapi/zod";
import { DEFAULT_LINK_ASSET, LINK_ASSET_MAX, normalizeLinkAsset } from "@/lib/discord-link-shared";

/* POST .../discord/install: the dashboard's environment, the organization wallet the server's
   payments go to and the asset they are in (`native`, `CODE` or `CODE:ISSUER`; USDC by default). */
export const discordInstallBodySchema = z.object({
  environment: z.enum(["dev", "prod"]),
  walletId: z.string().trim().min(1).max(64),
  asset: z
    .string()
    .max(LINK_ASSET_MAX)
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || !v.trim()) return DEFAULT_LINK_ASSET;
      const asset = normalizeLinkAsset(v);
      if (!asset) {
        ctx.addIssue({ code: "custom", message: "The asset is `native`, a code such as USDC, or CODE:ISSUER." });
        return z.NEVER;
      }
      return asset;
    }),
});

export type DiscordInstallBody = z.infer<typeof discordInstallBodySchema>;
