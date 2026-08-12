import assert from "node:assert/strict";
import test from "node:test";
import { getLandingSectionId, LANDING_NAV_ITEMS } from "./landingNavigation.js";

test("landing navigation follows the rendered section order", () => {
  assert.deepEqual(
    LANDING_NAV_ITEMS.map(({ id }) => id),
    ["beranda", "topik", "manfaat", "cara-belajar", "demo-gerakan", "progres", "orang-tua"],
  );
});

test("landing navigation derives consistent hashes and URLs", () => {
  for (const item of LANDING_NAV_ITEMS) {
    assert.equal(item.hash, `#${item.id}`);
    assert.equal(item.href, `/#${item.id}`);
    assert.equal(getLandingSectionId(item.hash), item.id);
  }
});

test("unknown or malformed hashes are ignored safely", () => {
  assert.equal(getLandingSectionId("#section-lama"), null);
  assert.equal(getLandingSectionId("#%E0%A4%A"), null);
});
