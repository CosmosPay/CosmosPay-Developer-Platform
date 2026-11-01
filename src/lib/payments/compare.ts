/* compare.ts: the gateway's comparison page (/compare). Every Cosmos Pay rate is set at 75% of a
   named provider's published rate, rounded down (CLAUDE.md, "Plans"): payments against BitPay's
   tiers, swaps against MetaMask's fee, private payments against RAILGUN's and escrow against
   Escrow.com's. This file holds those published rates as each provider's own public page stated
   them on COMPARE_CHECKED, with the page's address, and pairs them with Cosmos Pay's rates from
   src/lib/plans.ts (never written here). A rate that cannot be read on the provider's own page
   does not belong in this list. Pure, so tests/unit/paymentsCompare.test.ts checks that every
   Cosmos Pay rate stays at or under 75% of the rate it is shown next to. */
import { ESCROW_FEE_PCT, PLAN_IDS, PLAN_SPECS, PRIVATE_PAYMENT_FEE_PCT, planSwapFeeBps, type PlanId } from "@/lib/plans";

/** The day each published rate below was read on its provider's page (YYYY-MM-DD, UTC). */
export const COMPARE_CHECKED = "2026-10-31";

export interface Rate {
  pct: number;
  /** A fixed part per payment, in US cents. */
  cents?: number;
}

/** BitPay's crypto acceptance fees, by monthly transaction volume in USD ("Rates are
 *  automatically adjusted based on cumulative monthly volume"; higher in high-risk industries). */
export const BITPAY = {
  name: "BitPay",
  source: "https://www.bitpay.com/pricing",
  tiers: [
    { from: 0, below: 500_000, rate: { pct: 2, cents: 25 } },
    { from: 500_000, below: 1_000_000, rate: { pct: 1.5, cents: 25 } },
    { from: 1_000_000, below: null, rate: { pct: 1, cents: 25 } },
  ],
} as const;

/** MetaMask's swap fee ("MetaMask fee: 0.875%", Swaps user guide, "How are fees calculated?"). */
export const METAMASK = { name: "MetaMask", source: "https://support.metamask.io/trade/swap/user-guide-swaps/", rate: { pct: 0.875 } } as const;

/** RAILGUN's protocol deduction: 0.25% per shield and per unshield. */
export const RAILGUN = { name: "RAILGUN", source: "https://docs.railgun.org/wiki/learn/railgun-deductions", rate: { pct: 0.25 } } as const;

/** Escrow.com's standard fee for a transaction of $0 to $5,000 (merchandise and shipping): 2.6%,
 *  $50 minimum; larger amounts pay less. */
export const ESCROW_COM = { name: "Escrow.com", source: "https://www.escrow.com/fee-calculator", upTo: 5_000, minFee: 50, rate: { pct: 2.6 } } as const;

/** "1.5% + 18¢" → { pct: 1.5, cents: 18 }; null for a rate with no figure ("Custom"). */
export function parseRate(text: string): Rate | null {
  const m = /^\s*(\d+(?:\.\d+)?)%(?:\s*\+\s*(\d+(?:\.\d+)?)¢)?\s*$/.exec(text);
  if (!m) return null;
  return { pct: Number(m[1]), ...(m[2] !== undefined && { cents: Number(m[2]) }) };
}

/** A rate as the providers write it: "2% + 25¢", "0.875%". */
export function formatRate(rate: Rate): string {
  return rate.cents === undefined ? `${rate.pct}%` : `${rate.pct}% + ${rate.cents}¢`;
}

export type CompareService = "payments" | "swaps" | "private" | "escrow";

export interface CompareRow {
  service: CompareService;
  /** The plan this Cosmos Pay rate belongs to, where rates differ by plan. */
  plan?: PlanId;
  /** A plan's fixed monthly price in USD, where it has one ("$33/mo" → 33). */
  monthly?: number;
  ours: Rate;
  provider: string;
  source: string;
  theirs: Rate;
  /** BitPay's monthly volume band, in USD. */
  band?: { from: number; below: number | null };
}

const monthlyOf = (price: string): number | undefined => {
  const m = /^\$(\d+(?:\.\d+)?)\/mo$/.exec(price.trim());
  return m ? Number(m[1]) : undefined;
};

/* The plans with a rate per payment, cheapest plan first, beside BitPay's tiers lowest volume
   first: the order the rule pairs them in (Starter with 2%, Essentials with 1.5%, Growth with 1%). */
function paymentRows(): CompareRow[] {
  const priced = PLAN_IDS.flatMap((id) => {
    const rate = parseRate(PLAN_SPECS[id].perTx);
    return rate ? [{ id, rate }] : [];
  });
  return priced.slice(0, BITPAY.tiers.length).map(({ id, rate }, i) => {
    const tier = BITPAY.tiers[i];
    const monthly = monthlyOf(PLAN_SPECS[id].price);
    return {
      service: "payments" as const,
      plan: id,
      ...(monthly !== undefined && { monthly }),
      ours: rate,
      provider: BITPAY.name,
      source: BITPAY.source,
      theirs: tier.rate,
      band: { from: tier.from, below: tier.below },
    };
  });
}

/** Every row of the comparison, in the order the page shows them. */
export function compareRows(): CompareRow[] {
  const swapPct = (id: PlanId) => planSwapFeeBps(id) / 100;
  // The highest swap commission of the plans offered (Starter's) stands for the ladder; the page
  // names the lowest too.
  const topSwap = Math.max(...PLAN_IDS.map(swapPct));
  return [
    ...paymentRows(),
    { service: "swaps", ours: { pct: topSwap }, provider: METAMASK.name, source: METAMASK.source, theirs: METAMASK.rate },
    { service: "private", ours: { pct: PRIVATE_PAYMENT_FEE_PCT }, provider: RAILGUN.name, source: RAILGUN.source, theirs: RAILGUN.rate },
    { service: "escrow", ours: { pct: ESCROW_FEE_PCT }, provider: ESCROW_COM.name, source: ESCROW_COM.source, theirs: ESCROW_COM.rate },
  ];
}

/** The providers named on the page, each once, with its pricing page. */
export function compareSources(): { provider: string; source: string }[] {
  const seen = new Map<string, string>();
  for (const row of compareRows()) if (!seen.has(row.provider)) seen.set(row.provider, row.source);
  return [...seen].map(([provider, source]) => ({ provider, source }));
}
