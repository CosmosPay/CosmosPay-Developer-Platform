/* WalletSection.tsx: /01, la wallet al frente de la portada.
   Tres caminos por orden de prominencia (Chrome, navegador, Android) y el
   resto de las plataformas plegado abajo, para que no le compitan. El peso
   de cada archivo va en el boton: nadie baja 75 MB sin enterarse antes. */
import { IcArrow, IcChevSm } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { WALLET_LINKS, WALLET_MORE, WALLET_VERSION, ANDROID_SIZE } from "./data";
import { WALLET_ICONS } from "./icons";

/* todo lo que sale del dominio se abre aparte y sin pasarle el referrer */
const EXT = { target: "_blank", rel: "noopener noreferrer" } as const;

function Way({ icon, href, title, sub, size, main = false, external = true }) {
  return (
    <a className={`wway${main ? " wway-main" : ""}`} href={href} {...(external ? EXT : {})}>
      <span className="wway-ic">{icon}</span>
      <span className="wway-txt">
        <b>{title}{size && <span className="wway-size">{size}</span>}</b>
        <span>{sub}</span>
      </span>
      <span className="wway-go"><IcArrow /></span>
    </a>
  );
}

export function WalletSection() {
  const t = useT();
  const w = t.landing.wallet;
  return (
    <section className="lp-panel wallet" data-panel="white" id="wallet">
      <div className="wrap">
        <div className="wallet-grid">
          <div className="wallet-copy">
            <div className="section-head reveal">
              <h2>{w.title}<span className="num" aria-hidden="true">/01</span></h2>
              <p>{w.lede}</p>
            </div>

            <div className="wallet-ways reveal">
              <Way main icon={WALLET_ICONS.chrome} href={WALLET_LINKS.chrome} title={w.chrome.t} sub={w.chrome.s} />
              {/* la webapp es del mismo dominio: se abre en la misma pestaña */}
              <Way external={false} icon={WALLET_ICONS.web} href={WALLET_LINKS.webapp} title={w.web.t} sub={w.web.s} />
              <Way icon={WALLET_ICONS.android} href={WALLET_LINKS.android} title={w.android.t} sub={w.android.s} size={ANDROID_SIZE} />
            </div>

            <details className="wallet-more reveal">
              <summary>
                <span>{w.moreLabel}</span>
                <span className="wm-ver">{w.versionLabel} v{WALLET_VERSION}</span>
                <IcChevSm />
              </summary>
              <ul className="wm-list">
                {WALLET_MORE.map((p) => (
                  <li className="wm-row" key={p.k}>
                    <div className="wm-head">
                      <b>{w.more[p.k].t}</b>
                      <a className="wm-dl" href={p.href} {...EXT}>{w.download} <span>{p.size}</span></a>
                    </div>
                    <p>{w.more[p.k].s}</p>
                    {p.extra && (
                      <div className="wm-extra">
                        {p.extra.map((e) => (<a key={e.label} href={e.href} {...EXT}>{e.label} <span>{e.size}</span></a>))}
                      </div>
                    )}
                  </li>
                ))}
                <li className="wm-row wm-ios"><p>{w.ios}</p></li>
              </ul>
            </details>
          </div>

          {/* el personaje: la pose con el celular, una sola por pantalla.
              La linea negra es para el panel claro; en oscuro el panel se
              vuelve negro y entra la version sticker, que tiene contorno
              blanco (BRAND.md, seccion 5). */}
          <div className="wallet-figure reveal" aria-hidden="true">
            <img className="wfig wfig-light" src="/brand/personaje/celular-negro.png" alt=""
                 width="1081" height="1081" loading="lazy" decoding="async" />
            <img className="wfig wfig-dark" src="/brand/personaje/celular-sticker.png" alt=""
                 width="1081" height="1081" loading="lazy" decoding="async" />
          </div>
        </div>
      </div>
    </section>
  );
}
