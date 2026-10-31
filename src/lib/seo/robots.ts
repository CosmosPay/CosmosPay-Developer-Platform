/* robots.ts: robots.txt for each domain (one app answers all three, so a static file would say
   the same thing everywhere). src/pages/robots.txt.ts serves it; src/lib/hosts.ts lets the path
   through on every domain. Pure, so tests/unit/seoRobots.test.ts reads every rule the way a
   crawler does. */
import { PAYMENTS_PAGE_PATHS } from "@/lib/payments/site-pages";

export type RobotsArea = "site" | "dev" | "payments";

export interface RobotsOrigins {
  site: string;
  dev: string;
  payments: string;
}

/* Content signals (https://contentsignals.org): what the content may be used for once fetched.
   They are preferences, not access rules; the Allow and Disallow lines below decide access.
   search: search results and their links and snippets. ai-input: answers an assistant builds from
   the page at query time (retrieval, grounding). ai-train: training or fine-tuning models.

   OWNER DECISION: ai-train. Nothing in the repository states a preference (BRAND.md, CLAUDE.md,
   the docs' /docs/ai page invites assistants to read the docs), so it defaults to "yes": a
   developer product gains when models know its SDK. Set it to "no" here to opt out on all three
   domains. */
const AI_TRAIN: "yes" | "no" = "yes";
export const CONTENT_SIGNAL = `Content-Signal: search=yes, ai-input=yes, ai-train=${AI_TRAIN}`;

/* What every payments page loads to render, and the files crawlers fetch on their own (share
   images, icons, the manifest, the sitemap, llms.txt, security.txt). The domain blocks everything else (payment
   links are personal and short-lived), so without these Google renders the indexable pages without
   their styles and scripts and link previews lose their image. */
const PAYMENTS_RESOURCES = [
  "/_astro/",
  "/fonts/",
  "/media/",
  "/brand/",
  "/embed/",
  "/favicon",
  "/apple-touch-icon.png",
  "/android-chrome-",
  "/og-image.png",
  "/site.webmanifest",
  "/sitemap.xml",
  "/llms.txt",
  "/.well-known/",
];

/** robots.txt for one domain. */
export function robotsTxt(area: RobotsArea, origins: RobotsOrigins): string {
  const { site, dev, payments } = origins;
  switch (area) {
    case "site":
      return `# Cosmos Pay company site. Every page exists once per language (?lang=, src/lib/seo/lang-urls.ts).
User-agent: *
${CONTENT_SIGNAL}
Allow: /

# The web wallet (served by nginx next to this site) is an app, not content.
Disallow: /wallet/

Sitemap: ${site}/sitemap.xml
`;
    case "dev":
      return `# Cosmos Pay developer platform: only the documentation is worth indexing.
User-agent: *
${CONTENT_SIGNAL}
Allow: /docs

Disallow: /login
Disallow: /dashboard
Disallow: /onboarding
Disallow: /invite/
Disallow: /kyc/
Disallow: /swagger
Disallow: /api/

Sitemap: ${dev}/sitemap.xml
Sitemap: ${dev}/docs/sitemap.xml
`;
    case "payments":
      return `# Cosmos Pay payments: the landing and its content pages are content, in every language
# (?lang=, src/lib/seo/lang-urls.ts), with the files they load. Payment links are personal and
# short-lived, and the design previews are samples: everything else stays out.
User-agent: *
${CONTENT_SIGNAL}
Allow: /$
Allow: /?lang=
${PAYMENTS_PAGE_PATHS.map((p) => `Allow: ${p}$\nAllow: ${p}?lang=`).join("\n")}
${PAYMENTS_RESOURCES.map((p) => `Allow: ${p}`).join("\n")}
Disallow: /

Sitemap: ${payments}/sitemap.xml
`;
  }
}
