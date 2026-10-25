import { useState, useEffect, useRef, type FocusEvent } from "react";
import { useT } from "@/lib/i18n/index";
import type { Theme, SetTheme, User } from "@/components/cosmos/lib/types";
import { DASH, DOCS, PAYMENTS, homeFor, localHref, pricingFor, type Area } from "@/components/cosmos/lib/constants";
import { startLogin, startLogout } from "@/components/cosmos/lib/auth";
import { CosmosLockup, IcNChev, IcDocs } from "@/components/cosmos/icons";
import { ThemeToggle } from "@/components/cosmos/layout/ThemeToggle";
import { LangSelect } from "@/components/cosmos/layout/LangSelect";
import { NavUserMenu } from "@/components/cosmos/layout/NavUserMenu";
import { MegaPanel } from "@/components/cosmos/layout/MegaPanel";
import { Avatar } from "@/components/cosmos/ui/Avatar";

/* The mega-menu links that lead somewhere: nav item → [column, link index in the catalog,
   href]. The catalogs carry the labels (same shape in every language); the targets live
   here once. Only these are drawn; a label whose page does not exist yet stays listed
   below, commented out, and comes back by uncommenting its line. A column left with no
   link is not drawn, nor is an item left with no column. */
type NavLink = [col: number, link: number, href: string];
const NAV_LINKS: Record<string, NavLink[]> = {
  products: [
    [0, 0, PAYMENTS], // Payments
    [0, 1, `${PAYMENTS}/integrations`], // Checkout
    [0, 2, `${PAYMENTS}/integrations`], // Payment Links
    // [0, 3, "#"], // Invoicing (no page yet)
    // [1, 0, "#"], // Payouts (no page yet)
    // [1, 1, "#"], // Cross-border (no page yet)
    // [1, 2, "#"], // Anchors (no page yet)
    // [1, 3, "#"], // FX (no page yet)
    // [2, 0, "#"], // Stablecoins (no page yet)
    // [2, 1, "#"], // Wallets (no page yet)
    // [2, 2, "#"], // Ledger (no page yet)
    // [2, 3, "#"], // Radar (no page yet)
  ],
  // Solutions: every link (SaaS & subscriptions, Marketplaces, Platforms, Embedded finance,
  // E-commerce, Fintech, Gaming, Travel & mobility) has no page yet, so the item is off.
  // solutions: [],
  developers: [
    [0, 0, `${DOCS}/api`], // API reference
    [0, 1, `${DOCS}/sdk/server/overview`], // SDKs & libraries
    [0, 2, `${DOCS}/sdk/server/webhooks`], // Webhooks
    [0, 3, `${DOCS}/getting-started`], // Sandbox
    // [1, 0, "#"], // CLI (no page yet)
    // [1, 1, "#"], // Status (no status page yet)
    // [1, 2, "#"], // Changelog (no public changelog page yet)
    // [1, 3, "#"], // Postman (no collection published yet)
  ],
  resources: [
    [0, 0, DOCS], // Documentation
    [0, 1, `${DOCS}/getting-started`], // Tutorials
    // [0, 2, "#"], // Blog (no page yet)
    // [0, 3, "#"], // Customer stories (no page yet)
    // [1, 0, "#"], // Help center (no page yet)
    // [1, 1, "#"], // Community (no page yet)
    // [1, 2, "#"], // Contact sales (no page yet)
    // [1, 3, "#"], // Partners (no page yet)
  ],
};
/* The featured card of an item, only where its call to action leads somewhere. */
const FEATURED_HREFS: Record<string, string> = {
  // products: "#", // Cosmos Sessions 2026 (no page yet)
  developers: `${DOCS}/getting-started`, // Quickstart
};

/* An item's columns reduced to the links above, hrefs attached (kept on the gateway when the
   bar is drawn there), empty columns dropped. */
function withLinks(key: string, item: any, area?: Area): any {
  const links = NAV_LINKS[key] || [];
  const cols = item.cols
    .map((col: any, ci: number) => ({
      ...col,
      links: links.filter(([c]) => c === ci).map(([, li, href]) => ({ ...col.links[li], href: localHref(href, area) })),
    }))
    .filter((col: any) => col.links.length > 0);
  const featured = FEATURED_HREFS[key] && item.featured ? { ...item.featured, href: localHref(FEATURED_HREFS[key], area) } : undefined;
  return { key, label: item.label, cols, featured };
}

/* Build the nav item list from the active catalog. */
function useNavItems(area?: Area): any[] {
  const t = useT();
  const n = t.nav.items;
  return [
    withLinks("products", n.products, area),
    // withLinks("solutions", n.solutions, area), // see NAV_LINKS
    withLinks("developers", n.developers, area),
    withLinks("resources", n.resources, area),
    { key: "pricing", label: n.pricing.label, href: pricingFor(area) },
  ];
}

/* `area` is the domain the bar is drawn on: on the payments gateway the logo, Pricing and the
   product links stay on it (constants.ts, localHref). */
/* `inDash`: the bar inside the dashboard's frame (Dashboard.tsx), restyled to its reference: it
   spans the content column only, and the logo lives in the sidebar instead (dashboard.css). */
export function Nav({ theme, setTheme, user = null, sessionReady = true, overPanel, area, inDash = false }: { theme: Theme; setTheme: SetTheme; user?: User | null; sessionReady?: boolean; overPanel?: "black" | "white"; area?: Area; inDash?: boolean }) {
  const t = useT();
  const NAV_ITEMS = useNavItems(area);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [mob, setMob] = useState(false);
  /* Sobre el hero negro la barra va transparente y con tinta blanca. El estado
     arranca en true cuando la pagina la pasa, asi el SSR ya pinta la barra
     transparente y no hay parpadeo al hidratar. */
  const [overInk, setOverInk] = useState(!!overPanel);
  /* Over a "paper" panel (light in both themes, like the payments hero behind its video)
     the bar is transparent and takes dark ink, so a dark page does not lay a black band
     across the top of a white hero. */
  const [overPaper, setOverPaper] = useState(false);
  /* Gate the session buttons until after hydration AND until the session is known
     (sessionReady: the company site reads it cross-origin), so they render once in the
     resolved language + auth state, instead of flashing through default → translated →
     signed-in variants on first load. */
  const [hydrated, setHydrated] = useState(false);
  const ready = hydrated && sessionReady;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const h = () => {
      setScrolled(window.scrollY > 8);
      setActive(null);
      /* La barra se vuelve transparente y toma tinta clara solo mientras esta
         sobre un panel oscuro. Antes miraba ".hero" dando por sentado que el
         hero era la primera seccion; cuando la wallet paso arriba el hero dejo
         de estar primero y la barra quedaba blanca sobre un panel blanco, o
         sea invisible. Ahora pregunta por el panel que realmente tiene debajo. */
      const first = document.querySelector<HTMLElement>("main section[data-panel]");
      const panel = first?.dataset.panel;
      const oscuro = panel === "black" || panel === "navy";
      const above = !!overPanel && !!first && window.scrollY < first.offsetHeight - 72;
      setOverInk(above && oscuro);
      setOverPaper(above && panel === "paper");
    };
    h();
    window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h);
  }, [overPanel]);
  useEffect(() => { setHydrated(true); }, []);
  const burger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);
  /* Escape closes an open mega panel and gives focus back to its trigger. */
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      document.querySelector<HTMLElement>(`[aria-controls="mega-${active}"]`)?.focus();
      setActive(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);
  /* The mobile menu covers the page, so while it is open the page behind neither scrolls nor
     takes focus (inert), focus moves into the menu, and Escape or a desktop-wide window closes
     it, focus going back to the burger. */
  useEffect(() => {
    if (!mob) return;
    const header = burger.current?.closest("header");
    const behind = [...document.body.children].filter((el) => header && !el.contains(header) && el.tagName !== "SCRIPT");
    behind.forEach((el) => el.setAttribute("inert", ""));
    document.documentElement.classList.add("nav-locked");
    menu.current?.querySelector<HTMLElement>("a[href], button")?.focus();
    const close = () => { setMob(false); burger.current?.focus(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const wide = window.matchMedia("(min-width: 1101px)");
    const onWide = () => { if (wide.matches) setMob(false); };
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      behind.forEach((el) => el.removeAttribute("inert"));
      document.documentElement.classList.remove("nav-locked");
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [mob]);
  const open = (k: string | null) => { if (timer.current) clearTimeout(timer.current); setActive(k); };
  const scheduleClose = () => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setActive(null), 150); };
  /* Tabbing out of an item closes its panel. */
  const closeOnBlur = (e: FocusEvent<HTMLElement>) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setActive(null); };
  /* con el menu mobile abierto la barra deja de ser transparente: el panel
     que baja es solido y necesita el borde de la barra */
  const inkNow = overInk && !mob;
  /* Transparent over paper only at the very top: once the page moves, the hero's copy would
     scroll under the links, so the bar takes its own background back. */
  const paperNow = overPaper && !mob && !scrolled;
  return (
    <header className={`nav${inDash ? " nav-dash" : ""}${scrolled ? " scrolled" : ""}${mob ? " menu-open" : ""}${inkNow ? " over-ink" : ""}${paperNow ? " over-paper" : ""}`}>
      <div className="wrap nav-inner">
        <a className="brand" href={homeFor(area)}><CosmosLockup height={32} label="Cosmos Pay" /></a>
        {/* Every panel is in the page from the first render, hidden until its trigger opens it,
            so its links are crawlable and the trigger has a panel to point at (aria-controls);
            each sits right after its trigger, so Tab goes from the trigger into its links. */}
        <nav className="nav-center" aria-label={t.nav.main} onMouseLeave={scheduleClose}>
          {NAV_ITEMS.map((it) => it.cols ? (
            <div className="nav-item" key={it.key} onMouseEnter={() => open(it.key)} onBlur={closeOnBlur}>
              <button type="button" className={`nav-trigger${active === it.key ? " on" : ""}`} aria-expanded={active === it.key} aria-controls={`mega-${it.key}`} onClick={() => setActive((a) => a === it.key ? null : it.key)}>{it.label}<IcNChev /></button>
              <div className="mega-wrap" id={`mega-${it.key}`} hidden={active !== it.key} onMouseEnter={() => open(it.key)} onMouseLeave={scheduleClose}><MegaPanel item={it} /></div>
            </div>
          ) : (
            <a className="nav-trigger" href={it.href} key={it.key} onMouseEnter={() => open(null)}>{it.label}</a>
          ))}
        </nav>
        <div className="nav-right">
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <a className="theme-btn docs-btn" href={DOCS} aria-label={t.nav.docs} title={t.nav.docs}><IcDocs /></a>
          <LangSelect />
          {!ready ? (
            <div className="nav-session-skel" aria-hidden="true">
              <span className="btn-skel btn-skel-link" />
              <span className="btn-skel btn-skel-cta" />
            </div>
          ) : user ? (
            <>
              <a className="btn btn-dark btn-sm getkeys" href={DASH}>{t.nav.dashboard}</a>
              <NavUserMenu user={user} />
            </>
          ) : (
            <>
              <button type="button" className="link-login as-link" onClick={() => startLogin()}>{t.nav.login}</button>
              <button type="button" className="btn btn-dark btn-sm getkeys" onClick={() => startLogin()}>{t.nav.getKeys}</button>
            </>
          )}
          <button type="button" ref={burger} className="nav-burger" aria-label={mob ? t.nav.closeMenu : t.nav.menu} aria-expanded={mob} aria-controls="nav-mobile-menu" onClick={() => setMob((m) => !m)}>
            {mob ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg> : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>}
          </button>
        </div>
      </div>
      {/* Always in the page (hidden while closed), so the burger always points at it. */}
      <nav className="mobile-menu" id="nav-mobile-menu" ref={menu} aria-label={t.nav.menu} hidden={!mob}>
        {/* A mega item has no page of its own: on mobile it is a heading over its list of links. */}
        {NAV_ITEMS.map((it) => it.cols ? (
          <div className="mm-group" key={it.key}>
            <p className="mm-head" id={`mm-${it.key}`}>{it.label}</p>
            <ul role="list" aria-labelledby={`mm-${it.key}`}>
              {it.cols.flatMap((col: any) => col.links).map((l: any) => (
                <li key={l.t}><a className="mm-sublink" href={l.href} onClick={() => setMob(false)}>{l.t}</a></li>
              ))}
            </ul>
          </div>
        ) : (
          <a key={it.key} className="mm-link" href={it.href} onClick={() => setMob(false)}>{it.label}</a>
        ))}
        {/* Por debajo de 1100px el CSS esconde el selector de la barra y deja
            solo la hamburguesa, pero el menu no lo repetia: en celular no
            habia ninguna forma de cambiar el idioma. */}
        <div className="mm-lang"><LangSelect /></div>
        <div className="mm-actions">
          {user ? (
            <>
              <div className="mm-user"><Avatar user={user} size={34} /><div className="nav-user-id"><b>{user.name || "Account"}</b>{user.email && <span>{user.email}</span>}</div></div>
              <a className="btn btn-dark" href={DASH}>{t.nav.dashboard}</a>
              <button type="button" className="link-login as-link mm-login" onClick={() => startLogout()}>{t.profile.logout}</button>
            </>
          ) : (
            <>
              <button type="button" className="link-login as-link mm-login" onClick={() => startLogin()}>{t.nav.login}</button>
              <button type="button" className="btn btn-dark" onClick={() => startLogin()}>{t.nav.getKeys}</button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
