/* IntegrationPaths.tsx: /02 del deck, las cuatro cifras de escala al lado del
   titulo y los tres caminos de integracion como fichas navy. */
import { IcChevSm } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { SCALE_VALUES, PATH_NUMS } from "./data";

// Targets for the three integration-path CTAs (by position, because the catalogs only carry the
// translated label, and the order is the same in every language): No-code → dashboard,
// Prebuilt UI → browser SDK, Build-your-own (the REST/SDK "API" path) → the docs.
const PATH_HREFS = ["/dashboard", "/docs/sdk/web/web-client", "/docs"];

function pathMock(n, ig) {
  if (n === "01") return null; // filled by caller with translated link text
  /* /02 muestra un pedazo de checkout armado con los componentes: monto, campo
     y boton. Los circulos vacios de antes parecian un placeholder de carga. */
  if (n === "02") return (
    <div className="ip-mock">
      <div className="ip-checkout">
        <div className="ipc-amt">19.99 <span>USDC</span></div>
        <div className="ipc-field">you@company.com</div>
        <div className="ipc-btn">{ig.mockPay}</div>
      </div>
    </div>
  );
  return <div className="ip-mock"><div className="ip-code"><span className="tok-kw">const</span> {"{ Client }"} = require(<span className="tok-str">'@cosmosapp/pay_sdk'</span>);<br />await client.paymentIntents.createPay(...)</div></div>;
}

export function IntegrationPaths() {
  const t = useT();
  const ig = t.landing.integration;
  return (
    <section className="lp-panel ip-section" data-panel="black" id="build">
      {/* trazo 1 de 3: solido, blanco y recortado por el borde del panel */}
      <span className="trazo-deco trazo-4" aria-hidden="true" />
      <div className="wrap">
        <div className="ip-head">
          <div className="section-head reveal">
            <h2>{ig.title}<span className="num" aria-hidden="true">/04</span></h2>
            <p>{ig.lede}</p>
          </div>
          <div className="ip-scale reveal">
            {SCALE_VALUES.map((v, i) => (<div className="ipstat" key={i}><div className="ipnum">{v}</div><div className="iplab">{ig.scale[i]}</div></div>))}
          </div>
        </div>
        <div className="ip-grid">
          {ig.paths.map((p, i) => {
            const num = PATH_NUMS[i];
            return (
              <div className="ip reveal" key={num} style={{ transitionDelay: `${i * 0.07}s` }}>
                {num === "01" ? <div className="ip-mock"><div className="chip">{ig.mockLink}</div></div> : pathMock(num, ig)}
                <div className="ipn">{"/" + num}</div>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
                <a className="card-link" href={PATH_HREFS[i] || "#"}>{p.a} <IcChevSm /></a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
