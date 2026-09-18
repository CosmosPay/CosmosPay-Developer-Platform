/* Hero.tsx: portada de la landing (la pagina 7 del deck con el titular tecnico).
   rotulo de marca, titular Light en dos lineas y la cinta a la derecha.
   Glyph sigue viviendo aca porque lo usa el marquee de clientes. */
import { IcArrow, CopyPill, ctaProps } from "@/components/cosmos/shared";
import { useT } from "@/lib/i18n/index";
import { CLIENTS } from "./data";

export function Glyph({ i }) {
  const shapes = [
    <circle cx="12" cy="12" r="9" />,
    <rect x="4" y="4" width="16" height="16" rx="4" transform="rotate(45 12 12)" />,
    <path d="M12 3l9 9-9 9-9-9z" />,
    <><circle cx="8" cy="12" r="5" /><circle cx="16" cy="12" r="5" /></>,
  ];
  return <svg className="glyph" viewBox="0 0 24 24" fill="currentColor">{shapes[i % shapes.length]}</svg>;
}

function Marquee() {
  const row = [...CLIENTS, ...CLIENTS];
  return (<div className="marquee"><div className="marquee-track">{row.map((c, i) => (<span className="client" key={i}><Glyph i={i} />{c}</span>))}</div></div>);
}

/* ---------------- hero ---------------- */
export function Hero({ user }) {
  const t = useT();
  const headline = t.landing.hero.headline;
  /* el catalogo trae el titular partido por "->"; la flecha del sitio viejo se
     va y las dos mitades quedan como dos lineas del titulo Light */
  const parts = headline.split("->");
  return (
    <section className="lp-panel hero" data-panel="black">
      <div className="wrap">
        <div className="hero-grid">
          <div className="hero-copy reveal in">
            <div className="hero-tag">{t.landing.hero.tagline}</div>
            <h1>
              {parts[0].trim()}
              {parts.length > 1 && <br />}
              {parts.length > 1 && parts[1].trim()}
            </h1>
            <p className="lede">{t.landing.hero.lede}</p>
            <div className="hero-cta">
              <a className="btn btn-dark" {...ctaProps(user)}>{t.landing.hero.getKeys} <IcArrow /></a>
              <CopyPill cmd="npm i @cosmosapp/pay_sdk" />
            </div>
            {CLIENTS.length > 0 && (
              <div className="clients">
                <div className="clients-label">{t.landing.hero.trustedBy}</div>
                <Marquee />
              </div>
            )}
          </div>
        </div>
      </div>
      <img className="hero-cinta" src="/brand/cinta.webp" alt="" aria-hidden="true"
           width="1672" height="941" fetchPriority="high" decoding="async" />
    </section>
  );
}
