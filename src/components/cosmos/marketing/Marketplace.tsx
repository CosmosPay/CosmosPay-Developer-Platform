/* Marketplace.tsx: la promocion cruzada. Aca llegan desarrolladores y
   comercios; el marketplace es la otra mitad del mismo ecosistema, asi que
   va en panel navy, el momento de marca que pide BRAND.md. */
import { IcArrow } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { MARKETPLACE_URL } from "./data";

export function Marketplace() {
  const t = useT();
  const m = t.landing.marketplace;
  return (
    <section className="lp-panel xpromo" data-panel="navy">
      <div className="wrap">
        <div className="xp-grid reveal">
          <div className="xp-copy">
            {/* mismo encabezado que los otros capitulos: titular Light grande y
                la numeracion /0n en lugar de un rotulo de palabra. El nombre de
                marca no se tipea nunca (BRAND.md, seccion 10). */}
            <div className="section-head">
              <h2>{m.title}<span className="num" aria-hidden="true">/09</span></h2>
              <p>{m.lede}</p>
            </div>
            <a className="btn btn-white" href={MARKETPLACE_URL} target="_blank" rel="noopener noreferrer">
              {m.btn} <IcArrow />
            </a>
          </div>
          {/* pose de pie, en sticker porque el panel es navy. No repite la de
              /06 (flotando) ni la de /01 (celular): una pose por pantalla. */}
          <img className="xp-astro" src="/brand/personaje/de-pie-sticker.png" alt="" aria-hidden="true"
               width="1081" height="1081" loading="lazy" decoding="async" />
        </div>
      </div>
    </section>
  );
}
