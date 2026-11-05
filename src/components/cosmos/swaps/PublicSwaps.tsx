/* The public swap page (product owner: "we offer public swaps and a public swap API without an
   account"), the same component on the gateway (payments.cosmospay.lat/swaps, under its own page
   header) and on the company site (cosmospay.lat/swaps, with this header). The dashboard's swap
   widget and screens, calling the gateway from the visitor's browser with the shared public key
   (publicSwapApi), so nobody signs up; then USDT0 out of Stellar, the public API in three calls,
   and the questions people ask. The commission is the public consumer's plan's (src/lib/plans.ts),
   USDT0's routes come from the API. Mainnet.
   A signed-in visitor swaps as one of their organizations instead (product owner, 2026-11-04: "with
   my plan the commission should come down"): the widget calls the platform's proxies with the
   session (orgSwapApi with the platform's origin; src/lib/payments-session.ts is what the payments
   domain may call), so the swap pays that organization's plan's commission and lands in its
   dashboard. Only organizations where the visitor may open payments count; with several, they
   pick one. Signed out, or with none, it is the public key as before. */
import { useEffect, useMemo, useState } from "react";
import { fmt, initLang, useT } from "@/lib/i18n/index";
import { DASH, DEV } from "@/components/cosmos/lib/constants";
import { useDevSession } from "@/components/cosmos/lib/auth";
import { hasOrgPermission } from "@/lib/org-permissions";
import { showToast } from "@/components/cosmos/shared";
import { CodeTokens } from "@/components/cosmos/ui/CodeTokens";
import { SwapWidget, type SwapPick } from "@/components/cosmos/dashboard/components/SwapWidget";
import { SwapRecordDetail } from "@/components/cosmos/dashboard/components/SwapDetails";
import { NetworkMark } from "@/components/cosmos/dashboard/components/OrgWallets";
import { Sk } from "@/components/cosmos/dashboard/components/Skeleton";
import { orgSwapApi, publicSwapApi, type SwapRecordKind } from "@/lib/swap-api";
import { isUsdt0OnStellar, type Usdt0Route } from "@/lib/usdt0";
import { planSwapFeeBps, swapFeePct, swapFeeRange } from "@/lib/plans";
import { NETWORK_IDS } from "@/lib/chains";
import { publicSwapCalls, usdt0OtherNetworks } from "@/lib/public-swaps";
import { docsLink } from "@/lib/urls";

interface SwapOrg {
  id: string;
  name: string;
  /** The organization's plan: its owner's. */
  plan: string;
}

/* The signed-in visitor's organizations that may open swaps, once known; [] when signed out or
   when none may. The nav's session answer says whether anyone is signed in, so a visitor without
   a session never asks for organizations. */
function useSwapOrgs(enabled: boolean): SwapOrg[] | null {
  const { user, ready } = useDevSession();
  const [orgs, setOrgs] = useState<SwapOrg[] | null>(null);
  useEffect(() => {
    if (!enabled) { setOrgs([]); return; }
    if (!ready) return;
    if (!user) { setOrgs([]); return; }
    let alive = true;
    fetch(`${DEV}/api/organizations`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const list: any[] = Array.isArray(j?.data) ? j.data : [];
        const usable = list
          .filter((o) => o && typeof o.id === "string" && hasOrgPermission(o.role, o.permissions, "payments:create"))
          .map((o) => ({ id: o.id, name: String(o.name ?? ""), plan: String(o.plan ?? "") }));
        if (alive) setOrgs(usable);
      })
      .catch(() => { if (alive) setOrgs([]); });
    return () => { alive = false; };
  }, [enabled, ready, user]);
  return orgs;
}

/* `accountSwaps`: whether a signed-in visitor swaps as their organization; off in mock mode, where
   every swap is the real gateway's under the public key (src/lib/mock/real-swaps.ts). */
export default function PublicSwaps({ lang, apiBase, docsUrl, showHeader = false, accountSwaps = true }: { lang: string; apiBase: string; docsUrl: string; showHeader?: boolean; accountSwaps?: boolean }) {
  initLang(lang);
  const t = useT();
  const p = t.swapsPage;
  const orgs = useSwapOrgs(accountSwaps);
  const [orgId, setOrgId] = useState<string | null>(null);
  const org = orgs?.find((o) => o.id === orgId) ?? orgs?.[0] ?? null;
  // Signed in: the organization's swaps, at its plan's commission; else the public key's. Always
  // production (mainnet): the landing never quotes on a test network (product owner, 2026-11-04).
  const api = useMemo(() => (org ? orgSwapApi(org.id, "prod", DEV) : publicSwapApi(apiBase, "prod")), [org?.id, apiBase]);
  const feeBps = planSwapFeeBps(org ? org.plan : "community");
  const [routes, setRoutes] = useState<Usdt0Route[] | null>(null);
  const [opened, setOpened] = useState<{ kind: SwapRecordKind; rec: unknown } | null>(null);
  const [pick, setPick] = useState<SwapPick | null>(null);
  // The public consumer's commission, and the range a plan brings it down to.
  const rates = { pct: swapFeePct("community"), ...swapFeeRange() };
  // `{n}` in the facts: how many networks cross-chain swaps reach, never a written count.
  const nets = { n: NETWORK_IDS.length };
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

  // The public API in three calls (src/lib/public-swaps.ts), each under its label.
  const labels = { key: p.apiStep1, cross: p.apiStep2, usdt0: p.apiStep3 };
  const steps = publicSwapCalls(base).map((call) => ({ label: labels[call.key], code: call.code }));
  const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => showToast(t.toasts.copied)).catch(() => {});
  const more = usdt0OtherNetworks(routes);

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
          <SwapWidget api={api} tier="public" preset={pick} feeBps={feeBps} onCreated={(kind, rec) => setOpened({ kind, rec })} />
        </div>
        <div className="pswap-copy">
          <ul className="pswap-facts" role="list">
            {p.facts.map((f) => <li key={f.t}><b>{fmt(f.t, nets)}</b><span>{fmt(f.s, nets)}</span></li>)}
          </ul>
          {org ? (
            <div className="pswap-fee is-org">
              <p>{fmt(p.feeSignedIn, { org: org.name, plan: (t.dash.planNames as Record<string, string>)[org.plan] || org.plan, pct: swapFeePct(org.plan) })}</p>
              <div className="pswap-org">
                {orgs!.length > 1 && (
                  <label>
                    <span>{p.orgLabel}</span>
                    <select className="field" value={org.id} onChange={(e) => setOrgId(e.target.value)}>
                      {orgs!.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </label>
                )}
                <a href={`${DASH}?view=swaps`}>{p.yourSwaps}</a>
              </div>
            </div>
          ) : (
            <p className="pswap-fee">{fmt(p.fee, rates)}</p>
          )}
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
              <pre className="pswap-code" translate="no"><code><CodeTokens code={s.code} lang="bash" /></code></pre>
            </li>
          ))}
        </ol>
        <a className="btn btn-outline-w" href={docsLink(docsUrl, "/api")}>{p.apiDocs}</a>
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
