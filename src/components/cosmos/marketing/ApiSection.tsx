/* ApiSection.jsx — API section + terminal copy button. */
import { useCopy, hl, IcArrow, IcChevSm, IcCheck, IcCopy } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { API_SNIPPET, API_CARD_KEYS, SDK_KEYS } from "./data";
import { API_ICONS, SDK_ICONS } from "./icons";

function TermCopy({ text }) {
  const t = useT();
  const [done, run] = useCopy();
  return (<button type="button" className={`term-copy${done ? " done" : ""}`} onClick={() => run(text, t.toasts.copied)}>{done ? <IcCheck /> : <IcCopy />}{done ? t.landing.api.copied : t.landing.api.copy}</button>);
}

export function ApiSection() {
  const t = useT();
  const a = t.landing.api;
  return (
    <section className="api" id="api">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="kicker">{a.kicker}</span>
          <h2>{a.title}</h2>
          <p>{a.lede}</p>
        </div>
        <div className="api-cards">
          {API_CARD_KEYS.map((key, i) => (
            <div className="api-card reveal" key={key} style={{ transitionDelay: `${i * 0.08}s` }}>
              <div className="ic">{API_ICONS[key]}</div>
              <h3>{a.cards[key].title}</h3>
              <p>{a.cards[key].desc}</p>
              <a className="docs-link" href="#">{a.docsLink} <IcChevSm /></a>
            </div>
          ))}
        </div>
      </div>
      <div className="api-docs">
        <div className="wrap docs-grid">
          <div className="terminal reveal">
            <div className="terminal-bar"><i /><i /><i /><TermCopy text={API_SNIPPET} /></div>
            <div className="terminal-body">
              <pre dangerouslySetInnerHTML={{ __html: hl(API_SNIPPET) }} />
              <span className="terminal-badge">@cosmosapp/pay_sdk</span>
            </div>
          </div>
          <div className="docs-copy reveal" style={{ transitionDelay: ".08s" }}>
            <h3>{a.docsTitle}</h3>
            <p>{a.docsDesc}</p>
            <div className="sdk-btns">
              {SDK_KEYS.map((key) => (<a className="sdk-btn" href="#" key={key}>{SDK_ICONS[key]}{a.sdkBtns[key]}</a>))}
            </div>
            <a className="docs-explore" href="#">{a.exploreDocs} <IcArrow /></a>
          </div>
        </div>
      </div>
    </section>
  );
}
