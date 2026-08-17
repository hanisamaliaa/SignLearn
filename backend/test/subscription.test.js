import assert from "node:assert/strict";
import test from "node:test";
import {
  validateCheckout,
  validateMockPayment,
} from "../src/validators/subscriptionValidator.js";

test("checkout only accepts a numeric server plan id", () => {
  assert.deepEqual(validateCheckout({ planId: "1" }), []);
  assert.deepEqual(validateCheckout({ planId: 42 }), []);
  for (const planId of [undefined, null, "", "1 OR 1=1", -1, "2.5"]) {
    assert.ok(validateCheckout({ planId }).some((error) => error.field === "planId"));
  }
});

test("mock checkout only accepts explicit complete or cancel actions", () => {
  assert.deepEqual(validateMockPayment({ action: "complete" }), []);
  assert.deepEqual(validateMockPayment({ action: "cancel" }), []);
  for (const action of [undefined, "paid", "settlement", "COMPLETE", true]) {
    assert.ok(validateMockPayment({ action }).some((error) => error.field === "action"));
  }
});
