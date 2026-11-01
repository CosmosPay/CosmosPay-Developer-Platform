/* SiteNav.tsx: the general navigation bar as an island of its own. Every view on the three
   domains carries the same bar: CosmosLayout and PaymentsLayout render this one, and the
   React pages that own the whole document (Landing, Pricing, Dashboard, PaymentsLanding)
   render <Nav> themselves with the same props. */
import { useEffect, useRef } from "react";
import { initLang, useLang } from "@/lib/i18n/index";
import { langSearch } from "@/lib/seo/lang-urls";
import { useTheme } from "@/components/cosmos/hooks/useTheme";
import { useDevSession } from "@/components/cosmos/lib/auth";
import { Nav } from "@/components/cosmos/layout/Nav";
import type { User } from "@/components/cosmos/lib/types";
import type { Area } from "@/components/cosmos/lib/constants";

interface Props {
  lang?: string;
  /** The signed-in developer when the server knows it (pages on the platform's own host). */
  user?: User | null;
  /** Read the platform session. Off on the payments domain, which may not read it. */
  session?: boolean;
  /** The page's copy is rendered on the server: a new language reloads it in that language. */
  reloadOnLang?: boolean;
  overPanel?: "black" | "white";
  /** The domain the bar is drawn on; on "payments" the gateway's links stay on it. */
  area?: Area;
}

export default function SiteNav({ lang, user = null, session = true, reloadOnLang = false, overPanel, area }: Props) {
  initLang(lang);
  const [theme, setTheme] = useTheme();
  const dev = useDevSession(user, session);
  const current = useLang();
  const initial = useRef(current);
  useEffect(() => {
    if (!reloadOnLang || current === initial.current) return;
    // The cookie is already set (setLang). The address names the language too: an indexable
    // page's English version is its bare path and every other one ?lang=<code>
    // (src/lib/seo/lang-urls.ts); the rest of the query is kept byte for byte (/pay?uri=…).
    const { pathname, search, hash } = window.location;
    window.location.replace(`${pathname}${langSearch(search, current)}${hash}`);
  }, [current, reloadOnLang]);
  return <Nav theme={theme} setTheme={setTheme} user={dev.user} sessionReady={dev.ready} overPanel={overPanel} area={area} />;
}
