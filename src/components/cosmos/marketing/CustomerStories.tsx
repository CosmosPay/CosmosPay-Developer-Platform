/* CustomerStories.jsx — customer stories section + case modal. */
import { useState } from "react";
import { Modal, IcArrow, IcChevSm } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { CASE_META, CASE_KEYS } from "./data";
import { IcExpand } from "./icons";
import { Glyph } from "./Hero";

function CaseModal({ brand, onClose }) {
  const t = useT();
  const c = t.landing.customers;
  const item = c.items[brand];
  const meta = CASE_META[brand];
  return (
    <Modal onClose={onClose}>
      <div className="modal-hero" style={{ background: meta.bg }}>
        <span className="cb"><Glyph i={meta.g} />{brand}</span>
      </div>
      <div className="modal-body">
        <div className="modal-eyebrow">{c.eyebrow}</div>
        <div className="cmetric">{meta.metric}</div>
        <p style={{ marginTop: 0 }}>{item.label}</p>
        <p>{item.story}</p>
        <div className="mtags">{item.tags.map((tg) => <span key={tg}>{tg}</span>)}</div>
        <a className="btn btn-violet" href="#">{c.readFull} <IcArrow /></a>
      </div>
    </Modal>
  );
}

export function CustomerStories() {
  const t = useT();
  const c = t.landing.customers;
  const [open, setOpen] = useState(null);
  return (
    <section className="lp" id="customers">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="kicker">{c.kicker}</span>
          <h2>{c.title}</h2>
          <p>{c.lede}</p>
        </div>
        <div className="case-grid">
          {CASE_KEYS.map((brand, i) => {
            const item = c.items[brand];
            const meta = CASE_META[brand];
            return (
              <div className="case reveal" key={brand} style={{ transitionDelay: `${i * 0.07}s` }}>
                <div className="case-cover" style={{ background: meta.bg }}><button className="expand-c" onClick={() => setOpen(brand)} aria-label={brand}><IcExpand /></button><span className="cb"><Glyph i={meta.g} />{brand}</span></div>
                <div className="case-body">
                  <div className="cmetric">{meta.metric}</div>
                  <div className="cmlabel">{item.label}</div>
                  <div className="ctags">{item.tags.map((tg) => <span key={tg}>{tg}</span>)}</div>
                  <button className="card-link" style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }} onClick={() => setOpen(brand)}>{c.readStory} <IcChevSm /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {open !== null && <CaseModal brand={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
