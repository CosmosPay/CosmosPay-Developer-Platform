/* og-images.ts: the share card (Open Graph and Twitter image) of every indexable page of the
   company site and the gateway, in every language the page is written in: what each card says
   and the file it is rendered to. Read by the build step that draws them
   (scripts/build-og-images.mjs, through src/lib/og/render.ts), by the layouts that name them
   (src/lib/seo/og-image-urls.ts) and by tests/unit/ogImages.test.ts.

   A card carries the page's own title, the h1 it shows in that language (the same words its
   Markdown version opens with, src/lib/seo/page-markdown.ts, which the test checks), the brand's
   lockup, the host's short label and the host. The pages come from the registry the sitemap reads
   (src/lib/seo/indexable.ts), so a page added there gets its card in every language. Pure. */
import { messages } from "@/lib/i18n/messages/index";
import { LANDING, fillPageCopy, type CopyPage } from "@/lib/payments/landing-i18n";
import { LEARN, guideCopy } from "@/lib/payments/learn/index";
import { guideOf } from "@/lib/payments/site-pages";
import { termsText } from "@/lib/site/terms";
import { indexablePages, type IndexableArea } from "@/lib/seo/indexable";
import type { Locale } from "@/lib/payments/i18n";

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export type OgArea = IndexableArea;

/** The hosts as the cards print them (the configured origins; production by default). */
export interface OgHosts {
  site: string;
  payments: string;
}

const PRODUCTION: OgHosts = { site: "https://cosmospay.lat", payments: "https://payments.cosmospay.lat" };

/** One page's card in one language. */
export interface OgCard {
  area: OgArea;
  path: string;
  lang: string;
  /** The page's h1 in that language; a "\n" is a line break the page draws too (the home's hero). */
  title: string;
  /** Words of the title the card highlights as the page does (the gateway home's hero). */
  mark?: string;
  /** What the lockup is followed by: the gateway's name after "Cosmos Pay" ("Payments"). The
   *  company site's lockup stands alone. */
  label?: string;
  /** The host the footer names. */
  host: string;
  /** Where the PNG is written, under src/assets/og/: `payments/learn-accept-usdc-payments.es.png`. */
  file: string;
  /** og:image:alt and twitter:image:alt: what the card shows, in the page's language. */
  alt: string;
}

/** The name each host goes by (the brand's lockup reads "Cosmos Pay"; the label adds the rest). */
const NAMES: Record<OgArea, { name: string; label?: string }> = {
  site: { name: "Cosmos Pay" },
  payments: { name: "Cosmos Pay Payments", label: "Payments" },
};

/* Chinese runs its words together: the space between two pieces of a title joined in the code
   (the hero's two halves) is not part of the text. Spaces next to Latin words stay. */
const CJK = "\\p{Script=Han}\\u3000-\\u303f\\uff00-\\uffef";
const CJK_SPACE = new RegExp(`(?<=[${CJK}]) +(?=[${CJK}])`, "gu");
const tight = (text: string): string => text.replace(CJK_SPACE, "");

/* The landing's highlighter covers the words; a closing stop stays outside it
   (src/lib/payments/landing-content.ts `marked`). */
function marked(text: string): { words: string; stop: string } {
  const [, words = text, stop = ""] = text.match(/^(.*?)([.!?。！？।]*)$/) ?? [];
  return { words, stop };
}

/** A gateway page's catalog key under `pages`: `use-cases` → `useCases`. */
const copyKey = (page: string): CopyPage => page.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()) as CopyPage;

/** The h1 a page shows in `lang` (and the words its hero highlights), or null for a page that is
 *  not one of the registry's. */
function heading(area: OgArea, path: string, lang: string): { title: string; mark?: string } | null {
  if (area === "site") {
    const c = (messages as Record<string, (typeof messages)["en"]>)[lang] ?? messages.en;
    if (path === "/") return { title: c.landing.wallet.title };
    if (path === "/pricing") return { title: c.pricing.title };
    if (path === "/about") return { title: c.about.title };
    if (path === "/tos") return { title: termsText(lang).title };
    return null;
  }
  const t = LANDING[lang as Locale] ?? LANDING.en;
  if (path === "/") {
    // Hero.astro: "{titleA} <mark>{words}</mark>{stop}" over "{titleB}", two lines.
    const mark = marked(t.hero.titleMark);
    return { title: tight(`${t.hero.titleA} ${mark.words}${mark.stop}\n${t.hero.titleB}`), mark: tight(mark.words) };
  }
  const page = path.slice(1);
  const learn = LEARN[lang as Locale] ?? LEARN.en;
  if (page === "learn") return { title: learn.hub.title };
  const guide = guideOf(page);
  if (guide) return { title: guideCopy(learn, guide).title };
  const copy = (t.pages as Record<string, { title?: string }>)[copyKey(page)];
  return copy?.title ? { title: fillPageCopy(copy.title) } : null;
}

/** The file a page's card is written to, under src/assets/og/. */
export function ogFile(area: OgArea, path: string, lang: string): string {
  const slug = path === "/" ? "home" : path.slice(1).replace(/\//g, "-");
  return `${area}/${slug}.${lang}.png`;
}

/** The card of the indexable page at `path` on `area` in `lang`; null when the page is not
 *  registered or not written in that language (its English version's card stands for it). */
export function ogCard(area: OgArea, path: string, lang: string, hosts: OgHosts = PRODUCTION): OgCard | null {
  const page = indexablePages(area).find((p) => p.path === path);
  if (!page || !page.langs.includes(lang)) return null;
  const head = heading(area, path, lang);
  if (!head) return null;
  const { name, label } = NAMES[area];
  return {
    area,
    path,
    lang,
    ...head,
    ...(label && { label }),
    host: new URL(hosts[area]).host,
    file: ogFile(area, path, lang),
    alt: `${name}: ${head.title.replace(/\s*\n\s*/g, " ")}`,
  };
}

/** Every card: each indexable page of both hosts in every language it is written in. */
export function ogCards(hosts: OgHosts = PRODUCTION): OgCard[] {
  return (["site", "payments"] as const).flatMap((area) =>
    indexablePages(area).flatMap((page) => page.langs.map((lang) => ogCard(area, page.path, lang, hosts)).filter((card): card is OgCard => card !== null)),
  );
}
