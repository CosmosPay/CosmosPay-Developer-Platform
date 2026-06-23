/* Solutions.jsx — solutions bento section + modal + pay mock. */
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
      <div className={`modal-hero ${SOL_META.find((m) => m.i === itemKey).gw}`}>
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
    <section className="lp" id="solutions">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="kicker">{s.kicker}</span>
          <h2>{s.title}</h2>
          <p>{s.lede}</p>
        </div>
        <div className="sol-bento">
          {SOL_META.map((m, i) => {
            const item = s.items[m.i];
            return (
              <div className={`sol-tile reveal ${m.gw}${m.feat ? " feat" : ""}`} key={m.i} style={{ transitionDelay: `${(i % 3) * 0.07}s` }}>
                <button className="expand-c" onClick={() => setOpen(m.i)} aria-label={item.t}><IcExpand /></button>
                <div className="blob" style={{ width: 180, height: 180, background: "var(--violet)", left: -50, bottom: -56 }} />
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
