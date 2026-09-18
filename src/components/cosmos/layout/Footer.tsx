import { useT } from "@/lib/i18n/index";
import { HOME, PRICING, DASH } from "@/components/cosmos/lib/constants";
import { CosmosLockup } from "@/components/cosmos/icons";

/* Hrefs are kept here (aligned by index to the catalog link order); labels come
   from the active locale. Most links are placeholders (#); two point to real routes. */
const FOOT_GROUPS = [
  { key: "products", href: ["#", "#", "#", "#", "#", "#", "#", PRICING] },
  { key: "solutions", href: ["#", "#", "#", "#", "#", "#", "#"] },
  { key: "developers", href: ["#", "#", "#", "#", "#", "#", DASH] },
  { key: "resources", href: ["#", "#", "#", "#", "#", "#"] },
  { key: "company", href: ["#", "#", "#", "#", "#", "#"] },
];

export function Footer() {
  const t = useT();
  return (
    <footer className="footer" data-panel="white">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <a className="brand" href={HOME}><CosmosLockup height={36} /></a>
            <p>{t.footer.tagline}</p>
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
                {grp.links.map((label: string, i: number) => <a href={g.href[i] || "#"} key={label + i}>{label}</a>)}
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
