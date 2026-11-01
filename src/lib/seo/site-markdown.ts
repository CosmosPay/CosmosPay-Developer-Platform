/* site-markdown.ts: the company site's indexable pages (cosmospay.lat: the home, /pricing, /about
   and /tos) as Markdown, in each language they are written in. Each page is read from what its
   components render, section by section and in their order: the platform catalogs
   (src/lib/i18n/messages), the home's figures and lists (src/components/cosmos/marketing/data.ts),
   the plans (src/lib/plans.ts, every rate read from there), the About page's links
   (src/lib/site/about.ts) and the terms (src/lib/site/terms.ts). Interactive parts become what they
   say (a modal's text, a button's link). Links are absolute and keep the page's language
   (localizeHref). /swaps is left out: its canonical page is the gateway's. Pure, so
   tests/unit/seoMarkdown.test.ts covers it. */
import { messages } from "@/lib/i18n/messages/index";
import { PLAN_IDS, PLAN_SPECS, ESCROW_FEE_PCT, PRIVATE_PAYMENT_FEE_PCT, swapFeePct, type PlanId } from "@/lib/plans";
import { NETWORK_IDS } from "@/lib/chains";
import { loginUrl } from "@/lib/urls";
import { CONTACT_ADDRESS } from "@/lib/payments/contact";
import { GITHUB_ORG, SDK_NPM, SDK_PACKAGE, chromeStoreListing } from "@/lib/seo/schema";
import { localizeHref, pageUrl } from "@/lib/seo/lang-urls";
import { PAGE_LANGS, TOS_LAST_UPDATED, siteMeta, type SitePage } from "@/lib/seo/site-meta";
import { ABOUT_REPOS, aboutLinks } from "@/lib/site/about";
import { termsText } from "@/lib/site/terms";
import { PLAN_META } from "@/components/cosmos/pricing/data";
import {
  ANDROID_SIZE,
  API_CARD_DOCS,
  API_CARD_KEYS,
  API_SNIPPET,
  MARKETPLACE_URL,
  PATH_TARGETS,
  RESOURCE_DOCS,
  SCALE_VALUES,
  SDK_DOCS,
  SDK_INSTALL,
  SDK_KEYS,
  SOL_META,
  STAT_VALUES,
  STAT_VARS,
  STORY_KEYS,
  SWAP_NETWORKS,
  WALLET_LINKS,
  WALLET_MORE,
  WALLET_VERSION,
} from "@/components/cosmos/marketing/data";
import { code, h, link, p, table, term, ul, type Block, type MarkdownInput, type PageDoc } from "@/lib/seo/markdown";

type Catalog = (typeof messages)["en"];

/** The company site's pages that have a Markdown version, by path. */
export const SITE_MARKDOWN_PAGES: Readonly<Record<string, Exclude<SitePage, "swaps">>> = {
  "/": "home",
  "/pricing": "pricing",
  "/about": "about",
  "/tos": "tos",
};

/** `{name}` placeholders filled, an unknown one left as written (the catalogs' fmt). */
const fill = (text: string, vars: Record<string, string | number>): string => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

interface Ctx {
  lang: string;
  c: Catalog;
  input: MarkdownInput;
  docs: string;
  /** The platform's sign-in, then the dashboard: where "Get API keys" and the plan buttons lead
   *  for a visitor who is not signed in (ctaProps). */
  login: string;
  /** An absolute link in the page's language (a page of either host keeps `?lang=`). */
  at: (href: string) => string;
}

function home({ c, input, docs, login, at, lang }: Ctx): Block[] {
  const l = c.landing;
  const w = l.wallet;
  const d = l.devs;
  const a = l.api;
  const ig = l.integration;
  const s = l.solutions;
  const st = l.stats;
  const stories = l.stories;
  const r = l.resources;
  const m = l.marketplace;
  const cta = l.cta;
  const nets = { n: SWAP_NETWORKS };
  const self = pageUrl(input.site, "/", lang);
  const pathHref = (i: number): string => {
    const target = PATH_TARGETS[i];
    return target.to === "dashboard" ? `${input.dev}/dashboard` : `${docs}${target.path}`;
  };
  return [
    // The wallet panel: the page's h1, what Cosmos Pay is.
    h(1, w.title),
    p(w.tag),
    p(w.lede),
    ul([
      term(link(w.chrome.t, chromeStoreListing(WALLET_LINKS.chrome)), w.chrome.s),
      term(link(w.web.t, WALLET_LINKS.webapp), w.web.s),
      term(`${link(w.android.t, WALLET_LINKS.android)} (${ANDROID_SIZE})`, w.android.s),
    ]),
    p(`${w.moreLabel} (${w.versionLabel} v${WALLET_VERSION}):`),
    ul([
      ...WALLET_MORE.map((x) => {
        const extra = "extra" in x && x.extra ? `; ${x.extra.map((e) => `${link(e.label, e.href)} (${e.size})`).join(", ")}` : "";
        return term(`${link(w.more[x.k as keyof typeof w.more].t, x.href)} (${x.size})`, `${w.more[x.k as keyof typeof w.more].s}${extra}`);
      }),
      w.ios,
    ]),
    // The developers' hero.
    h(2, l.hero.headline.split("->").map((part) => part.trim()).join(" ")),
    p(l.hero.tagline),
    p(l.hero.lede),
    ul([link(l.hero.getKeys, login), `\`${SDK_INSTALL}\``]),
    // DevKit.
    h(2, d.title),
    p(d.lede),
    h(3, d.installTitle),
    p(d.installDesc),
    code(SDK_INSTALL, "bash"),
    h(3, d.llmsTitle),
    p(d.llmsDesc),
    ul([link(d.llmsBtn, `${docs}/llms.txt`), link(d.docsBtn, docs)]),
    // The API.
    h(2, a.title),
    p(a.lede),
    ...API_CARD_KEYS.flatMap((key) => {
      const card = a.cards[key as keyof typeof a.cards];
      return [h(3, card.title), p(fill(card.desc, nets)), p(link(card.link, `${docs}${API_CARD_DOCS[key]}`))];
    }),
    h(3, a.docsTitle),
    p(a.docsDesc),
    code(API_SNIPPET, "ts"),
    ul([...SDK_KEYS.map((key) => link(a.sdkBtns[key as keyof typeof a.sdkBtns], `${docs}${SDK_DOCS[key]}`)), link(a.exploreDocs, docs)]),
    // The integration paths, with the facts beside them.
    h(2, ig.title),
    p(ig.lede),
    ul(SCALE_VALUES.map((value, i) => `${value} ${ig.scale[i]}`)),
    ...ig.paths.flatMap((path, i) => [h(3, path.t), p(path.d), p(link(path.a, pathHref(i)))]),
    // Solutions, each with what its card opens.
    h(2, s.title),
    p(s.lede),
    ...SOL_META.flatMap(({ i }) => {
      const item = s.items[i as keyof typeof s.items];
      return [h(3, item.t), p(fill(item.d, nets)), p(fill(item.long, nets)), ul(item.points.map((point) => fill(point, nets)))];
    }),
    // What Cosmos Pay is, and the figures the code backs.
    h(2, st.title),
    h(3, st.question),
    p(st.answer),
    ul(STAT_VALUES.map((value, i) => `${value.n}${value.u} ${fill(st.items[i], STAT_VARS)}`)),
    // Use cases, each with what its card opens.
    h(2, stories.title),
    p(stories.lede),
    ...STORY_KEYS.flatMap((key) => {
      const item = stories.items[key as keyof typeof stories.items];
      return [h(3, item.t), p(item.label), p(item.story), p(item.tags.join(", "))];
    }),
    // Resources: pages of the public docs.
    h(2, r.title),
    p(r.lede),
    ul(r.items.map((item, i) => term(`${link(item.t, `${docs}${RESOURCE_DOCS[i]}`)} (${item.tag})`, item.d))),
    // The marketplace.
    h(2, m.title),
    p(m.lede),
    p(link(m.btn, MARKETPLACE_URL)),
    // The final call.
    h(2, cta.title),
    p(cta.label),
    p(cta.desc),
    ul([
      link(cta.getKeys, login),
      term(link(cta.helpers[0].b, at(`${input.site}/pricing`)), cta.helpers[0].s),
      term(link(cta.helpers[1].b, `${self}#api`), cta.helpers[1].s),
    ]),
    p(cta.thanks),
  ];
}

/** A plan's monthly fee as the page states it, from plans.ts: "$33/mo" (and the yearly billing's
 *  price where the plan has one), the catalog's word for none, or for a custom price. */
function monthlyFee(id: PlanId, c: Catalog, annual?: number): string {
  const pr = c.pricing;
  const spec = PLAN_SPECS[id];
  const monthly = /^\$(\d+(?:\.\d+)?)\/mo$/.exec(spec.price)?.[1];
  if (monthly) return `$${monthly}${pr.perMo}${annual ? ` ($${annual}${pr.perMo} ${pr.billedYearly})` : ""}`;
  if (spec.price === "Custom") return pr.enterprise.price;
  return String(pr.compare[0].v[0]);
}

/** A plan's rate per payment from plans.ts; the catalog's word for a custom one. */
const perTx = (id: PlanId, c: Catalog): string => (PLAN_SPECS[id].perTx === "Custom" ? c.pricing.enterprise.price : PLAN_SPECS[id].perTx);
const limit = (n: number | null): string => (n === null ? "∞" : String(n));

function pricing({ c, login }: Ctx): Block[] {
  const pr = c.pricing;
  const [monthlyRow, perTxRow, ...otherRows] = pr.compare;
  const limits = (id: PlanId) => [
    term(pr.ratesRows.swaps, swapFeePct(id)),
    term(pr.orgsRow, limit(PLAN_SPECS[id].maxOrgs)),
    term(pr.seatsRow, limit(PLAN_SPECS[id].maxSeats)),
    term(pr.keysRow, limit(PLAN_SPECS[id].maxApiKeys)),
  ];
  // The plan cards: Starter, Essentials and Growth (PLAN_META by position), then Enterprise.
  const cards = pr.plans.flatMap((plan, i) => {
    const id = PLAN_IDS[i];
    const meta = PLAN_META[i];
    return [
      h(2, plan.name),
      ...("featured" in meta && meta.featured ? [p(pr.popular)] : []),
      p(plan.desc),
      ul([
        term(monthlyRow.l, monthlyFee(id, c, "ann" in meta ? meta.ann : undefined)),
        term(perTxRow.l, `${perTx(id, c)} *`),
        ...limits(id),
        ...plan.feats.filter((_, j) => meta.on[j]),
      ]),
      p(link(plan.cta, login)),
    ];
  });
  const ent = pr.enterprise;
  const rates = pr.ratesRows;
  // The comparison: the fees from plans.ts, each service's rate, the catalog's rows, the limits.
  const cellOf = (v: string | number): string => (v === 1 ? "✓" : v === 0 ? "-" : String(v));
  const rows: string[][] = [
    [monthlyRow.l, ...PLAN_IDS.map((id) => monthlyFee(id, c))],
    [perTxRow.l, ...PLAN_IDS.map((id) => perTx(id, c))],
    [rates.swaps, ...PLAN_IDS.map((id) => swapFeePct(id))],
    [`${rates.escrow} (${pr.soon})`, ...PLAN_IDS.map(() => `+${ESCROW_FEE_PCT}%`)],
    [rates.privatePayments, ...PLAN_IDS.map(() => `${PRIVATE_PAYMENT_FEE_PCT}%`)],
    [rates.ownFee, ...PLAN_IDS.map(() => "✓")],
    ...otherRows.map((row) => [row.l, ...row.v.map(cellOf)]),
    [pr.orgsRow, ...PLAN_IDS.map((id) => limit(PLAN_SPECS[id].maxOrgs))],
    [pr.seatsRow, ...PLAN_IDS.map((id) => limit(PLAN_SPECS[id].maxSeats))],
    [pr.keysRow, ...PLAN_IDS.map((id) => limit(PLAN_SPECS[id].maxApiKeys))],
  ];
  const swapRates = { ...Object.fromEntries(PLAN_IDS.map((id) => [id, swapFeePct(id)])), public: swapFeePct("community") };
  return [
    h(1, pr.title),
    p(pr.lede),
    ...cards,
    h(2, ent.name),
    p(ent.desc),
    ul([term(perTxRow.l, perTx("enterprise", c)), ...limits("enterprise"), ...ent.feats]),
    p(ent.subt),
    p(pr.footnote),
    h(2, pr.compareTitle),
    table(pr.compareHead, rows),
    h(2, pr.faqTitle),
    ...pr.faqs.flatMap((f) => [h(3, f.q), p(fill(f.a, swapRates))]),
    h(2, pr.ctaTitle),
    p(pr.ctaDesc),
    p(link(pr.openDashboard, login)),
  ];
}

function about({ c, input, at }: Ctx): Block[] {
  const t = c.about;
  const links = aboutLinks(input);
  const mailto = `mailto:${CONTACT_ADDRESS}`;
  return [
    h(1, t.title),
    p(t.lede),
    p(t.disambiguation),
    ul([
      term(t.facts.networks, t.facts.networksValue),
      term(t.facts.based, t.facts.basedValue),
      term(t.facts.code, link(GITHUB_ORG.replace(/^https:\/\//, ""), GITHUB_ORG)),
      term(t.facts.sdk, link(SDK_PACKAGE, SDK_NPM)),
      term(t.facts.email, link(CONTACT_ADDRESS, mailto)),
    ]),
    h(2, t.products.title),
    p(t.products.lede),
    ul(links.networks.map((href, i) => link(c.footer.groups.networks.links[i], at(href)))),
    ...links.products.flatMap((product) => {
      const item = t.products.items[product.key];
      return [h(3, item.t), p(item.d.replace(/\{n\}/g, String(NETWORK_IDS.length))), p(link(item.a, at(product.href)))];
    }),
    h(2, t.code.title),
    p(t.code.lede),
    ...ABOUT_REPOS.flatMap((repo) => [h(3, repo.name), p(t.code.repos[repo.key]), p(link(t.code.view, `${GITHUB_ORG}/${repo.name}`))]),
    ul([link(t.code.org, GITHUB_ORG), link(t.code.npm, SDK_NPM)]),
    h(2, t.checks.title),
    p(t.checks.lede),
    ...links.checks.flatMap((check) => {
      const item = t.checks.items[check.key] as { t: string; d: string; a: string; b?: string };
      return [h(3, item.t), p(item.d), ul(check.links.map((l) => link(item[l.label] ?? item.a, at(l.href))))];
    }),
    h(2, t.contact.title),
    p(t.contact.lede),
    ul([link(CONTACT_ADDRESS, mailto), link(t.contact.support, links.support)]),
    h(3, t.contact.profiles),
    ul(Object.entries(input.profiles).map(([name, url]) => link(name, url))),
  ];
}

function tos({ lang }: Ctx): Block[] {
  const t = termsText(lang);
  return [h(1, t.title), p(`${t.updated}: ${TOS_LAST_UPDATED}`), p(t.intro), ...t.sections.flatMap((s) => [h(2, s.h), ...s.ps.map(p)])];
}

const BUILDERS: Record<Exclude<SitePage, "swaps">, (ctx: Ctx) => Block[]> = { home, pricing, about, tos };

/**
 * The company-site page at `path` in `lang` as a document, or null when it has no Markdown
 * version or is not written in that language (the terms exist in English and Spanish).
 */
export function sitePageDoc(path: string, lang: string, input: MarkdownInput): PageDoc | null {
  const page = Object.hasOwn(SITE_MARKDOWN_PAGES, path) ? SITE_MARKDOWN_PAGES[path] : undefined;
  if (!page || !PAGE_LANGS[page].includes(lang)) return null;
  const c = (messages as Record<string, Catalog>)[lang] ?? messages.en;
  const hosts = { site: input.site, payments: input.payments };
  const ctx: Ctx = {
    lang,
    c,
    input,
    docs: `${input.dev}/docs`,
    login: loginUrl(input.dev, "/dashboard"),
    at: (href) => localizeHref(href, lang, hosts),
  };
  const meta = siteMeta(page, lang);
  return { title: meta.title, description: meta.description, url: pageUrl(input.site, path, lang), lang, blocks: BUILDERS[page](ctx) };
}

