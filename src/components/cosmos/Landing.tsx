/* Landing.jsx — Cosmos Pay Developer Platform marketing landing.
   Ported from the Design bundle; all copy resolved through the i18n catalog (useT).
   Thin root: section components live under ./marketing. */
import { Nav, Footer, useTheme, useReveal } from "@/components/cosmos/shared";
import { initLang } from "@/lib/i18n/index";
import {
  Hero, WalletSection, DevKit, ApiSection, IntegrationPaths, Solutions, Stats,
  CustomerStories, Testimonials, Resources, Marketplace, Cta,
} from "./marketing";

/* ---------------- root ---------------- */
export default function Landing({ user = null, lang }) {
  initLang(lang);
  const [theme, setTheme] = useTheme();
  useReveal();
  return (
    <>
      {/* la barra hereda el color del primer panel: al pasar la wallet arriba
          el panel de entrada es blanco, y con overPanel="black" los links
          quedaban blancos sobre blanco. */}
      <Nav theme={theme} setTheme={setTheme} user={user} overPanel="white" />
      <main id="main">
        {/* La wallet es lo primero que se ve, sin scrollear: quien entra a
            cosmospay.lat viene a conseguirla, no a leer sobre la API. El hero
            de desarrolladores baja a la zona tecnica, pegado al SDK, que es
            donde ese mensaje tiene sentido. */}
        <WalletSection />
        <Hero user={user} />
        <DevKit />
        <ApiSection />
        <IntegrationPaths />
        <Solutions user={user} />
        <Stats />
        <CustomerStories />
        <Testimonials />
        <Resources />
        <Marketplace />
        <Cta user={user} />
      </main>
      <Footer />
    </>
  );
}
