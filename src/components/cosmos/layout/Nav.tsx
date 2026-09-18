import { useState, useEffect, useRef } from "react";
import { useT } from "@/lib/i18n/index";
import type { Theme, SetTheme, User } from "@/components/cosmos/lib/types";
import { HOME, PRICING, DASH, DOCS } from "@/components/cosmos/lib/constants";
import { startLogin, startLogout } from "@/components/cosmos/lib/auth";
import { CosmosLockup, IcNChev, IcDocs } from "@/components/cosmos/icons";
import { ThemeToggle } from "./ThemeToggle";
import { LangSelect } from "./LangSelect";
import { NavUserMenu } from "./NavUserMenu";
import { MegaPanel } from "./MegaPanel";
import { Avatar } from "@/components/cosmos/ui/Avatar";

/* Deep links into the docs site (served at /docs) for the mega-menu columns. The message
   catalogs only carry translated labels, not hrefs, so the targets are defined here once
   (they're identical in every language) and overlaid onto the catalog by position. Keyed by
   nav item → column index → link index; a missing entry leaves that link's own href intact. */
const NAV_DOC_HREFS: Record<string, Record<number, (string | undefined)[]>> = {
  developers: { 0: ["/docs/api", "/docs/sdk/server/overview", "/docs/sdk/server/webhooks", "/docs/getting-started"] },
  resources: { 0: ["/docs", "/docs/getting-started"] },
};

/* Overlay the doc hrefs above onto an item's columns without mutating the catalog. */
function withDocHrefs(item: any): any {
  const map = NAV_DOC_HREFS[item.key];
  if (!map || !item.cols) return item;
  return {
    ...item,
    cols: item.cols.map((col: any, ci: number) => {
      const hrefs = map[ci];
      if (!hrefs) return col;
      return { ...col, links: col.links.map((l: any, li: number) => (l.href || !hrefs[li] ? l : { ...l, href: hrefs[li] })) };
    }),
  };
}

/* Build the nav item list from the active catalog. */
function useNavItems(): any[] {
  const t = useT();
  const n = t.nav.items;
  return [
    { key: "products", label: n.products.label, cols: n.products.cols, featured: n.products.featured },
    { key: "solutions", label: n.solutions.label, cols: n.solutions.cols, featured: n.solutions.featured },
    withDocHrefs({ key: "developers", label: n.developers.label, cols: n.developers.cols, featured: n.developers.featured }),
    withDocHrefs({ key: "resources", label: n.resources.label, cols: n.resources.cols, featured: n.resources.featured }),
    { key: "pricing", label: n.pricing.label, href: PRICING },
  ];
}

export function Nav({ theme, setTheme, user = null, overPanel }: { theme: Theme; setTheme: SetTheme; user?: User | null; overPanel?: "black" }) {
  const t = useT();
  const NAV_ITEMS = useNavItems();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [mob, setMob] = useState(false);
  /* Sobre el hero negro la barra va transparente y con tinta blanca. El estado
     arranca en true cuando la pagina la pasa, asi el SSR ya pinta la barra
     transparente y no hay parpadeo al hidratar. */
  const [overInk, setOverInk] = useState(!!overPanel);
  /* Gate the session buttons until after hydration so they render once in the
     resolved language + auth state, instead of flashing through default →
     translated → signed-in variants on first load. */
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const h = () => {
      setScrolled(window.scrollY > 8);
      setActive(null);
      const hero = document.querySelector<HTMLElement>(".hero");
      setOverInk(!!overPanel && !!hero && window.scrollY < hero.offsetHeight - 72);
    };
    h();
    window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h);
  }, [overPanel]);
  useEffect(() => { setReady(true); }, []);
  const open = (k: string | null) => { if (timer.current) clearTimeout(timer.current); setActive(k); };
  const scheduleClose = () => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setActive(null), 150); };
  const activeItem = NAV_ITEMS.find((i) => i.key === active && i.cols);
  /* con el menu mobile abierto la barra deja de ser transparente: el panel
     que baja es solido y necesita el borde de la barra */
  const inkNow = overInk && !mob;
  return (
    <header className={`nav${scrolled ? " scrolled" : ""}${inkNow ? " over-ink" : ""}`}>
      <div className="wrap nav-inner">
        <a className="brand" href={HOME}><CosmosLockup height={32} label="Cosmos Pay" /></a>
        <nav className="nav-center" onMouseLeave={scheduleClose}>
          {NAV_ITEMS.map((it) => it.cols ? (
            <div className="nav-item" key={it.key} onMouseEnter={() => open(it.key)}>
              <button className={`nav-trigger${active === it.key ? " on" : ""}`} onClick={() => setActive((a) => a === it.key ? null : it.key)}>{it.label}<IcNChev /></button>
            </div>
          ) : (
            <a className="nav-trigger" href={it.href} key={it.key} onMouseEnter={() => open(null)}>{it.label}</a>
          ))}
          {activeItem && (<div className="mega-wrap" onMouseEnter={() => open(activeItem.key)} onMouseLeave={scheduleClose}><MegaPanel item={activeItem} /></div>)}
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
          <button className="nav-burger" aria-label={t.nav.menu} onClick={() => setMob((m) => !m)}>
            {mob ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg> : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>}
          </button>
        </div>
      </div>
      {mob && (
        <div className="mobile-menu">
          {NAV_ITEMS.map((it) => <a key={it.key} className="mm-link" href={it.href || "#"} onClick={() => setMob(false)}>{it.label}</a>)}
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
        </div>
      )}
    </header>
  );
}
