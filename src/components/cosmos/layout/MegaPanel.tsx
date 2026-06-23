import { IcChevSm } from "../icons";

/* Mega-menu dropdown panel for a nav item (columns of links + optional feature). */
export function MegaPanel({ item }: { item: any }) {
  return (
    <div className="mega" onMouseDown={(e) => e.preventDefault()}>
      <div className="mega-cols" style={{ gridTemplateColumns: `repeat(${item.cols.length}, minmax(0,1fr))` }}>
        {item.cols.map((col: any) => (
          <div className="mega-col" key={col.head}>
            <h6>{col.head}</h6>
            {col.links.map((l: any) => (<a className="mega-link" href="#" key={l.t}><div className="t">{l.t}</div><div className="s">{l.s}</div></a>))}
          </div>
        ))}
      </div>
      {item.featured && (
        <div className="mega-feat"><div className="thumb" /><div className="body"><strong>{item.featured.title}</strong><p>{item.featured.desc}</p><a href="#">{item.featured.cta} <IcChevSm /></a></div></div>
      )}
    </div>
  );
}
