/* CustomerStories.tsx: /04 del deck, la seccion "para quien". Los casos son
   filas separadas por hairline y al lado va el personaje de marca, la unica
   figura de toda la landing. */
import { useState } from "react";
import { Modal, IcArrow, IcChevSm } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { CASE_META, CASE_KEYS } from "./data";

function CaseModal({ brand, onClose }) {
  const t = useT();
  const c = t.landing.customers;
  const item = c.items[brand];
  const meta = CASE_META[brand];
  return (
    <Modal onClose={onClose}>
      <div className="modal-hero case-hero">
        <span className="cb">{brand}</span>
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
    <section className="lp-panel customers" data-panel="white" id="customers">
      <div className="wrap">
        <div className="cases-layout">
          <div className="cases-col">
            <div className="section-head reveal">
              <h2>{c.title}<span className="num" aria-hidden="true">/04</span></h2>
              <p>{c.lede}</p>
            </div>
            <div className="case-list">
              {CASE_KEYS.map((brand, i) => {
                const item = c.items[brand];
                const meta = CASE_META[brand];
                return (
                  <div className="case-row reveal" key={brand} style={{ transitionDelay: `${i * 0.07}s` }}>
                    <div>
                      <div className="cbrand">{brand}</div>
                      <div className="cmetric">{meta.metric}</div>
                      <div className="cmlabel">{item.label}</div>
                      <div className="ctags">{item.tags.map((tg) => <span key={tg}>{tg}</span>)}</div>
                    </div>
                    <button className="card-link" onClick={() => setOpen(brand)}>{c.readStory} <IcChevSm /></button>
                  </div>
                );
              })}
            </div>
          </div>
          <img className="astro reveal" src="/brand/astronauta-flotando.svg" alt="" aria-hidden="true"
               width="146" height="143" loading="lazy" decoding="async" />
        </div>
      </div>
      {open !== null && <CaseModal brand={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
