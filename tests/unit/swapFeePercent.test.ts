import { test } from "node:test";
import assert from "node:assert/strict";
import { bpsPercent, planSwapFeeBps, swapFeePct } from "@/lib/plans";

/* The swap form and the swap and liquidity details show the commission in percent, never in basis
   points, in the reader's language. */
const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, " ");

test("bpsPercent turns basis points into a percent", () => {
  assert.equal(bpsPercent(65, "en"), "0.65%");
  assert.equal(bpsPercent(13, "en"), "0.13%");
  assert.equal(bpsPercent(7, "en"), "0.07%");
  assert.equal(bpsPercent(0, "en"), "0%");
  assert.equal(bpsPercent(150, "en"), "1.5%");
});

test("bpsPercent follows the reader's language", () => {
  assert.equal(plain(bpsPercent(65, "es")), "0,65 %");
  assert.equal(plain(bpsPercent(65, "de")), "0,65 %");
});

test("the public swap commission reads the same as the copy that names it", () => {
  assert.equal(bpsPercent(planSwapFeeBps("community"), "en"), swapFeePct("community"));
  for (const plan of ["starter", "essentials", "growth", "enterprise"]) {
    assert.equal(bpsPercent(planSwapFeeBps(plan), "en"), swapFeePct(plan), plan);
  }
});
