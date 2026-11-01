/* The gateway's guides: their copy in the seven languages of the payments catalog (one file per
   language, each mirroring en.ts key for key, tests/unit/paymentsI18n.test.ts), and what each guide
   page draws besides its words: the order of its blocks, the schema.org type of its article, whether
   its steps are a HowTo, its header render and the interface mock-ups beside its steps and sections
   (src/components/payments/landing/Mock.astro, decorative). The pages are registered in
   src/lib/payments/site-pages.ts and drawn by src/components/payments/learn/GuidePage.astro. Pure. */
import type { Locale } from "@/lib/payments/i18n";
import type { Guide } from "@/lib/payments/site-pages";
import type { LearnLink } from "@/lib/payments/learn/links";
import { en, type LearnMessages } from "@/lib/payments/learn/en";
import { es } from "@/lib/payments/learn/es";
import { pt } from "@/lib/payments/learn/pt";
import { fr } from "@/lib/payments/learn/fr";
import { de } from "@/lib/payments/learn/de";
import { hi } from "@/lib/payments/learn/hi";
import { zh } from "@/lib/payments/learn/zh";

export type { LearnMessages };
export const LEARN: Record<Locale, LearnMessages> = { en, es, pt, fr, de, hi, zh };

export type GuideKey = keyof LearnMessages["guides"];

/** The catalog key of each guide, by its slug. */
export const GUIDE_KEYS: Record<Guide, GuideKey> = {
  "accept-usdc-payments": "acceptUsdc",
  "whatsapp-payment-links": "whatsapp",
  "stablecoin-payment-gateway": "gateway",
  "stellar-vs-solana-vs-monad": "networks",
};

/* The shapes every guide's copy shares; the four differ only in which parts they have. */
export interface GuideSection {
  title: string;
  body?: string[];
  points?: string[];
  links?: Partial<Record<LearnLink, string>>;
}
export interface GuideSteps {
  title: string;
  items: Record<string, { title: string; body: string }>;
  links?: Partial<Record<LearnLink, string>>;
}
export interface GuideCopy {
  nav: string;
  title: string;
  meta: string;
  description: string;
  summary: string;
  lede: string;
  sections: Record<string, GuideSection>;
  steps?: GuideSteps;
  faq?: Record<string, { q: string; a: string }>;
}

/** A guide's copy in a language, read through the shared shape. */
export function guideCopy(t: LearnMessages, guide: Guide): GuideCopy {
  return t.guides[GUIDE_KEYS[guide]] as GuideCopy;
}

/* The mock-ups a guide may show (a subset of Mock.astro's names). */
export type GuideMock = "checkout" | "step-share" | "step-confirm" | "link" | "step-create";

export interface GuideConfig {
  /** schema.org type of the page's article: a how-to or a comparison is a TechArticle. */
  type: "TechArticle" | "Article";
  /** The blocks in page order: a section key, "steps" or "table" (the network comparison). */
  order: readonly string[];
  /** The steps are a HowTo in the JSON-LD (only where the page shows them as numbered steps). */
  howTo: boolean;
  /** The header's 3D render (public/media/landing). */
  art: string;
  /** Mock-ups beside a block (by block key). */
  mocks: Partial<Record<string, GuideMock>>;
  /** The guides it points to at its end. */
  related: readonly Guide[];
}

export const GUIDE_CONFIG: Record<Guide, GuideConfig> = {
  "accept-usdc-payments": {
    type: "TechArticle",
    order: ["need", "payer", "ways", "steps", "network", "cost"],
    howTo: true,
    art: "3d-link",
    mocks: { ways: "link", steps: "checkout" },
    related: ["whatsapp-payment-links", "stellar-vs-solana-vs-monad", "stablecoin-payment-gateway"],
  },
  "whatsapp-payment-links": {
    type: "TechArticle",
    order: ["before", "steps", "customer", "know"],
    howTo: true,
    art: "3d-chat",
    mocks: { steps: "step-share", customer: "checkout" },
    related: ["accept-usdc-payments", "stablecoin-payment-gateway", "stellar-vs-solana-vs-monad"],
  },
  "stablecoin-payment-gateway": {
    type: "Article",
    order: ["stablecoin", "does", "settle", "fees", "custody", "fit"],
    howTo: false,
    art: "3d-yours",
    mocks: { does: "step-confirm" },
    related: ["accept-usdc-payments", "stellar-vs-solana-vs-monad", "whatsapp-payment-links"],
  },
  "stellar-vs-solana-vs-monad": {
    type: "TechArticle",
    order: ["table", "choose", "fees"],
    howTo: false,
    art: "3d-final",
    mocks: {},
    related: ["accept-usdc-payments", "stablecoin-payment-gateway", "whatsapp-payment-links"],
  },
};

/** Fills `{name}` placeholders; an unknown one stays as written. */
export function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}
