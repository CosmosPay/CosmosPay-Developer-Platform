/* Pricing.jsx — Cosmos Pay pricing page. Copy resolved through the i18n catalog (useT). */
import { useState } from "react";
import { Nav, Footer, useTheme, useReveal } from "@/components/cosmos/shared";
import { initLang } from "@/lib/i18n/index";
import {
  PricingHero, PlansSection, CompareSection, FaqSection, PricingCta,
} from "@/components/cosmos/pricing/index";

export default function Pricing({ user = null, lang }) {
  initLang(lang);
  const [theme, setTheme] = useTheme();
  const [billing, setBilling] = useState("monthly");
  useReveal();
  return (
    <>
      <Nav theme={theme} setTheme={setTheme} user={user} />
      <main>
        <PricingHero billing={billing} setBilling={setBilling} />
        <PlansSection user={user} billing={billing} />
        <CompareSection />
        <FaqSection />
        <PricingCta user={user} />
      </main>
      <Footer />
    </>
  );
}
