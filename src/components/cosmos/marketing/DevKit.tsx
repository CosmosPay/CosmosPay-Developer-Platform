/* DevKit.tsx: /02, la wallet para quien la quiere adentro de su producto.
   Un comando y un link: el asistente de codigo hace el resto. */
import { CopyPill, IcArrow } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { SDK_INSTALL, LLMS_TXT } from "./data";
import { DEV_ICONS } from "./icons";

export function DevKit() {
  const t = useT();
  const d = t.landing.devs;
  return (
    <section className="lp-panel devkit" data-panel="black" id="sdk">
      <div className="wrap">
        <div className="section-head reveal">
          <h2>{d.title}<span className="num" aria-hidden="true">/02</span></h2>
          <p>{d.lede}</p>
        </div>
        <div className="dk-grid">
          <div className="dk-card reveal">
            <div className="dk-ic">{DEV_ICONS.install}</div>
            <h3>{d.installTitle}</h3>
            <p>{d.installDesc}</p>
            <div className="dk-actions"><CopyPill cmd={SDK_INSTALL} /></div>
          </div>
          <div className="dk-card reveal" style={{ transitionDelay: ".08s" }}>
            <div className="dk-ic">{DEV_ICONS.llms}</div>
            <h3>{d.llmsTitle}</h3>
            <p>{d.llmsDesc}</p>
            <div className="dk-actions">
              <a className="btn btn-dark btn-sm" href="/docs/llms.txt">{d.llmsBtn} <IcArrow /></a>
              <a className="btn btn-outline-w btn-sm" href="/docs">{d.docsBtn}</a>
            </div>
            <code className="dk-url">{LLMS_TXT}</code>
          </div>
        </div>
      </div>
    </section>
  );
}
