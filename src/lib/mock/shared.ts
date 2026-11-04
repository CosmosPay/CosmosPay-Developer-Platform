/* Identities several mock handlers refer to, so the views agree with each other: the sample
   account's organizations, the wallets each one receives payments in, and the customers (with
   their wallets per environment). The full records are built by the handler that owns them
   (platform.ts for organizations and wallets, payments.ts for customers). */
import type { Chain } from "@/lib/chains";
import type { MockEnv } from "@/lib/mock/http";
import { COMPANIES, daysAgo, emailFor, evmAddress, solanaAddress, stellarAccount, uuid } from "@/lib/mock/fixtures";

export interface MockOrgSeed {
  id: string;
  name: string;
  /** The sample account's role in it. */
  role: "owner" | "admin" | "member";
  createdAt: string;
}

/** The sample account owns the first two and is a member of the third. */
export const MOCK_ORG_SEEDS: MockOrgSeed[] = [
  { id: "org_mock_andes", name: "Andes Commerce", role: "owner", createdAt: daysAgo(240) },
  { id: "org_mock_salta", name: "Salta Labs", role: "owner", createdAt: daysAgo(96) },
  { id: "org_mock_puna", name: "Puna Market", role: "member", createdAt: daysAgo(31) },
];

export const DEFAULT_MOCK_ORG_ID = MOCK_ORG_SEEDS[0].id;

/** The organization the shared public consumer's swaps (the public swap pages, through the mock
    gateway) are filed under; its swaps pay the community plan's commission. */
export const MOCK_PUBLIC_ORG = "org_mock_public";

export interface MockWalletSeed {
  id: string;
  orgId: string;
  chain: Chain;
  address: string;
  label: string | null;
  provider: string | null;
  createdAt: string;
}

/** Every organization receives on each chain; a payment link's destination is one of these. */
export function mockOrgWalletSeeds(orgId: string): MockWalletSeed[] {
  return [
    { id: uuid(`wallet:${orgId}:stellar`), orgId, chain: "stellar", address: stellarAccount(`org:${orgId}:main`), label: "Treasury", provider: "freighter", createdAt: daysAgo(200) },
    { id: uuid(`wallet:${orgId}:stellar2`), orgId, chain: "stellar", address: stellarAccount(`org:${orgId}:fees`), label: "Fees", provider: null, createdAt: daysAgo(120) },
    { id: uuid(`wallet:${orgId}:solana`), orgId, chain: "solana", address: solanaAddress(`org:${orgId}:main`), label: "Solana sales", provider: "phantom", createdAt: daysAgo(90) },
    { id: uuid(`wallet:${orgId}:monad`), orgId, chain: "monad", address: evmAddress(`org:${orgId}:main`), label: null, provider: "metamask", createdAt: daysAgo(45) },
  ];
}

export interface MockCustomerSeed {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  /** Wallets per chain (one Stellar wallet for everyone, some with Solana and Monad too). */
  wallets: { id: string; chain: Chain; address: string; name: string | null; createdAt: string }[];
}

/** The same customers in both environments (their ids differ per environment, as in the API). */
export function mockCustomerSeeds(env: MockEnv): MockCustomerSeed[] {
  return COMPANIES.map((name, i) => {
    const key = `${env}:customer:${i}`;
    const createdAt = daysAgo(220 - i * 13);
    const wallets: MockCustomerSeed["wallets"] = [
      { id: uuid(`${key}:w:stellar`), chain: "stellar", address: stellarAccount(`${key}:stellar`), name: "Main", createdAt },
    ];
    if (i % 3 === 0) wallets.push({ id: uuid(`${key}:w:solana`), chain: "solana", address: solanaAddress(`${key}:solana`), name: null, createdAt });
    if (i % 4 === 1) wallets.push({ id: uuid(`${key}:w:monad`), chain: "monad", address: evmAddress(`${key}:monad`), name: "Ops", createdAt });
    if (i % 5 === 2) wallets.push({ id: uuid(`${key}:w:stellar2`), chain: "stellar", address: stellarAccount(`${key}:stellar2`), name: "Savings", createdAt });
    return { id: uuid(key), name, email: emailFor(name), createdAt, wallets };
  });
}
