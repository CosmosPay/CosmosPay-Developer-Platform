/* IntegrationPaths.jsx — integration paths section + path mock helper. */
import { IcChevSm } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { SCALE_VALUES, PATH_NUMS } from "./data";

function pathMock(n) {
  if (n === "01") return null; // filled by caller with translated link text
  if (n === "02") return <div className="ip-mock gw3"><div className="ip-logos">{[0, 1, 2, 3, 4, 5].map((k) => <i key={k} />)}</div></div>;
  return <div className="ip-mock"><div className="ip-code"><span className="tok-kw">const</span> cosmos = require(<span className="tok-str">'@cosmos-pay/sdk'</span>);<br />await cosmos.payments.create(...)</div></div>;
}

export function IntegrationPaths() {
  const t = useT();
  const ig = t.landing.integration;
  return (
    <section className="lp alt" id="build">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="kicker">{ig.kicker}</span>
          <h2>{ig.title}</h2>
          <p>{ig.lede}</p>
        </div>
        <div className="ip-scale reveal">
          {SCALE_VALUES.map((v, i) => (<div className="ipstat" key={i}><div className="ipnum">{v}</div><div className="iplab">{ig.scale[i]}</div></div>))}
        </div>
        <div className="ip-grid">
          {ig.paths.map((p, i) => {
            const num = PATH_NUMS[i];
            return (
              <div className="ip reveal" key={num} style={{ transitionDelay: `${i * 0.07}s` }}>
                {num === "01" ? <div className="ip-mock gw2"><div className="chip">{ig.mockLink}</div></div> : pathMock(num)}
                <div className="ipn">{num}</div>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
                <a className="card-link" href="#">{p.a} <IcChevSm /></a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
