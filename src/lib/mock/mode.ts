/* Mock mode: the portal on sample data, with no Postgres, no Authentik and no Payments API
   (`npm run dev:mock`, scripts/dev-mock.mjs). The middleware signs every visitor in as the
   sample account and answers every /api/* request from an in-memory store (src/lib/mock).

   Dev server only: a production build ignores COSMOS_MOCK, so a stray variable on a server can
   never hand out an owner session. Read at runtime from process.env (the script sets it), never
   from astro:env, so turning it on takes no rebuild. Pure: no astro:env, no database. */
import { ALL_PLAN_IDS, type PlanId } from "@/lib/plans";

export const MOCK_ROLES = ["user", "support", "admin", "owner"] as const;
export type MockRole = (typeof MOCK_ROLES)[number];

export interface MockOptions {
  /** The sample account's platform role: `owner` sees every staff and admin view. */
  role: MockRole;
  /** The plan of the sample account (and so of the organizations it owns). */
  plan: PlanId;
  /** A brand new account: no organization yet, so the dashboard sends it to the onboarding. */
  fresh: boolean;
  /** Delay added to every mock API answer, to look at loading states (skeletons). */
  latencyMs: number;
}

const ON = new Set(["1", "true", "on", "yes"]);

export function isOn(value: string | undefined): boolean {
  return ON.has(String(value ?? "").trim().toLowerCase());
}

/** Whether this process serves mock data. Only ever true under `astro dev`. */
export function isMockMode(): boolean {
  return import.meta.env?.DEV === true && isOn(process.env.COSMOS_MOCK);
}

/** The options the script passed (COSMOS_MOCK_*), each with a safe default. */
export function mockOptions(env: Record<string, string | undefined> = process.env): MockOptions {
  const role = String(env.COSMOS_MOCK_ROLE ?? "").trim().toLowerCase();
  const plan = String(env.COSMOS_MOCK_PLAN ?? "").trim().toLowerCase();
  const latency = Math.trunc(Number(env.COSMOS_MOCK_LATENCY));
  return {
    role: (MOCK_ROLES as readonly string[]).includes(role) ? (role as MockRole) : "owner",
    plan: (ALL_PLAN_IDS as readonly string[]).includes(plan) ? (plan as PlanId) : "growth",
    fresh: isOn(env.COSMOS_MOCK_FRESH),
    latencyMs: Number.isFinite(latency) && latency > 0 ? Math.min(latency, 10_000) : 0,
  };
}
