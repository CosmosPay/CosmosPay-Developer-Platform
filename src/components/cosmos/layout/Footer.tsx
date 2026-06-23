import { useT } from "@/lib/i18n/index";
import { HOME, PRICING, DASH } from "../lib/constants";
import { CosmosMark } from "../icons";

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
    <footer className="footer">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <a className="brand" href={HOME}><CosmosMark size={28} /> Cosmos&nbsp;Pay</a>
            <p>{t.footer.tagline}</p>
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
