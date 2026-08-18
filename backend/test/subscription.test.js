import assert from "node:assert/strict";
import test from "node:test";
import {
  validateCheckout,
  validateMockPayment,
} from "../src/validators/subscriptionValidator.js";
import {
  buildExtensionPolicy,
  PREMIUM_MAX_ADVANCE_DAYS,
} from "../src/constants/subscription.js";

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

test("premium extension policy allows stacking only through 180 days", () => {
  const now = new Date("2026-08-18T00:00:00.000Z");
  const plans = [{ id: "1", durationDays: 30 }];
  const at150Days = buildExtensionPolicy(
    { endDate: "2027-01-15T00:00:00.000Z" },
    plans,
    now,
  );
  assert.equal(at150Days.remainingDays, 150);
  assert.equal(at150Days.canExtend, true);
  assert.equal(at150Days.planEligibility["1"].canPurchase, true);

  const at180Days = buildExtensionPolicy(
    { endDate: "2027-02-14T00:00:00.000Z" },
    plans,
    now,
  );
  assert.equal(at180Days.remainingDays, PREMIUM_MAX_ADVANCE_DAYS);
  assert.equal(at180Days.canExtend, false);
  assert.equal(at180Days.planEligibility["1"].canPurchase, false);
});
