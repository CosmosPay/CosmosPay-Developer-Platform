import type { APIRoute } from "astro";
import { DEV, PAYMENTS, SITE } from "@/components/cosmos/lib/constants";

/* robots.txt per domain (one app answers all three, so a static file would say the same
   thing everywhere). src/lib/hosts.ts lets this path through on every domain. */
const ROBOTS = {
  site: `# Cosmos Pay company site
User-agent: *
Allow: /

# The web wallet (served by nginx next to this site) is an app, not content.
Disallow: /wallet/

Sitemap: ${SITE}/sitemap.xml
`,
  dev: `# Cosmos Pay developer platform: only the documentation is worth indexing.
User-agent: *
Allow: /docs

Disallow: /login
Disallow: /dashboard
Disallow: /onboarding
Disallow: /invite/
Disallow: /kyc/
Disallow: /swagger
Disallow: /api/

Sitemap: ${DEV}/sitemap.xml
`,
  payments: `# Cosmos Pay payments: only the landing is content. Payment links are personal and
# short-lived, and the design previews are samples.
User-agent: *
Allow: /$
Disallow: /

Sitemap: ${PAYMENTS}/sitemap.xml
`,
};

export const GET: APIRoute = ({ locals }) =>
  new Response(ROBOTS[locals.area ?? "dev"], {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
