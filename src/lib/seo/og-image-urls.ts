/* og-image-urls.ts: the share image a page names (og:image, twitter:image and its JSON-LD), as the
   browser and the crawlers fetch it.

   The cards are drawn before `astro build` (npm run og:build, scripts/build-og-images.mjs) into
   src/assets/og (git-ignored), from src/lib/seo/og-images.ts. Living in src/assets, not public/,
   Vite fingerprints each one under /_astro/ and the server sends it with a year-long immutable
   Cache-Control (a file under public/ goes out with max-age=0), so a changed title is a new URL
   and an unchanged one is fetched once. `no-inline` keeps every card a file of its own. Static
   files skip the middleware, so a card answers on every domain; the payments robots.txt allows
   /_astro/ already. Before the cards are drawn (a dev server that never ran og:build) a page has
   none and the layout keeps its fallback. Vite-only (import.meta.glob), like logo-urls.ts. */
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, ogCard, type OgArea } from "@/lib/seo/og-images";

const BUILT = import.meta.glob<string>("/src/assets/og/*/*.png", { eager: true, query: "?no-inline", import: "default" });

/** An image as the share tags state it. */
export interface ShareImage {
  url: string;
  type: string;
  width: number;
  height: number;
  alt: string;
}

/** The card of the indexable page at `path` on `area` in `lang`, at an absolute URL on `origin`;
 *  null when the page has none (not registered, or the cards were not drawn). */
export function pageShareImage(area: OgArea, path: string, lang: string, origin: string): ShareImage | null {
  const card = ogCard(area, path, lang);
  const file = card && BUILT[`/src/assets/og/${card.file}`];
  if (!card || !file) return null;
  return { url: new URL(file, origin).href, type: "image/png", width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: card.alt };
}
