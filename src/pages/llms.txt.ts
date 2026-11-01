import type { APIRoute } from "astro";
import { DEV, PAYMENTS, SITE, SOCIAL } from "@/components/cosmos/lib/constants";
import { WALLET_LINKS } from "@/components/cosmos/marketing/data";
import { paymentsLlmsTxt, siteLlmsTxt, type LlmsInput } from "@/lib/seo/llms";
import { chromeStoreListing } from "@/lib/seo/schema";

/* /llms.txt per domain (src/lib/seo/llms.ts): the company's fact sheet on cosmospay.lat, the
   gateway's on payments.cosmospay.lat. The platform's index of its documentation is
   /docs/llms.txt, so there this answers a redirect to it. src/lib/hosts.ts lets the path through
   on every domain. */
const INPUT: LlmsInput = {
  site: SITE,
  dev: DEV,
  payments: PAYMENTS,
  wallet: { webApp: WALLET_LINKS.webapp, chromeStore: chromeStoreListing(WALLET_LINKS.chrome) },
  profiles: { LinkedIn: SOCIAL.linkedin, X: SOCIAL.x, Instagram: SOCIAL.instagram, Discord: SOCIAL.discord },
};

export const GET: APIRoute = ({ locals }) => {
  const area = locals.area ?? "dev";
  if (area === "dev") return new Response(null, { status: 301, headers: { Location: `${DEV}/docs/llms.txt` } });
  return new Response(area === "payments" ? paymentsLlmsTxt(INPUT) : siteLlmsTxt(INPUT), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
};
