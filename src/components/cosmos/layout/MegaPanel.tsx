import { IcChevSm } from "@/components/cosmos/icons";

/* Mega-menu dropdown panel for a nav item (columns of links + optional feature). A column's
   name labels its list of links; it is not a document heading, so the page's outline stays
   the page's own. */
export function MegaPanel({ item }: { item: any }) {
  return (
    <div className="mega" onMouseDown={(e) => e.preventDefault()}>
      <div className="mega-cols" style={{ gridTemplateColumns: `repeat(${item.cols.length}, minmax(0,1fr))` }}>
        {item.cols.map((col: any, ci: number) => (
          <div className="mega-col" key={col.head}>
            <p className="mega-head" id={`mega-${item.key}-${ci}`}>{col.head}</p>
            <ul role="list" aria-labelledby={`mega-${item.key}-${ci}`}>
              {col.links.map((l: any) => (<li key={l.t}><a className="mega-link" href={l.href}><span className="t">{l.t}</span><span className="s">{l.s}</span></a></li>))}
            </ul>
          </div>
        ))}
      </div>
      {item.featured && (
        <div className="mega-feat">
          {/* trazo 3 de 3: blanco sobre la miniatura navy, recortado por la caja */}
          <div className="thumb"><span className="trazo-deco trazo-3" aria-hidden="true" /></div>
          <div className="body"><strong>{item.featured.title}</strong><p>{item.featured.desc}</p><a href={item.featured.href}>{item.featured.cta} <IcChevSm /></a></div>
        </div>
      )}
    </div>
  );
}
