import { useT } from "@/lib/i18n/index";
import { PRICING, DASH, DOCS, TERMS, PAYMENTS, homeFor, localHref, pricingFor, type Area } from "@/components/cosmos/lib/constants";
import { CosmosLockup } from "@/components/cosmos/icons";
import { SocialLinks } from "@/components/cosmos/layout/Social";

/* The footer's links, by catalog group and the label's index in it (labels come from the
   active locale; hrefs are the same in every language). Only links that lead somewhere are
   drawn: a label whose page does not exist yet stays here commented out, so it comes back
   by uncommenting one line once the page ships. */
const FOOT_GROUPS: { key: string; links: { i: number; href: string }[] }[] = [
  {
    key: "products",
    links: [
      { i: 0, href: PAYMENTS }, // Payments
      // { i: 1, href: "#" }, // Stablecoins (no page yet)
      // { i: 2, href: "#" }, // Payouts (no page yet)
      // { i: 3, href: "#" }, // Anchors (no page yet)
      // { i: 4, href: "#" }, // Wallets (no page yet)
      { i: 5, href: `${PAYMENTS}/#integrations` }, // Checkout
      { i: 6, href: `${PAYMENTS}/#integration` }, // Payment Links
      { i: 7, href: PRICING }, // Pricing
    ],
  },
  // Solutions: SaaS & subscriptions, Marketplaces, E-commerce, Platforms, Embedded finance,
  // AI & agents, Enterprise: no pages yet, so the whole group is off.
  // { key: "solutions", links: [] },
  {
    key: "developers",
    links: [
      { i: 0, href: DOCS }, // Documentation
      { i: 1, href: `${DOCS}/api` }, // API reference
      { i: 2, href: `${DOCS}/sdk/server/overview` }, // SDKs & libraries
      { i: 3, href: `${DOCS}/sdk/server/webhooks` }, // Webhooks
      // { i: 4, href: "#" }, // API status (no status page yet)
      // { i: 5, href: "#" }, // Changelog (no public changelog page yet)
      { i: 6, href: DASH }, // Dashboard
    ],
  },
  {
    key: "resources",
    links: [
      { i: 0, href: `${DOCS}/getting-started` }, // Guides
      // { i: 1, href: "#" }, // Blog (no page yet)
      // { i: 2, href: "#" }, // Customer stories (no page yet)
      { i: 3, href: `${DASH}?view=support` }, // Support
      // { i: 4, href: "#" }, // Partners (no page yet)
      // { i: 5, href: "#" }, // Sessions 2026 (no page yet)
    ],
  },
  {
    key: "company",
    links: [
      // { i: 0, href: "#" }, // About (no page yet)
      // { i: 1, href: "#" }, // Careers (no page yet)
      // { i: 2, href: "#" }, // Newsroom (no page yet)
      // { i: 3, href: "#" }, // Security (no page yet)
      { i: 4, href: TERMS }, // Privacy & terms
      // { i: 5, href: "#" }, // Compliance (no page yet)
    ],
  },
];

/* `area` as in Nav: on the payments gateway its own links stay on it. */
export function Footer({ area }: { area?: Area } = {}) {
  const t = useT();
  return (
    <footer className="footer" data-panel="white">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <a className="brand" href={homeFor(area)}><CosmosLockup height={36} /></a>
            <p>{t.footer.tagline}</p>
            <SocialLinks />
            {/* el personaje cierra la pagina, como pide BRAND.md (seccion 5). Pose
                propia: en la landing ya esta el que flota y en el 404 el que piensa. */}
            <img className="foot-astro" src="/brand/astronauta-pulgar.svg" alt="" aria-hidden="true"
                 width="120" height="150" loading="lazy" decoding="async" />
          </div>
          {FOOT_GROUPS.map((g) => {
            const grp = t.footer.groups[g.key];
            return (
              <div className="foot-col" key={g.key}>
                <h5>{grp.title}</h5>
                {g.links.map(({ i, href }) => <a href={href === PRICING ? pricingFor(area) : localHref(href, area)} key={i}>{grp.links[i]}</a>)}
              </div>
            );
          })}
        </div>
        <div className="foot-bottom">
          <span>{t.footer.copyright}</span>
        </div>
      </div>
    </footer>
  );
}
