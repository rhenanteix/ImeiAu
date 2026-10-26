import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pricing,
  inspectionSchema,
  settingsSchema,
  createSchema,
} from "../src/lib/domain";
const rules = [
  { criteria: "screen_intact", deductionBps: 3000 },
  { criteria: "battery_ok", deductionBps: 1500 },
  { criteria: "powers_on", deductionBps: 6000 },
];
test("abatimentos, margem e frete em centavos na ordem definida", () => {
  assert.equal(
    pricing(
      180000,
      { screen_intact: false, battery_ok: true, powers_on: true },
      rules,
      { marginBps: 1000, freightPayer: "customer", freightCents: 2500 },
    ).estimated_value,
    110900,
  );
});
test("limita abatimentos em 100% e nunca oferece valor negativo", () => {
  assert.equal(
    pricing(
      180000,
      { screen_intact: false, battery_ok: false, powers_on: false },
      rules,
      { marginBps: 1000, freightPayer: "customer", freightCents: 2500 },
    ).estimated_value,
    0,
  );
});
test("frete custeado pela loja não reduz cotação", () => {
  assert.equal(
    pricing(10000, {}, [], {
      marginBps: 0,
      freightPayer: "store",
      freightCents: 5000,
    }).estimated_value,
    10000,
  );
});
test("aprovação exige checklist completo e contraproposta exige valor e motivo", () => {
  assert.equal(
    inspectionSchema.safeParse({
      version: 0,
      decision: "approve",
      checklist: { powersOn: true, imeiMatches: false, conditionMatches: true },
      notes: "",
    }).success,
    false,
  );
  assert.equal(
    inspectionSchema.safeParse({
      version: 0,
      decision: "counteroffer",
      checklist: { powersOn: true, imeiMatches: true, conditionMatches: false },
      notes: "Tela com danos visíveis",
      amountCents: 12000,
    }).success,
    true,
  );
});
test("instantâneo não permite PIX e margem fora do intervalo", () => {
  assert.equal(
    settingsSchema.safeParse({
      mode: "instant_coupon",
      payoutMethod: "pix",
      freightPayer: "store",
      freightCents: 0,
      marginBps: 1000,
      version: 0,
    }).success,
    false,
  );
  assert.equal(
    settingsSchema.safeParse({
      mode: "post_inspection",
      payoutMethod: "coupon",
      freightPayer: "store",
      freightCents: 0,
      marginBps: 10001,
      version: 0,
    }).success,
    false,
  );
});
test("validação recusa valor de cotação injetado pelo cliente", () => {
  assert.equal(
    createSchema.safeParse({ estimated_value: 999999 }).success,
    false,
  );
});
