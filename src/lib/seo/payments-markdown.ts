/* payments-markdown.ts: the gateway's indexable pages (payments.cosmospay.lat: the home, the
   content pages, the network pages, /swaps and the guides) as Markdown, in every language. Each
   page is the sections its .astro file draws, in the same order, each read from what that section
   component renders: landingContent (src/lib/payments/landing-content.ts, the lists and rates the
   components get through landingData), the guides' catalogs and config (src/lib/payments/learn/),
   the comparison (compare.ts), the network pages' data (network-pages.ts), the checkout designs'
   names (i18n.ts), the public swap page's words (the platform catalog's `swapsPage`) and calls
   (src/lib/public-swaps.ts), and the plans (plans.ts). Demos, mock-ups and forms become what they
   say; code samples stay code. Links are absolute and keep the page's language (localizeHref).
   Pure, so tests/unit/seoMarkdown.test.ts covers it. */
import { landingContent, type LandingContent } from "@/lib/payments/landing-content";
import { fillPageCopy, pageMeta, type CopyPage } from "@/lib/payments/landing-i18n";
import { GUIDE_CONFIG, fill, guideCopy } from "@/lib/payments/learn/index";
import { learnHrefs, type LearnLink } from "@/lib/payments/learn/links";
import { GUIDES, GUIDE_DATES, PAYMENTS_PAGES, guideOf, pagePath, type Guide, type NetworkPage, type PaymentsPage } from "@/lib/payments/site-pages";
import { LOCALES, MESSAGES, type Locale } from "@/lib/payments/i18n";
import { COMPARE_CHECKED, ESCROW_COM, compareRows, formatRate } from "@/lib/payments/compare";
import { NETWORK_WALLETS, networkPresets, payLinkCurl } from "@/lib/payments/network-pages";
import { CHECKOUT_THEMES } from "@/lib/payments/checkout-themes";
import { CONTACT_ADDRESS } from "@/lib/payments/contact";
import { CHAINS, CHAIN_NAMES, NETWORK_IDS, TEST_NETWORKS, type Chain } from "@/lib/chains";
import { PLAN_IDS, PLAN_SPECS, PRIVATE_PAYMENT_FEE_PCT, planSwapFeeBps, swapFeePct, swapFeeRange, type PlanId } from "@/lib/plans";
import { publicSwapCalls, USDT0_OTHER_NETWORKS_BEFORE_ROUTES } from "@/lib/public-swaps";
import { messages } from "@/lib/i18n/messages/index";
import { loginUrl } from "@/lib/urls";
import { localizeHref, pageUrl } from "@/lib/seo/lang-urls";
import { code, h, link, ol, p, table, term, ul, type Block, type MarkdownInput, type PageDoc } from "@/lib/seo/markdown";

/** The gateway's languages: every page is written in all of them. */
export const PAYMENTS_LANGS: readonly string[] = LOCALES.map((l) => l.code);

/** The catalog key of each content and network page's copy (`pages.<key>` in landing-i18n.ts). */
const COPY_KEY: Partial<Record<PaymentsPage, CopyPage>> = {
  integrations: "integrations",
  swaps: "swaps",
  "use-cases": "useCases",
  security: "security",
  fees: "fees",
  compare: "compare",
  faq: "faq",
  stellar: "stellar",
  solana: "solana",
  monad: "monad",
};

interface Ctx {
  lang: Locale;
  d: LandingContent;
  input: MarkdownInput;
  docs: string;
  /** Where "Create a payment link" leads: the platform's sign-in, then the dashboard's payments. */
  create: string;
  /** A page of the gateway in the page's language: `/faq` → `https://payments…/faq?lang=es`. */
  page: (path: string) => string;
  /** Any absolute link in the page's language (a page of either host keeps `?lang=`). */
  at: (href: string) => string;
  /** This page's own address. */
  self: string;
}

const head = (title: string, bold: string): string => `${title} ${bold}`;
const soon = (d: LandingContent, text: string, isSoon: boolean): string => (isSoon ? `${text} (${d.t.soon})` : text);

/* ---------- the sections (src/components/payments/landing/sections and friends) ---------- */

/** PageHeader.astro: a content page's h1 and its line. */
function pageHeader(copy: { title: string; lede: string }): Block[] {
  return [h(1, copy.title), p(fillPageCopy(copy.lede))];
}

/** Hero.astro (the home's h1). */
function hero({ d, docs, create, page }: Ctx): Block[] {
  const t = d.t;
  return [
    h(1, `${t.hero.titleA} ${d.heroMark.words}${d.heroMark.stop} ${t.hero.titleB}`),
    p(t.hero.lede),
    ul([link(t.hero.primary, create), link(t.hero.secondary, docs)]),
    ul(t.pages.notes),
    p(link(t.hero.designs, page("/integrations"))),
  ];
}

/** Marks.astro: the networks, assets and wallets the marquees name. */
function marks({ d }: Ctx): Block[] {
  return [h(2, d.t.marks.title), ul(d.marqueeRows.map((row) => term(row.label, row.items.map((item) => item.name).join(", "))))];
}

/** Benefits.astro: what changes, and the two ways to settle. */
function benefits({ d }: Ctx): Block[] {
  const t = d.t;
  return [
    h(2, head(t.benefits.title, t.benefits.titleBold)),
    ...d.benefits.flatMap((b) => [h(3, soon(d, b.title, b.soon)), p(b.body)]),
    h(3, head(t.settle.title, t.settle.titleBold)),
    p(t.settle.lede),
    ...d.settleModes.flatMap((mode) => [h(4, soon(d, mode.title, mode.soon)), p(mode.body), ol(mode.steps)]),
  ];
}

/** InlineCta.astro: the main button again, and where to read more. */
function inlineCta({ d, create }: Ctx, more: { href: string; label: string }): Block[] {
  return [ul([link(d.t.hero.primary, create), link(more.label, more.href)])];
}

/** How.astro: the four steps. */
function how({ d }: Ctx): Block[] {
  return [h(2, head(d.t.how.title, d.t.how.titleBold)), ol(d.steps.map((s) => term(s.title, s.body)))];
}

/** Paths.astro: the three ways to start. */
function paths({ d, docs, create, page }: Ctx): Block[] {
  const t = d.t;
  const targets = { create, integrations: page("/integrations"), docs };
  return [
    h(2, head(t.paths.title, t.paths.titleBold)),
    p(t.paths.lede),
    ...d.pathKeys.flatMap((path) => {
      const copy = t.paths[path.key];
      return [h(3, `${copy.title} (${copy.level})`), p(copy.body), ul(copy.points), p(link(copy.link, targets[path.target]))];
    }),
  ];
}

/** Pricing.astro: the plans (from plans.ts), the calculator on /fees, and where to compare. */
function pricing(ctx: Ctx, opts: { compact: boolean; heading?: string; lede?: string }): Block[] {
  const { d, page, at, input } = ctx;
  const t = d.t;
  // The calculator works out each plan's fee in the browser; what it says without a script.
  const calc: Block[] = opts.compact ? [] : [h(3, t.calc.title), p(`${t.calc.escrow} (${t.soon})`), p(t.calc.note)];
  return [
    h(2, opts.heading ?? head(t.pricing.title, t.pricing.titleBold)),
    p(opts.lede ?? t.pricing.lede),
    ul(d.plans.map((plan) => term(plan.name, [[plan.rate, plan.unit].filter(Boolean).join(" "), plan.swap, plan.monthly].filter(Boolean).join(", ")))),
    ...calc,
    ul([
      ...(opts.compact ? [link(t.pages.more.fees, page("/fees"))] : []),
      link(t.pricing.compare, at(`${input.site}/pricing`)),
      ...(opts.compact ? [] : [link(t.pages.more.compare, page("/compare"))]),
    ]),
  ];
}

/** Security.astro: the facts (the first four on the home). */
function security({ d, page }: Ctx, compact: boolean): Block[] {
  const t = d.t;
  const facts = compact ? d.security.slice(0, 4) : d.security;
  return [
    h(2, head(t.security.title, t.security.titleBold)),
    ...facts.flatMap((fact) => [h(3, fact.title), p(fact.body)]),
    ...(compact ? [p(link(t.pages.more.security, page("/security")))] : []),
  ];
}

/** Faq.astro: the gateway's questions (or a page's own), with the network pages linked. */
function faq(ctx: Ctx, opts: { limit?: number; items?: readonly { q: string; a: string }[]; heading?: string; current?: NetworkPage } = {}): Block[] {
  const { d, page } = ctx;
  const t = d.t;
  const list = opts.items ?? d.faq;
  const shown = opts.limit ? list.slice(0, opts.limit) : list;
  const nets = CHAINS.filter((n) => n !== opts.current);
  return [
    h(2, opts.heading ?? head(t.faq.title, t.faq.titleBold)),
    ...(opts.limit ? [p(link(t.pages.more.faq, page("/faq")))] : []),
    p(`${opts.current ? t.network.others : t.pages.byNetwork} ${nets.map((n) => link(t.pages[n].link, page(`/${n}`))).join(", ")}`),
    ...shown.flatMap((f) => [h(3, f.q), p(f.a)]),
  ];
}

/** FinalCta.astro: the final call and the contact form, which writes to the public address. */
function finalCta({ d, create }: Ctx): Block[] {
  const t = d.t;
  return [
    h(2, `${t.cta.title} ${d.ctaMark.words}${d.ctaMark.stop}`),
    p(t.cta.body),
    p(link(t.cta.primary, create)),
    h(3, t.contact.title),
    p(t.contact.lede),
    p(link(CONTACT_ADDRESS, `mailto:${CONTACT_ADDRESS}`)),
  ];
}

/** Uses.astro: the use cases by business. */
function uses({ d }: Ctx): Block[] {
  const t = d.t;
  return [
    h(2, head(t.useCases.title, t.useCases.titleBold)),
    ...d.useCases.flatMap((u) => [h(3, u.title), p(u.body), ul(u.points), p(`${t.useCases.built} ${u.uses}`)]),
  ];
}

/** Compare.astro: cards and bank transfers next to Cosmos Pay. */
function compareCards({ d }: Ctx): Block[] {
  const t = d.t;
  return [
    h(2, head(t.compare.title, t.compare.titleBold)),
    table(
      [t.compare.topic, t.compare.cards, t.compare.us],
      d.compareRows.map((row) => [row.k, row.cards, row.us]),
    ),
    p(t.compare.note),
  ];
}

/** Integrations.astro: every way to take a payment, each with its code and where to read on. */
function integrations({ d, lang, docs, create, self }: Ctx): Block[] {
  const t = d.t;
  const it = t.integrations;
  const more = {
    button: { href: `${docs}/embed`, label: it.embedDocs },
    embedded: { href: `${docs}/embed`, label: it.embedDocs },
    hosted: { href: create, label: t.paths.nocode.link },
    links: { href: create, label: t.paths.nocode.link },
    api: { href: `${docs}/api`, label: it.apiDocs },
    plugins: { href: `${self}#contact`, label: it.notify },
  } as const;
  const designs = CHECKOUT_THEMES.map((id) => MESSAGES[lang].designs[id]);
  return [
    h(2, head(it.title, it.titleBold)),
    p(it.lede),
    ...d.integrations.flatMap((opt) => {
      const copy = it[opt.key];
      return [
        h(3, `${copy.title} (${copy.tag})`),
        p(copy.body),
        ...(opt.key === "hosted" ? [p(`${it.designs}:`), ul(designs.map((design) => term(design.name, design.desc)))] : []),
        ...(opt.code ? [code(opt.code, opt.lang ?? undefined)] : []),
        p(link(more[opt.key].label, more[opt.key].href)),
      ];
    }),
    p(it.note),
  ];
}

/** Developers.astro: the developers' code by tab. */
function developers({ d, docs }: Ctx): Block[] {
  const t = d.t;
  return [
    h(2, head(t.developers.title, t.developers.titleBold)),
    p(t.developers.lede),
    ul([t.developers.rest, t.developers.sdk, t.developers.webhooks, t.developers.keys]),
    ul([link(t.developers.docs, docs), link(t.developers.reference, `${docs}/api`)]),
    ...d.codeTabs.flatMap((tab) => [h(3, t.devTabs[tab.key]), code(tab.code, tab.lang)]),
    p(t.developers.codeComment),
  ];
}

/** CompareRates.astro: each rate beside the published one it is set against. */
function compareRates({ d, lang, page, at, input }: Ctx): Block[] {
  const t = d.t;
  const c = t.comparePage;
  const usd = new Intl.NumberFormat(lang, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const checked = new Intl.DateTimeFormat(lang, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${COMPARE_CHECKED}T00:00:00Z`));
  const planName = (id: PlanId) => id.charAt(0).toUpperCase() + id.slice(1);
  const bySwap = [...PLAN_IDS].sort((a, b) => planSwapFeeBps(b) - planSwapFeeBps(a));
  const [topSwapPlan, lowSwapPlan] = [bySwap[0], bySwap[bySwap.length - 1]];
  const rows = compareRows().map((r) => {
    let oursNote = "";
    let theirsNote = "";
    if (r.service === "payments" && r.plan && r.band) {
      oursNote = r.monthly !== undefined ? fill(c.monthly, { plan: planName(r.plan), price: `$${r.monthly}` }) : fill(c.noMonthly, { plan: planName(r.plan) });
      theirsNote =
        r.band.below === null
          ? fill(c.bandFrom, { from: usd.format(r.band.from) })
          : r.band.from === 0
            ? fill(c.bandUnder, { below: usd.format(r.band.below) })
            : fill(c.bandBetween, { from: usd.format(r.band.from), to: usd.format(r.band.below - 1) });
    } else if (r.service === "swaps") {
      oursNote = fill(c.swaps, { plan: planName(topSwapPlan), min: swapFeePct(lowSwapPlan), minPlan: planName(lowSwapPlan) });
      theirsNote = c.metamask;
    } else if (r.service === "private") {
      oursNote = c.private;
      theirsNote = c.railgun;
    } else if (r.service === "escrow") {
      oursNote = c.escrow;
      theirsNote = fill(c.escrowCom, { upTo: usd.format(ESCROW_COM.upTo), min: usd.format(ESCROW_COM.minFee) });
    }
    const service = r.service === "escrow" ? `${c.services.escrow} (${t.soon})` : c.services[r.service];
    return [service, `${formatRate(r.ours)}: ${oursNote}`, `${r.provider} ${formatRate(r.theirs)}: ${theirsNote}`, link(new URL(r.source).host.replace(/^www\./, ""), r.source)];
  });
  return [
    h(2, head(c.title, c.titleBold)),
    p(c.lede),
    table([c.service, c.ours, c.theirs, c.source], rows),
    p(c.asOf.replace("{date}", checked)),
    ...c.notes.map(p),
    ul([link(t.pages.more.fees, page("/fees")), link(t.pricing.compare, at(`${input.site}/pricing`))]),
  ];
}

/** GuideList.astro / GuideLinks.astro: guides with their summaries. */
function guideList({ d, page }: Ctx, guides: readonly Guide[], level: number): Block[] {
  return guides.flatMap((guide) => {
    const copy = guideCopy(d.learn, guide);
    return [h(level, link(copy.title, page(pagePath(`learn/${guide}`)))), p(copy.summary)];
  });
}

function guideLinks(ctx: Ctx, guides: readonly Guide[], heading?: string): Block[] {
  const { d, page } = ctx;
  return [h(2, heading ?? d.learn.ui.related), p(link(d.learn.ui.all, page("/learn"))), ...guideList(ctx, guides, 3)];
}

/* ---------- the network pages (NetworkPage.astro) ---------- */

function networkFacts({ d }: Ctx, chain: Chain): Block[] {
  const t = d.t;
  const n = t.networks[chain];
  const wallets = NETWORK_WALLETS[chain].filter((name) => d.marqueeRows[2].items.some((w) => w.name === name));
  const facts: [string, string][] = [
    [t.network.link, n.link],
    [t.network.walletsTitle, n.walletsLede],
    [t.network.match, n.match],
    [t.network.settle, n.settle],
    [t.network.sandbox, n.sandbox],
  ];
  return [
    h(2, t.network.factsTitle.replace("{network}", CHAIN_NAMES[chain])),
    ...facts.flatMap(([label, text]) => [h(3, label), p(text), ...(label === t.network.walletsTitle ? [ul(wallets)] : [])]),
  ];
}

function networkAssets({ d }: Ctx, chain: Chain): Block[] {
  const t = d.t;
  const n = t.networks[chain];
  const tierName = (tier: "public" | "testnet") => (tier === "public" ? t.network.mainnet : TEST_NETWORKS[chain]);
  return [
    h(2, t.network.assetsTitle),
    p(n.assetsLede),
    table(
      [t.network.asset, n.address, t.network.tier],
      networkPresets(chain).map((r) => [
        r.issuer ? `${r.code} (${r.issuer})` : r.code,
        r.address && r.explorer ? link(r.address, r.explorer) : t.network.native,
        tierName(r.tier),
      ]),
    ),
  ];
}

function networkCode({ d, docs, page }: Ctx, chain: Chain): Block[] {
  const t = d.t;
  return [
    h(2, t.network.codeTitle.replace("{network}", CHAIN_NAMES[chain])),
    p(t.network.codeLede),
    ul([link(t.network.docs, `${docs}/api/payment-intents/`), link(t.network.guide, `${docs}/getting-started/`), link(t.network.integrations, page("/integrations"))]),
    code(payLinkCurl(chain), "bash"),
    p(t.networks[chain].codeNote),
  ];
}

function networkPage(ctx: Ctx, chain: Chain): Block[] {
  const t = ctx.d.t;
  const name = CHAIN_NAMES[chain];
  const questions = Object.values(t.networks[chain].faq).map((f) => ({ q: f.q, a: f.a.replace("{rate}", `${PRIVATE_PAYMENT_FEE_PCT}%`) }));
  return [
    ...pageHeader(t.pages[chain]),
    ...networkFacts(ctx, chain),
    ...networkAssets(ctx, chain),
    ...pricing(ctx, { compact: true, heading: t.network.feesTitle, lede: t.networks[chain].feesLede }),
    ...networkCode(ctx, chain),
    ...faq(ctx, { items: questions, heading: `${t.network.faqTitle.replace("{network}", name)} ${t.network.faqTitleBold}`, current: chain }),
    ...guideLinks(ctx, ["stellar-vs-solana-vs-monad", "accept-usdc-payments"]),
    ...finalCta(ctx),
  ];
}

/* ---------- /swaps (PublicSwaps.tsx under the page header) ---------- */

function swapsPage(ctx: Ctx): Block[] {
  const { d, lang, docs, input } = ctx;
  const sp = ((messages as Record<string, (typeof messages)["en"]>)[lang] ?? messages.en).swapsPage;
  const rates = { pct: swapFeePct("community"), ...swapFeeRange() };
  const nets = { n: String(NETWORK_IDS.length) };
  const labels = { key: sp.apiStep1, cross: sp.apiStep2, usdt0: sp.apiStep3 };
  return [
    ...pageHeader(d.t.pages.swaps),
    ul(sp.facts.map((f) => term(fill(f.t, nets), fill(f.s, nets)))),
    p(fill(sp.fee, rates)),
    h(2, sp.usdt0Title),
    p(fill(sp.usdt0Lede, { n: String(USDT0_OTHER_NETWORKS_BEFORE_ROUTES) })),
    h(2, sp.apiTitle),
    p(fill(sp.apiLede, rates)),
    ...publicSwapCalls(input.api).flatMap((call) => [h(3, labels[call.key]), code(call.code, "bash")]),
    p(link(sp.apiDocs, `${docs}/api`)),
    h(2, sp.faqTitle),
    ...sp.faq.flatMap((x) => [h(3, x.q), p(fill(x.a, rates))]),
  ];
}

/* ---------- the guides (learn/index.astro, GuidePage.astro) ---------- */

function learnHub(ctx: Ctx): Block[] {
  const hub = ctx.d.learn.hub;
  return [...pageHeader(hub), ...guideList(ctx, GUIDES, 2), ...finalCta(ctx)];
}

function guidePage(ctx: Ctx, guide: Guide): Block[] {
  const { d, lang, docs, page } = ctx;
  const t = d.t;
  const learn = d.learn;
  const g = guideCopy(learn, guide);
  const cfg = GUIDE_CONFIG[guide];
  const vars = { starterRate: PLAN_SPECS.starter.perTx };
  const text = (s: string) => fill(s, vars);
  const HREF = learnHrefs(docs);
  const linksOf = (links: Partial<Record<LearnLink, string>> | undefined): Block[] => {
    const entries = Object.entries(links ?? {});
    return entries.length ? [ul(entries.map(([key, label]) => link(label as string, HREF[key as LearnLink].startsWith("/") ? page(HREF[key as LearnLink]) : HREF[key as LearnLink])))] : [];
  };
  const updated = fill(learn.ui.updated, {
    date: new Intl.DateTimeFormat(lang, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${GUIDE_DATES[guide].modified}T00:00:00Z`)),
  });
  // The network comparison (NetworkTable.astro): its facts from the presets, the wallets each
  // network page names and Starter's rate.
  const networkTable = (): Block[] => {
    const tbl = learn.guides.networks.table;
    const wallets = new Intl.ListFormat(lang, { style: "long", type: "disjunction" });
    const codes = (chain: Chain, tier: "public" | "testnet") =>
      networkPresets(chain)
        .filter((r) => r.tier === tier)
        .map((r) => r.code)
        .join(", ");
    const rows = Object.entries(tbl.rows).map(([key, row]) => [
      row.k,
      ...CHAINS.map((chain) => {
        if (key === "presets") return codes(chain, "public");
        if (key === "test") return `${TEST_NETWORKS[chain]} (${codes(chain, "testnet")})`;
        if ("value" in row) return fill(row.value, vars);
        return fill((row as Record<Chain, string>)[chain], { ...vars, wallets: wallets.format(NETWORK_WALLETS[chain]) });
      }),
    ]);
    return [h(2, tbl.title), table([tbl.topic, ...CHAINS.map((chain) => link(CHAIN_NAMES[chain], page(`/${chain}`)))], rows), p(tbl.note)];
  };
  const blocks = cfg.order.flatMap((key): Block[] => {
    if (key === "table") return networkTable();
    if (key === "steps" && g.steps) {
      const steps = Object.values(g.steps.items).map((s) => term(text(s.title), text(s.body)));
      return [h(2, text(g.steps.title)), ol(steps), ...linksOf(g.steps.links)];
    }
    const s = g.sections[key];
    if (!s) return [];
    return [h(2, text(s.title)), ...(s.body ?? []).map((x) => p(text(x))), ...(s.points ? [ul(s.points.map(text))] : []), ...linksOf(s.links)];
  });
  const questions = g.faq ? Object.values(g.faq).map((f) => ({ q: text(f.q), a: text(f.a) })) : undefined;
  return [
    h(1, g.title),
    p(text(g.lede)),
    p(`${updated} · ${learn.ui.by}`),
    ...blocks,
    ...(questions ? faq(ctx, { items: questions, heading: head(t.faq.title, t.faq.titleBold) }) : []),
    ...guideLinks(ctx, cfg.related, learn.ui.more),
    ...finalCta(ctx),
  ];
}

/* ---------- every page, as its .astro file orders its sections ---------- */

function homePage(ctx: Ctx): Block[] {
  const { d, page } = ctx;
  const more = d.t.pages.more;
  return [
    ...hero(ctx),
    ...marks(ctx),
    ...benefits(ctx),
    ...inlineCta(ctx, { href: page("/use-cases"), label: more.useCases }),
    ...how(ctx),
    ...inlineCta(ctx, { href: page("/integrations"), label: more.integrations }),
    ...paths(ctx),
    ...pricing(ctx, { compact: true }),
    ...security(ctx, true),
    ...faq(ctx, { limit: 4 }),
    ...finalCta(ctx),
  ];
}

function contentPage(ctx: Ctx, page: PaymentsPage): Block[] {
  const t = ctx.d.t;
  const header = (key: CopyPage) => pageHeader(t.pages[key]);
  switch (page) {
    case "integrations":
      return [...header("integrations"), ...integrations(ctx), ...developers(ctx), ...paths(ctx), ...guideLinks(ctx, ["accept-usdc-payments", "whatsapp-payment-links"]), ...finalCta(ctx)];
    case "use-cases":
      return [...header("useCases"), ...uses(ctx), ...compareCards(ctx), ...finalCta(ctx)];
    case "security":
      return [...header("security"), ...security(ctx, false), ...finalCta(ctx)];
    case "fees":
      return [...header("fees"), ...pricing(ctx, { compact: false }), ...finalCta(ctx)];
    case "compare":
      return [...header("compare"), ...compareRates(ctx), ...finalCta(ctx)];
    case "faq":
      return [
        ...header("faq"),
        ...faq(ctx),
        ...guideLinks(ctx, ["stablecoin-payment-gateway", "accept-usdc-payments", "whatsapp-payment-links", "stellar-vs-solana-vs-monad"]),
        ...finalCta(ctx),
      ];
    case "swaps":
      return swapsPage(ctx);
    case "stellar":
    case "solana":
    case "monad":
      return networkPage(ctx, page);
    case "learn":
      return learnHub(ctx);
    default: {
      const guide = guideOf(page);
      return guide ? guidePage(ctx, guide) : [];
    }
  }
}

/** The page's search title and description, as its <head> states them. */
function meta(d: LandingContent, page: PaymentsPage | "home"): { title: string; description: string } {
  if (page === "home") return pageMeta(d.t, "home");
  if (page === "learn") return { title: d.learn.hub.meta, description: d.learn.hub.description };
  const guide = guideOf(page);
  if (guide) {
    const g = guideCopy(d.learn, guide);
    return { title: g.meta, description: g.description };
  }
  return pageMeta(d.t, COPY_KEY[page] as CopyPage);
}

/** The gateway page at `path` in `lang` as a document; null for a path that is not one of its
 *  indexable pages or a language it does not speak. */
export function paymentsPageDoc(path: string, lang: string, input: MarkdownInput): PageDoc | null {
  if (!PAYMENTS_LANGS.includes(lang)) return null;
  const page = path === "/" ? "home" : PAYMENTS_PAGES.find((x) => pagePath(x) === path);
  if (!page) return null;
  const locale = lang as Locale;
  const d = landingContent(locale);
  const hosts = { site: input.site, payments: input.payments };
  const self = pageUrl(input.payments, path, lang);
  const ctx: Ctx = {
    lang: locale,
    d,
    input,
    docs: `${input.dev}/docs`,
    create: loginUrl(input.dev, "/dashboard?view=payments"),
    page: (to) => localizeHref(pageUrl(input.payments, to), lang, hosts),
    at: (href) => localizeHref(href, lang, hosts),
    self,
  };
  const { title, description } = meta(d, page);
  return { title, description, url: self, lang, blocks: page === "home" ? homePage(ctx) : contentPage(ctx, page) };
}
