/* ApiSection.tsx: /01 del deck, los tres modulos de la API mas el bloque de
   documentacion con el terminal y los dos SDK. */
import { useCopy, hl, IcArrow, IcChevSm, IcCheck, IcCopy, DOCS } from "@/components/cosmos/shared";
import { useT, fmt } from "@/lib/i18n/index";
import { API_SNIPPET, API_CARD_KEYS, SDK_KEYS, SWAP_NETWORKS } from "@/components/cosmos/marketing/data";
import { API_ICONS, SDK_ICONS } from "@/components/cosmos/marketing/icons";

// Deep links into the docs site (served by the developer platform at /docs).
const SDK_HREF: Record<string, string> = {
  web: `${DOCS}/sdk/web/web-client`,
  node: `${DOCS}/sdk/server/overview`,
};
// Each card links to its own reference page, named in the catalog (`cards.*.link`).
const CARD_HREF: Record<string, string> = {
  payments: `${DOCS}/api/payment-intents`,
  stablecoin: `${DOCS}/api/assets`,
  swaps: `${DOCS}/api/swaps`,
};

function TermCopy({ text }) {
  const t = useT();
  const [done, run] = useCopy();
  return (<button type="button" className={`term-copy${done ? " done" : ""}`} onClick={() => run(text, t.toasts.copied)}>{done ? <IcCheck /> : <IcCopy />}{done ? t.landing.api.copied : t.landing.api.copy}</button>);
}

export function ApiSection() {
  const t = useT();
  const a = t.landing.api;
  return (
    <section className="lp-panel api" data-panel="white" id="api">
      <div className="wrap">
        <div className="section-head reveal">
          <h2 data-num="/03">{a.title}</h2>
          <p>{a.lede}</p>
        </div>
        <div className="api-cards">
          {API_CARD_KEYS.map((key, i) => (
            <div className="api-card reveal" key={key} style={{ transitionDelay: `${i * 0.08}s` }}>
              <div className="ic">{API_ICONS[key]}</div>
              <h3>{a.cards[key].title}</h3>
              <p>{fmt(a.cards[key].desc, { n: SWAP_NETWORKS })}</p>
              <a className="docs-link" href={CARD_HREF[key]}>{a.cards[key].link} <IcChevSm /></a>
            </div>
          ))}
        </div>
        <div className="api-docs">
          <div className="docs-grid">
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
                {SDK_KEYS.map((key) => (<a className="sdk-btn" href={SDK_HREF[key] || DOCS} key={key}>{SDK_ICONS[key]}{a.sdkBtns[key]}</a>))}
              </div>
              <a className="docs-explore" href={DOCS}>{a.exploreDocs} <IcArrow /></a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
