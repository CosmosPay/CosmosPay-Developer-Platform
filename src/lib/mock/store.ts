/* The mock data lives in memory, per process, on globalThis: a dev reload (HMR) keeps what was
   created or deleted while looking at the views, a server restart seeds it again. Each
   collection is seeded the first time it is read, from a deterministic seed, so every start
   shows the same rows. */
import type { MockEnv } from "@/lib/mock/http";

const KEY = "__cosmosMockStore";

type Bag = Map<string, unknown>;

function bag(): Bag {
  const g = globalThis as unknown as Record<string, Bag | undefined>;
  return (g[KEY] ??= new Map());
}

/** The collection stored under `key`, seeded by `seed` on first use. */
export function mockStore<T>(key: string, seed: () => T): T {
  const b = bag();
  if (!b.has(key)) b.set(key, seed());
  return b.get(key) as T;
}

/** One collection per environment (testnet data for `dev`, mainnet data for `prod`). */
export function mockEnvStore<T>(key: string, env: MockEnv, seed: (env: MockEnv) => T): T {
  return mockStore(`${key}:${env}`, () => seed(env));
}

/** Forget every collection (the next read seeds it again). */
export function resetMockStore(): void {
  bag().clear();
}
