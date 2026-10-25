import { test } from "node:test";
import assert from "node:assert/strict";
import { fromUnits, toUnits, zkFee, zkSplit, ZK_FEE_BPS } from "@/lib/zk/amounts";

test("the ZK commission is one basis point (0.01%)", () => {
  assert.equal(ZK_FEE_BPS, 1);
});

test("amounts convert to stroops and back", () => {
  assert.equal(toUnits("12.5"), 125_000_000n);
  assert.equal(toUnits("0.0000001"), 1n);
  assert.equal(toUnits("100"), 1_000_000_000n);
  assert.equal(fromUnits(125_000_000n), "12.5");
  assert.equal(fromUnits(1n), "0.0000001");
  assert.equal(fromUnits(1_000_000_000n), "100");
  assert.equal(fromUnits(0n), "0");
});

test("malformed amounts are refused", () => {
  for (const bad of ["", "1.2.3", "-1", "1e5", "0.00000001", "abc", "1,5"]) {
    assert.throws(() => toUnits(bad), /invalid amount/, bad);
  }
});

test("the commission is 0.01%, rounded up, at least one stroop", () => {
  assert.equal(zkFee(toUnits("100")), 100_000n); // 0.01 XLM on 100 XLM
  assert.equal(zkFee(toUnits("1")), 1_000n); // 0.0001 XLM on 1 XLM
  assert.equal(zkFee(10_001n), 2n); // 1.0001 stroops rounds up
  assert.equal(zkFee(1n), 1n); // never zero on a payment
  assert.equal(zkFee(0n), 0n);
});

test("the split gives the merchant the amount minus the commission", () => {
  const { fee, net } = zkSplit(toUnits("250"));
  assert.equal(fee, 250_000n);
  assert.equal(net, toUnits("250") - 250_000n);
  assert.equal(fee + net, toUnits("250"));
});
