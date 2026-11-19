/* p2pModel.test.ts: the P2P market's pure helpers: token amounts in base units without floating
   point (src/lib/p2p/amounts.ts), the bots' permission bitmask (perms.ts), what each order status
   means and who may act on it (orders.ts) and the payouts file (csv.ts). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { toBaseUnits, fromBaseUnits, parseDecimal, parseFiat, gteUnits, bpsOf, bpsLabel } from "@/lib/p2p/amounts";
import { OPERATOR_PERMS, permsToMask, maskToPerms, isValidMask } from "@/lib/p2p/perms";
import { activeDeadline, clientActions, countdown, isTerminal, merchantActions, msLeft, orderPill, orderTone, pollDelay, userActions } from "@/lib/p2p/orders";
import { parsePayoutCsv, payoutItems, payoutTemplate, splitCsv, PAYOUT_MAX_ITEMS } from "@/lib/p2p/csv";
import { P2P_ORDER_STATUSES } from "@/lib/p2p/types";

test("token amounts to base units and back, exactly", () => {
  assert.equal(toBaseUnits("12.5", 6), "12500000");
  assert.equal(toBaseUnits("0.000001", 6), "1");
  assert.equal(toBaseUnits("0", 6), "0");
  assert.equal(toBaseUnits("1,5", 6), "1500000", "a decimal comma is read as a point");
  assert.equal(toBaseUnits("1.1234567891234567891", 18), null, "more decimals than the token has");
  assert.equal(toBaseUnits("-1", 6), null);
  assert.equal(toBaseUnits("01", 6), null);
  assert.equal(toBaseUnits("1e3", 6), null);
  assert.equal(toBaseUnits("100000000000000000000.5", 18), "100000000000000000000500000000000000000");
  assert.equal(fromBaseUnits("12500000", 6), "12.5");
  assert.equal(fromBaseUnits("1", 6), "0.000001");
  assert.equal(fromBaseUnits("1000000", 6), "1");
  assert.equal(fromBaseUnits("7", 0), "7");
  assert.equal(fromBaseUnits("nope", 6), "nope");
  assert.equal(parseDecimal("10.123", 2), null);
  assert.equal(parseFiat("1500.50", "ARS"), "1500.50");
  assert.equal(parseFiat("1500.5", "CLP"), null, "Chilean pesos have no decimals");
  assert.equal(parseFiat("0", "ARS"), null);
  assert.ok(gteUnits("1000", "999"));
  assert.ok(!gteUnits("1", "x"));
  assert.equal(bpsOf("1000000", 30), "3000");
  assert.equal(bpsOf("999", 1), "0", "rounded down");
  assert.equal(bpsLabel(150), "1.5%");
  assert.equal(bpsLabel(150, "es"), "1,5%");
});

test("bot permissions: the contract's bits, both ways", () => {
  assert.deepEqual(OPERATOR_PERMS, { open: 1, release: 2, trade: 4, withdraw: 8 });
  assert.equal(permsToMask(["release", "trade"]), 6);
  assert.equal(permsToMask([]), 0);
  assert.deepEqual(maskToPerms(15), ["open", "release", "trade", "withdraw"]);
  assert.deepEqual(maskToPerms(2 | 64), ["release"], "unknown bits are ignored");
  assert.deepEqual(maskToPerms(-1), []);
  assert.ok(isValidMask(0) && isValidMask(15));
  assert.ok(!isValidMask(16) && !isValidMask(1.5));
});

test("statuses: their mark, whether they are over and how often to read them", () => {
  for (const s of P2P_ORDER_STATUSES) assert.ok(["ok", "fail", "wait", "off"].includes(orderTone(s)), s);
  assert.equal(orderTone("completed"), "ok");
  assert.equal(orderTone("expired"), "fail");
  assert.equal(orderTone("disputed"), "off");
  assert.equal(orderPill("paid"), "pend");
  assert.ok(isTerminal("resolved") && !isTerminal("paid"));
  assert.equal(pollDelay("completed"), null);
  assert.equal(pollDelay("pending"), 4000);
  assert.equal(pollDelay("awaiting_payment"), 10000);
});

test("the running deadline and its countdown", () => {
  const at = "2026-11-19T12:30:00.000Z";
  const now = Date.parse("2026-11-19T12:00:00.000Z");
  const deadlines = { acceptBy: "2026-11-19T12:05:00.000Z", payBy: at, settleBy: null };
  assert.deepEqual(activeDeadline({ status: "awaiting_payment", deadlines }), { kind: "pay", at });
  assert.deepEqual(activeDeadline({ status: "awaiting_acceptance", deadlines }), { kind: "accept", at: deadlines.acceptBy });
  assert.equal(activeDeadline({ status: "paid", deadlines }), null, "no settle window");
  assert.equal(activeDeadline({ status: "completed", deadlines }), null);
  assert.equal(msLeft(at, now), 30 * 60_000);
  assert.equal(msLeft("2026-11-19T11:00:00.000Z", now), 0);
  assert.equal(msLeft(null, now), 0);
  assert.equal(countdown(30 * 60_000), "30:00");
  assert.equal(countdown(65_000), "1:05");
  assert.equal(countdown(3_725_000), "1:02:05");
  assert.equal(countdown(-5), "0:00");
});

test("who may act on an order, as the contract allows", () => {
  const now = Date.parse("2026-11-19T12:00:00.000Z");
  const later = "2026-11-19T13:00:00.000Z";
  const earlier = "2026-11-19T11:00:00.000Z";
  const d = (over: Partial<{ acceptBy: string | null; payBy: string | null; settleBy: string | null }> = {}) => ({ acceptBy: null, payBy: later, settleBy: null, ...over });
  // A purchase: the merchant sold the tokens and releases once paid (also before the mark).
  assert.deepEqual(merchantActions({ kind: "BUY", status: "awaiting_payment", deadlines: d() }, now), ["release"]);
  assert.deepEqual(merchantActions({ kind: "CHARGE", status: "paid", deadlines: d() }, now), ["release"], "no settle window: the seller cannot dispute");
  assert.deepEqual(merchantActions({ kind: "BUY", status: "completed", deadlines: d() }, now), []);
  // A sale or payout: the merchant buys the tokens.
  assert.deepEqual(merchantActions({ kind: "SELL", status: "awaiting_acceptance", deadlines: d({ acceptBy: later }) }, now), ["accept", "cancel"]);
  assert.deepEqual(merchantActions({ kind: "PAYOUT", status: "awaiting_acceptance", deadlines: d({ acceptBy: earlier }) }, now), ["cancel"], "too late to accept");
  assert.deepEqual(merchantActions({ kind: "PAYOUT", status: "awaiting_payment", deadlines: d() }, now), ["markPaid", "cancel"]);
  assert.deepEqual(merchantActions({ kind: "SELL", status: "paid", deadlines: d({ settleBy: later }) }, now), ["dispute"]);
  // The client's side.
  assert.deepEqual(clientActions({ kind: "BUY", status: "awaiting_payment", deadlines: d() }, now), ["paid", "cancel"]);
  assert.deepEqual(clientActions({ kind: "BUY", status: "awaiting_payment", deadlines: d({ payBy: earlier }) }, now), ["cancel"]);
  assert.deepEqual(clientActions({ kind: "BUY", status: "paid", deadlines: d() }, now), ["dispute"]);
  assert.deepEqual(clientActions({ kind: "PAYOUT", status: "paid", deadlines: d() }, now), ["release"]);
  assert.deepEqual(clientActions({ kind: "PAYOUT", status: "paid", deadlines: d({ settleBy: later }) }, now), ["release", "dispute"]);
  assert.deepEqual(clientActions({ kind: "PAYOUT", status: "awaiting_acceptance", deadlines: d() }, now), ["cancel"]);
  assert.deepEqual(clientActions({ kind: "SELL", status: "paid", deadlines: d() }, now), [], "a sale is its user's wallet's to release");
  // The sale's own seller (the public app): cancel before acceptance, release, dispute before the settle deadline.
  assert.deepEqual(userActions({ kind: "SELL", status: "awaiting_acceptance", deadlines: d() }, now), ["cancel"]);
  assert.deepEqual(userActions({ kind: "SELL", status: "paid", deadlines: d({ settleBy: later }) }, now), ["release", "dispute"]);
  assert.deepEqual(userActions({ kind: "SELL", status: "paid", deadlines: d({ settleBy: earlier }) }, now), ["release"], "too late to dispute");
  assert.deepEqual(userActions({ kind: "BUY", status: "awaiting_payment", deadlines: d() }, now), ["paid", "cancel"]);
});

test("CSV: quotes, separators and line ends", () => {
  assert.deepEqual(splitCsv('a,b\n"x, y","say ""hi"""\r\n\n', ","), [["a", "b"], ["x, y", 'say "hi"']]);
  assert.deepEqual(splitCsv("﻿a;b\n1;2", ";"), [["a", "b"], ["1", "2"]]);
});

test("a payouts file: every row checked, problems by column", () => {
  const file = [
    "Currency;Amount;Rail;Holder name;Document;CBU;Alias;Reference",
    "ARS;150000;ar_bank_transfer;Ana Gómez;20329642330;0170099222000001234561;;inv-1",
    "ARS;10,5;ar_bank_transfer;Ana Gómez;20329642330;;ana.gomez;inv-2",
    "ARS;abc;ar_bank_transfer;Ana Gómez;20329642331;0170099222000001234562;;inv-2",
    "BRL;10;ar_bank_transfer;Ana;20329642330;;ana.gomez;",
    "ARS;10;wire;Ana;;;;",
  ].join("\n");
  const parsed = parsePayoutCsv(file);
  assert.deepEqual(parsed.missing, []);
  assert.equal(parsed.tooMany, false);
  assert.equal(parsed.rows.length, 5);
  assert.deepEqual(parsed.rows[0].errors, {});
  assert.equal(parsed.rows[0].line, 2);
  assert.deepEqual(parsed.rows[1].errors, {}, "a decimal comma is read as a point");
  assert.equal(parsed.rows[1].fiatAmount, "10.5");
  assert.deepEqual(parsed.rows[2].errors, { amount: "amount", cbu: "checksum", cuit: "checksum", reference: "duplicate" }, "the document column fills the CUIT");
  assert.deepEqual(parsed.rows[3].errors, { currency: "currency" }, "the rail's currency");
  assert.equal(parsed.rows[4].errors.rail, "rail");
  const items = payoutItems(parsed.rows);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], { currency: "ARS", fiatAmount: "150000", rail: "ar_bank_transfer", beneficiary: { holderName: "Ana Gómez", document: "20329642330", details: { cbu: "0170099222000001234561", cuit: "20329642330" } }, externalReference: "inv-1" });
  assert.deepEqual(parsePayoutCsv("currency,amount\nARS,1").missing, ["rail", "holderName"]);
  assert.deepEqual(parsePayoutCsv("currency,amount,rail,holderName\nARS,1,ar_bank_transfer,Ana", ["BRL"]).rows[0].errors.currency, "currency", "a currency the market does not list");
  const many = ["currency,amount,rail,holderName", ...Array.from({ length: PAYOUT_MAX_ITEMS + 1 }, () => "ARS,1,ar_bank_transfer,Ana")].join("\n");
  assert.equal(parsePayoutCsv(many).tooMany, true);
});

test("the template parses with every row valid", () => {
  const parsed = parsePayoutCsv(payoutTemplate());
  assert.deepEqual(parsed.missing, []);
  assert.deepEqual(parsed.rows.map((r) => r.errors), [{}, {}, {}]);
});
