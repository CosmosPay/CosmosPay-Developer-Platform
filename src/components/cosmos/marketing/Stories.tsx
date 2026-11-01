/* Stories.tsx: /06 del deck, la seccion "para quien". Each row is a use case the product runs
   today (the payments landing's use cases): what the business sets up and which parts of Cosmos
   Pay it uses. No customer names or figures until there are real customers to quote. Al lado va
   el personaje de marca, la unica figura de la seccion. */
import { useState } from "react";
import { Modal, IcChevSm } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { STORY_KEYS } from "@/components/cosmos/marketing/data";

function StoryModal({ storyKey, onClose }) {
  const t = useT();
  const c = t.landing.stories;
  const item = c.items[storyKey];
  return (
    <Modal onClose={onClose}>
      <div className="modal-hero case-hero">
        <span className="cb">{item.t}</span>
      </div>
      <div className="modal-body">
        <div className="modal-eyebrow">{c.eyebrow}</div>
        <p style={{ marginTop: 0 }}>{item.label}</p>
        <p>{item.story}</p>
        <div className="mtags">{item.tags.map((tg) => <span key={tg}>{tg}</span>)}</div>
      </div>
    </Modal>
  );
}

export function Stories() {
  const t = useT();
  const c = t.landing.stories;
  const [open, setOpen] = useState(null);
  return (
    <section className="lp-panel customers" data-panel="white" id="stories">
      <div className="wrap">
        <div className="cases-layout">
          <div className="cases-col">
            <div className="section-head reveal">
              <h2 data-num="/06">{c.title}</h2>
              <p>{c.lede}</p>
            </div>
            <div className="case-list">
              {STORY_KEYS.map((key, i) => {
                const item = c.items[key];
                return (
                  <div className="case-row reveal" key={key} style={{ transitionDelay: `${i * 0.07}s` }}>
                    <div>
                      <h3 className="cmetric">{item.t}</h3>
                      <div className="cmlabel">{item.label}</div>
                      <div className="ctags">{item.tags.map((tg) => <span key={tg}>{tg}</span>)}</div>
                    </div>
                    <button className="card-link" onClick={() => setOpen(key)}>{c.readStory} <IcChevSm /></button>
                  </div>
                );
              })}
            </div>
          </div>
          <img className="astro reveal" src="/brand/astronauta-flotando.svg" alt="" aria-hidden="true"
               width="146" height="143" loading="lazy" decoding="async" />
        </div>
      </div>
      {open !== null && <StoryModal storyKey={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
