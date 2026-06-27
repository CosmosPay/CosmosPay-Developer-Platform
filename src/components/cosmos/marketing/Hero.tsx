/* Hero.jsx — hero section + hero art helpers. Glyph is also used by CustomerStories. */
import { CosmosMark, IcArrow, CopyPill, ctaProps } from "@/components/cosmos/shared";
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

/* ---------------- hero art ---------------- */
function Plus({ s = "40%" }) {
  return (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 6v12M6 12h12" />
    </svg>
  );
}
function PlusNode({ style }) {
  return (
    <div className="node" style={{ ...style }}>
      <div style={{ width: "100%", aspectRatio: "1", borderRadius: "50%", background: "var(--art-ink)", display: "grid", placeItems: "center" }}>
        <Plus />
      </div>
    </div>
  );
}
function HeroArt() {
  return (
    <div className="art" role="img" aria-label="Cosmos Pay payment flow illustration">
      <svg viewBox="0 0 100 104" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
        <g fill="none" stroke="var(--art-ink)" strokeWidth="1.4" vectorEffect="non-scaling-stroke">
          <path d="M49 40 L49 78" />
          <path d="M60 35 L92 35" />
          <path d="M72 47 L72 40 M79 47 L79 40 M86 47 L86 40" />
          <path d="M72 60 L72 70 L60 70 L60 80" />
          <path d="M22 86 L33 86" />
          <path d="M56 86 L66 86" />
        </g>
        <g fill="none" stroke="var(--ink-3)" strokeWidth="1.2" strokeDasharray="1 3" strokeLinecap="round" vectorEffect="non-scaling-stroke">
          <path d="M88 14 L88 30" />
          <path d="M44 96 L44 103" />
          <path d="M14 70 L24 70" />
        </g>
      </svg>
      <div className="node" style={{ left: "12%", top: "6%", width: "40%", height: "50%", background: "var(--lav)", borderRadius: 22 }} />
      <div className="node dot-fill" style={{ left: "36%", top: "3%", width: "34%", height: "30%", background: "var(--lav)", borderRadius: 18 }} />
      <div className="node" style={{ left: "12%", top: "40%", width: "20%", height: "16%", background: "var(--lav-2)", borderRadius: "0 0 22px 0" }} />
      <div className="node art-card float" style={{ left: "22%", top: "14%", width: "22%", height: "10%", borderRadius: 999, justifyContent: "flex-start", padding: "0 4%" }}>
        <div style={{ width: "36%", aspectRatio: "1", borderRadius: "50%", background: "var(--art-ink)" }} />
        <div style={{ width: 3, height: "34%", background: "var(--line-2)", borderRadius: 3, marginLeft: "auto" }} />
      </div>
      <div className="node" style={{ left: "39%", top: "28%", width: "18%", background: "var(--blue-soft)", borderRadius: "50%", aspectRatio: "1" }}>
        <div className="dot-fill" style={{ position: "absolute", inset: 0, borderRadius: "50%", WebkitMaskImage: "radial-gradient(circle at 30% 30%, #000 40%, transparent 60%)", maskImage: "radial-gradient(circle at 30% 30%, #000 40%, transparent 60%)" }} />
      </div>
      <PlusNode style={{ left: "44%", top: "31%", width: "8%" }} />
      <div className="node" style={{ left: "52%", top: "26%", width: "15%", background: "var(--art-ink)", borderRadius: "50%", aspectRatio: "1" }} />
      <div className="node" style={{ left: "69%", top: "47%", width: "5.5%", height: "13%", background: "var(--lav)", borderRadius: 8 }}>
        <div style={{ width: 4, height: "46%", background: "var(--art-ink)", borderRadius: 4 }} />
      </div>
      <div className="node" style={{ left: "76.5%", top: "45%", width: "5.5%", height: "13%", background: "var(--blue-soft)", borderRadius: 8 }}>
        <div style={{ width: 4, height: "46%", background: "var(--art-ink)", borderRadius: 4 }} />
      </div>
      <div className="node" style={{ left: "84%", top: "47%", width: "5.5%", height: "13%", background: "var(--lav)", borderRadius: 8 }}>
        <div style={{ width: 4, height: "46%", background: "var(--art-ink)", borderRadius: 4 }} />
      </div>
      <div className="node float d2" style={{ left: "76.5%", top: "66%", width: "5.5%", height: "12%", background: "var(--blue-soft)", borderRadius: 8 }}>
        <div style={{ width: 4, height: "46%", background: "var(--art-ink)", borderRadius: 4 }} />
      </div>
      <div className="node art-card float d1" style={{ left: "79%", top: "4%", width: "18%", borderRadius: "50%", aspectRatio: "1" }}>
        <CosmosMark size="46%" color="var(--art-ink)" />
        <svg viewBox="0 0 24 24" width="34%" height="34%" fill="none" stroke="var(--violet)" strokeWidth="2" strokeLinecap="round" style={{ position: "absolute", left: "-26%", top: "32%" }}>
          <path d="M4 12c2-2 2-6 0-8M9 14c3-3 3-9 0-12" opacity="0.9" />
        </svg>
      </div>
      <div className="node art-card float d3" style={{ left: "6%", top: "78%", width: "13%", borderRadius: 14, aspectRatio: "1" }}>
        <svg viewBox="0 0 24 24" width="48%" height="48%" fill="var(--art-ink)" aria-hidden="true">
          <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
        </svg>
      </div>
      <div className="node" style={{ left: "24%", top: "70%", width: "22%", background: "var(--lav-2)", borderRadius: "50%", aspectRatio: "1" }} />
      <PlusNode style={{ left: "31%", top: "78%", width: "8%" }} />
      <div className="node art-card float d2" style={{ left: "50%", top: "80%", width: "12%", borderRadius: 14, aspectRatio: "1" }}>
        <svg viewBox="0 0 24 24" width="50%" height="50%" fill="none" stroke="var(--art-ink)" strokeWidth="1.8" strokeLinejoin="round">
          <rect x="6" y="6" width="12" height="12" rx="2.5" />
          <rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="var(--art-ink)" />
          <path d="M9 6V3M15 6V3M9 21v-3M15 21v-3M6 9H3M6 15H3M21 9h-3M21 15h-3" strokeLinecap="round" />
        </svg>
      </div>
      <div className="node code-tag" style={{ left: "65%", top: "83%", width: "32%", height: "12%", alignItems: "flex-start", textAlign: "left", display: "block" }}>
        <span className="v">$.cosmos</span>.charges[0]<br />.<span className="v">status</span>
      </div>
      <div className="node vline" style={{ left: "32%", top: "54%", width: "auto", height: "20%" }}>{"{{ $.charges …"}</div>
      <div className="node dot-fill" style={{ left: "70%", top: "82%", width: "27%", height: "16%", clipPath: "polygon(0 100%, 100% 100%, 100% 0)" }} />
    </div>
  );
}

/* ---------------- hero ---------------- */
export function Hero({ user }) {
  const t = useT();
  const headline = t.landing.hero.headline;
  const parts = headline.split("->");
  return (
    <section className="hero">
      <div className="wrap hero-grid">
        <div className="reveal in">
          <h1>
            {parts[0]}
            {parts.length > 1 && (<span className="arr"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>)}
            {parts[1]}
          </h1>
          <p className="lede">{t.landing.hero.lede}</p>
          <div className="hero-cta">
            <a className="btn btn-dark" {...ctaProps(user)}>{t.landing.hero.getKeys} <IcArrow /></a>
            <CopyPill cmd="npm i @cosmosapp/pay_sdk" />
          </div>
          <div className="clients">
            <div className="clients-label">{t.landing.hero.trustedBy}</div>
            <Marquee />
          </div>
        </div>
        <div className="reveal in" style={{ transitionDelay: ".1s" }}>
          <HeroArt />
        </div>
      </div>
    </section>
  );
}
