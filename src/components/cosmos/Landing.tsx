/* Landing.jsx — Cosmos Pay Developer Platform marketing landing.
   Ported from the Design bundle; all copy resolved through the i18n catalog (useT).
   Thin root: section components live under ./marketing. */
import { Nav, Footer, useTheme, useReveal } from "@/components/cosmos/shared";
import { initLang } from "@/lib/i18n/index";
import {
  Hero, ApiSection, IntegrationPaths, Solutions, Stats,
  CustomerStories, Testimonials, Resources, Cta,
} from "./marketing";

/* ---------------- root ---------------- */
export default function Landing({ user = null, lang }) {
  initLang(lang);
  const [theme, setTheme] = useTheme();
  useReveal();
  return (
    <>
      <Nav theme={theme} setTheme={setTheme} user={user} />
      <main id="main">
        <Hero user={user} />
        <ApiSection />
        <IntegrationPaths />
        <Solutions user={user} />
        <Stats />
        <CustomerStories />
        <Testimonials />
        <Resources />
        <Cta user={user} />
      </main>
      <Footer />
    </>
  );
}
