/* SiteFooter.tsx — the site footer for Astro pages, rendered on the server only (no client
   directive): it has nothing interactive, so it ships no JavaScript. */
import { initLang } from "@/lib/i18n/index";
import { Footer } from "@/components/cosmos/layout/Footer";
import type { Area } from "@/components/cosmos/lib/constants";

export default function SiteFooter({ lang, area }: { lang?: string; area?: Area }) {
  initLang(lang);
  return <Footer area={area} />;
}
