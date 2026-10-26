/* The public swap page (product owner: "we offer public swaps and a public swap API without an
   account"), the same component on the gateway (payments.cosmospay.lat/swaps, under its own page
   header) and on the company site (cosmospay.lat/swaps, with this header). The dashboard's swap
   widget and screens, calling the gateway from the visitor's browser with the shared public key
   (publicSwapApi), so nobody signs up; then USDT0 out of Stellar, the public API in three calls,
   and the questions people ask. The commission is the public consumer's plan's (src/lib/plans.ts),
   USDT0's routes come from the API. Mainnet. */
import { useEffect, useMemo, useState } from "react";
import { fmt, initLang, useT } from "@/lib/i18n/index";
import { showToast } from "@/components/cosmos/shared";
import { SwapWidget, type SwapPick } from "@/components/cosmos/dashboard/components/SwapWidget";
import { SwapRecordDetail } from "@/components/cosmos/dashboard/components/SwapDetails";
import { NetworkMark } from "@/components/cosmos/dashboard/components/OrgWallets";
import { Sk } from "@/components/cosmos/dashboard/components/Skeleton";
import { publicSwapApi, type SwapRecordKind } from "@/lib/swap-api";
import { isUsdt0OnStellar, type Usdt0Route } from "@/lib/usdt0";
import { swapFeePct, swapFeeRange } from "@/lib/plans";

export default function PublicSwaps({ lang, apiBase, docsUrl, showHeader = false }: { lang: string; apiBase: string; docsUrl: string; showHeader?: boolean }) {
  initLang(lang);
  const t = useT();
  const p = t.swapsPage;
  const api = useMemo(() => publicSwapApi(apiBase, "prod"), [apiBase]);
  const [routes, setRoutes] = useState<Usdt0Route[] | null>(null);
  const [opened, setOpened] = useState<{ kind: SwapRecordKind; rec: unknown } | null>(null);
  const [pick, setPick] = useState<SwapPick | null>(null);
  // The public consumer's commission, and the range a plan brings it down to.
  const rates = { pct: swapFeePct("community"), ...swapFeeRange() };
  const base = apiBase.replace(/\/+$/, "");

  useEffect(() => {
    let alive = true;
    api.usdt0Routes().then((r) => { if (alive) setRoutes(r); }).catch(() => { if (alive) setRoutes([]); });
    return () => { alive = false; };
  }, [api]);

  // "Send USDT0": the widget takes Stellar's USDT0 to Ethereum's USDT, and the page goes to it.
  const sendUsdt0 = () => {
    setPick({ from: isUsdt0OnStellar, to: (tk) => tk.chain === "eth" && !!tk.usdt0, n: Date.now() });
    document.getElementById("pswap-widget")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const steps = [
    { label: p.apiStep1, code: `curl "${base}/v1/public-key?env=prod"` },
    {
      label: p.apiStep2,
      code: `curl -X POST "${base}/v1/cross-chain-swaps/quote" \\\n  -H "Authorization: Bearer $PUBLIC_KEY" -H "Content-Type: application/json" \\\n  -d '{"originChain":"stellar","originAsset":"XLM","destinationChain":"solana","destinationAsset":"SOL","amount":"100","recipient":"<solana address>","refundTo":"<stellar account>"}'`,
    },
    {
      label: p.apiStep3,
      code: `curl -X POST "${base}/v1/usdt0/quote" \\\n  -H "Authorization: Bearer $PUBLIC_KEY" -H "Content-Type: application/json" \\\n  -d '{"to":"eth","amount":"100"}'`,
    },
  ];
  const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => showToast(t.toasts.copied)).catch(() => {});
  const more = routes ? Math.max(routes.length - 1, 0) : 20;

  return (
    <div className="pswap">
      {/* On a phone the swap comes right after the title, before what it promises. */}
      <section className={`pswap-hero wrap${showHeader ? " has-head" : ""}`} aria-labelledby={showHeader ? "pswap-title" : undefined}>
        {showHeader && (
          <div className="pswap-head">
            <h1 id="pswap-title" className="pswap-title">{p.title}</h1>
            <p className="pswap-lede">{p.lede}</p>
          </div>
        )}
        <div className="pswap-widget" id="pswap-widget">
          <SwapWidget api={api} tier="public" preset={pick} onCreated={(kind, rec) => setOpened({ kind, rec })} />
        </div>
        <div className="pswap-copy">
          <ul className="pswap-facts" role="list">
            {p.facts.map((f) => <li key={f.t}><b>{f.t}</b><span>{f.s}</span></li>)}
          </ul>
          <p className="pswap-fee">{fmt(p.fee, rates)}</p>
        </div>
      </section>

      <section className="pswap-band wrap" aria-labelledby="pswap-usdt0">
        <div className="pswap-band-copy">
          <h2 id="pswap-usdt0">{p.usdt0Title}</h2>
          <p>{fmt(p.usdt0Lede, { n: more })}</p>
          <button type="button" className="btn btn-dark" onClick={sendUsdt0}>{p.usdt0Cta}</button>
        </div>
        <div className="pswap-nets-wrap">
          <h3 className="pswap-sub">{p.usdt0Networks}</h3>
          <ul className="pswap-nets" role="list" aria-busy={routes === null || undefined}>
            {routes === null
              ? Array.from({ length: 9 }, (_, i) => <li key={i}><Sk className="round" w="28px" /><Sk w="6em" /></li>)
              : routes.map((r) => (
                <li key={r.chain} className="arrive">
                  <NetworkMark chain={r.chain} size={28} />
                  <span className="pswap-net-t"><b>{r.name}</b><small>{r.receives}</small></span>
                </li>
              ))}
          </ul>
        </div>
      </section>

      <section className="pswap-api wrap" aria-labelledby="pswap-api">
        <h2 id="pswap-api">{p.apiTitle}</h2>
        <p className="pswap-section-lede">{fmt(p.apiLede, rates)}</p>
        <ol className="pswap-steps">
          {steps.map((s) => (
            <li key={s.label}>
              <div className="pswap-step-head">
                <h3>{s.label}</h3>
                <button type="button" className="icon-mini" title={t.ui.copyToClipboard} aria-label={t.ui.copyToClipboard} onClick={() => copy(s.code)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></svg>
                </button>
              </div>
              <pre className="pswap-code"><code>{s.code}</code></pre>
            </li>
          ))}
        </ol>
        <a className="btn btn-outline-w" href={`${docsUrl}/api`}>{p.apiDocs}</a>
      </section>

      <section className="pswap-faq wrap" aria-labelledby="pswap-faq">
        <h2 id="pswap-faq">{p.faqTitle}</h2>
        <div className="pswap-faq-list">
          {p.faq.map((x) => (
            <details key={x.q}>
              <summary>{x.q}</summary>
              <p>{fmt(x.a, rates)}</p>
            </details>
          ))}
        </div>
      </section>

      {opened && <SwapRecordDetail api={api} kind={opened.kind} record={opened.rec} onClose={() => setOpened(null)} />}
    </div>
  );
}
