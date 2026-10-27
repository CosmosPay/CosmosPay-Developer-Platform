/* Token and network logos as the browser fetches them. The files live in src/assets/logos, not
   public/, so Vite fingerprints each one under /_astro/ and the server sends it with a year-long
   immutable Cache-Control: a browser downloads a logo once and reuses it on every page and every
   time a picker opens. A file under public/ goes out with max-age=0 and is revalidated on each
   load. `no-inline` keeps every logo a file of its own instead of a data URI in this module's
   chunk. The landing's brand files ("/media/brands/...") stay in public/ and keep their path. */
import { networkLogo, tokenLogo } from "@/lib/token-logos";

const BUILT = import.meta.glob<string>("/src/assets/logos/*/*.webp", { eager: true, query: "?no-inline", import: "default" });

function builtUrl(file: string | undefined): string | undefined {
  if (!file) return undefined;
  return file.startsWith("/") ? file : BUILT[`/src/assets/logos/${file}`];
}

export function tokenLogoUrl(symbol: string): string | undefined {
  return builtUrl(tokenLogo(symbol));
}

export function networkLogoUrl(id: string): string | undefined {
  return builtUrl(networkLogo(id));
}
