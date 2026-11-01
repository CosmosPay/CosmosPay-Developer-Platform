/* markdown-config.ts: what the Markdown versions of the pages and /llms-full.txt are built with at
   runtime: the configured origins (src/components/cosmos/lib/constants.ts), the Payments API base
   the public swap page names, and the company's profiles. Reads astro:env, so it is for the routes
   and the middleware; the builders themselves are pure (src/lib/seo/page-markdown.ts). */
import { DEV, PAYMENTS, SITE, SOCIAL, SOCIAL_NAMES } from "@/components/cosmos/lib/constants";
import { API_BASE } from "@/lib/payments/urls";
import type { MarkdownInput } from "@/lib/seo/markdown";

export const MARKDOWN_INPUT: MarkdownInput = {
  site: SITE,
  dev: DEV,
  payments: PAYMENTS,
  api: API_BASE,
  profiles: Object.fromEntries((Object.keys(SOCIAL) as (keyof typeof SOCIAL)[]).map((key) => [SOCIAL_NAMES[key], SOCIAL[key]])),
};

/** Each area's public origin. */
export const AREA_ORIGINS = { site: SITE, dev: DEV, payments: PAYMENTS } as const;
