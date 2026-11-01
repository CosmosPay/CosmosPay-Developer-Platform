/* robots.ts: robots.txt for each domain (one app answers all three, so a static file would say
   the same thing everywhere). src/pages/robots.txt.ts serves it; src/lib/hosts.ts lets the path
   through on every domain. Pure, so tests/unit/seoRobots.test.ts reads every rule the way a
   crawler does. */
import { PAYMENTS_PAGE_PATHS } from "@/lib/payments/site-pages";
import { isIndexNowKey, keyFilePath } from "@/lib/seo/indexnow";
import { markdownPath } from "@/lib/seo/markdown-urls";

/* The payments domain's indexable pages: the home and its content pages. Each is allowed at its
   address and at its Markdown version's (src/lib/seo/markdown-urls.ts), in every language. */
const PAYMENTS_ALLOWED_PAGES = ["/", ...PAYMENTS_PAGE_PATHS].flatMap((path) => [path, markdownPath(path)]);

/** The rules that open one indexable address of the payments domain. `$` anchors the end, so
 *  `/faq` never opens `/faqs` or `/faq/extra`; a `?` after the address opens it with any query
 *  string (every language's `?lang=`, and the `utm_source` an assistant or a newsletter adds to
 *  the link it shares); and its trailing-slash form, with or without a query, is open too, since
 *  it is a 301 to the address that a crawler must be allowed to fetch to follow. The home is `/`
 *  itself. The longest matching rule wins (RFC 9309), so each outranks the final `Disallow: /`. */
export function pageAllowRules(path: string): string[] {
  if (path === "/") return ["/$", "/?"];
  return [`${path}$`, `${path}?`, `${path}/$`, `${path}/?`];
}

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
  "/llms-full.txt",
  "/.well-known/",
];

/** robots.txt for one domain. */
export function robotsTxt(area: RobotsArea, origins: RobotsOrigins, indexNowKey?: string): string {
  const { site, dev, payments } = origins;
  /* The IndexNow key file (INDEXNOW_KEY, src/pages/[key].txt.ts) is how the engines check a
     submission. The payments domain blocks everything it does not name, so it names the file; the
     other two leave it open already. The key is public by design. */
  const keyFile = isIndexNowKey(indexNowKey) ? [`${keyFilePath(indexNowKey)}$`] : [];
  switch (area) {
    case "site":
      return `# Cosmos Pay company site. Every page exists once per language: English at its bare path, the others at ?lang=.
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
# (English at the bare path, the others at ?lang=), each also as Markdown at its address with .md
# (the home's is /index.md), with the files they load. Each is open with any query string (its
# languages, and the tracking parameters a shared link carries) and at its trailing-slash form,
# which redirects to it. Payment links are personal and short-lived, and the design previews are
# samples: everything else stays out.
User-agent: *
${CONTENT_SIGNAL}
${PAYMENTS_ALLOWED_PAGES.flatMap(pageAllowRules).map((rule) => `Allow: ${rule}`).join("\n")}
${[...PAYMENTS_RESOURCES, ...keyFile].map((p) => `Allow: ${p}`).join("\n")}
Disallow: /

Sitemap: ${payments}/sitemap.xml
`;
  }
}
