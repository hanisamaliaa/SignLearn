import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAlertType } from "../../components/ui/alertType.js";

test("maps the common error alias to the supported danger alert", () => {
  assert.equal(normalizeAlertType("error"), "danger");
});

test("keeps supported alert types unchanged", () => {
  for (const type of ["success", "warning", "danger", "info"]) {
    assert.equal(normalizeAlertType(type), type);
  }
});

test("falls back safely instead of crashing on an unknown alert type", () => {
  assert.equal(normalizeAlertType("unexpected"), "info");
  assert.equal(normalizeAlertType(), "info");
});
