/* Solutions.tsx: /03 del deck, el bento de cinco soluciones con la ficha navy
   destacada y sus modales. */
import { useState } from "react";
import { Modal, IcArrow, IcCheck, ctaProps } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { SOL_EX, SOL_META } from "./data";
import { IcExpand, SOL_ICONS } from "./icons";

function PayMock() {
  const t = useT();
  const pm = t.landing.solutions.payMock;
  return (
    <div className="pay-mock">
      <div className="pm-top"><div className="pm-check"><IcCheck /></div><div><div className="pm-l1">{pm.received}</div><div className="pm-l2">{pm.via}</div></div></div>
      <div className="pm-amt">+250.00 <b>USDC</b></div>
      <div className="pm-row"><span>GA3K…X9PL</span><span>{pm.fee}</span></div>
    </div>
  );
}

function SolModal({ itemKey, onClose, user }) {
  const t = useT();
  const s = t.landing.solutions;
  const item = s.items[itemKey];
  return (
    <Modal onClose={onClose}>
      <div className="modal-hero">
        <div className="ex-card">
          <div className="ex-ic">{SOL_ICONS[itemKey]}</div>
          <pre>{SOL_EX[itemKey].join("\n")}</pre>
        </div>
      </div>
      <div className="modal-body">
        <div className="modal-eyebrow">{s.eyebrow}</div>
        <h3>{item.t}</h3>
        <p>{item.long}</p>
        <ul className="modal-points">{item.points.map((p) => <li key={p}><IcCheck />{p}</li>)}</ul>
        <a className="btn btn-violet" {...ctaProps(user)}>{s.startBuilding} <IcArrow /></a>
      </div>
    </Modal>
  );
}

export function Solutions({ user }) {
  const t = useT();
  const s = t.landing.solutions;
  const [open, setOpen] = useState(null);
  return (
    <section className="lp-panel solutions" data-panel="white" id="solutions">
      {/* trazo 2 de 3: ornamento del panel, con aire propio al lado del encabezado */}
      <span className="trazo-deco trazo-1" aria-hidden="true" />
      <div className="wrap">
        <div className="section-head reveal">
          <h2>{s.title}<span className="num" aria-hidden="true">/05</span></h2>
          <p>{s.lede}</p>
        </div>
        <div className="sol-bento">
          {SOL_META.map((m, i) => {
            const item = s.items[m.i];
            return (
              <div className={`sol-tile reveal${m.feat ? " feat" : ""}`} key={m.i}
                   data-panel={m.feat ? "navy" : undefined}
                   style={{ transitionDelay: `${(i % 3) * 0.07}s` }}>
                <button className="expand-c" onClick={() => setOpen(m.i)} aria-label={item.t}><IcExpand /></button>
                {m.feat && <PayMock />}
                <div className="sti">{SOL_ICONS[m.i]}</div>
                <div className="st-body"><h3>{item.t}</h3><p>{item.d}</p></div>
              </div>
            );
          })}
        </div>
      </div>
      {open !== null && <SolModal itemKey={open} onClose={() => setOpen(null)} user={user} />}
    </section>
  );
}
