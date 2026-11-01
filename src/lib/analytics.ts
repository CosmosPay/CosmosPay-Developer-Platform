/* analytics.ts: where Google Analytics (PUBLIC_GA_ID, gtag.js) may run, and what it is told.

   Only on the company site's public pages: the indexable pages of cosmospay.lat
   (src/lib/seo/indexable.ts), whose addresses carry nothing but the page and its language. Never
   on the platform (dev.cosmospay.lat: the dashboard and its search filters, /invite/<token>, the
   KYC returns, onboarding, /swagger, /login), the gateway (payment links, /pay with its URI, the
   private checkouts), a noindex page or any other address that can carry a token, a query or
   personal data. As defence in depth the page view reports the address without its query string
   but `lang` and without its fragment, and the referrer without either, so a parameter added to a
   public address (a campaign tag, a pasted token) never reaches Google. CosmosLayout.astro renders
   the snippet; tests/unit/analytics.test.ts runs it. Pure. */
import { indexablePages } from "@/lib/seo/indexable";

export interface AnalyticsPage {
  /** The measurement id (PUBLIC_GA_ID); empty turns analytics off everywhere. */
  gaId: string | undefined;
  /** The domain the page is served as (src/lib/hosts.ts). */
  area: string | undefined;
  /** The page's public path, without its query. */
  path: string;
  /** Whether the page asks search engines not to index it. */
  noindex: boolean;
}

/** A measurement id as Google issues them (G-XXXXXXXXXX); anything else is never written into a script. */
const GA_ID = /^G-[A-Z0-9]{4,20}$/;

/** Whether the page loads Google Analytics: an indexable page of the company site, with a valid id. */
export function analyticsEnabled({ gaId, area, path, noindex }: AnalyticsPage): boolean {
  if (!gaId || !GA_ID.test(gaId) || area !== "site" || noindex) return false;
  return indexablePages("site").some((page) => page.path === path);
}

/**
 * The inline script that queues the page view at once and fetches gtag.js once the page has loaded
 * and the browser is idle (about 150 KB, never competing with the first screen). The page view
 * names the address as `page_location` (and its path and query as `page_path`) with `lang` as the
 * only query parameter and no fragment, and the referrer with neither. ES5, as it runs before any
 * bundle. Null for an id that is not one.
 */
export function analyticsSnippet(gaId: string): string | null {
  if (!GA_ID.test(gaId)) return null;
  return [
    "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}",
    "(function(){",
    "var u=new URL(location.href),l=u.searchParams.get('lang');",
    "u.search=l?'?lang='+encodeURIComponent(l):'';u.hash='';",
    "var r='';try{if(document.referrer){var f=new URL(document.referrer);f.search='';f.hash='';r=f.href;}}catch(e){}",
    "gtag('js',new Date());",
    `gtag('config','${gaId}',{page_location:u.href,page_path:u.pathname+u.search,page_referrer:r});`,
    `function load(){var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${gaId}';document.head.appendChild(s);}`,
    "function idle(){if('requestIdleCallback' in window)requestIdleCallback(load,{timeout:3000});else setTimeout(load,1);}",
    "if(document.readyState==='complete')idle();else window.addEventListener('load',idle,{once:true});",
    "})();",
  ].join("");
}
