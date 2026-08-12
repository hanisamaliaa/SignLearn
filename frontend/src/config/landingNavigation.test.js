import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_DESTINATIONS,
  FOOTER_NAV_GROUPS,
  getLandingSectionId,
  LANDING_NAV_ITEMS,
} from "./landingNavigation.js";

test("landing navigation follows the rendered section order", () => {
  assert.deepEqual(
    LANDING_NAV_ITEMS.map(({ id }) => id),
    ["beranda", "topik", "cara-belajar", "demo-gerakan", "orang-tua"],
  );
});

test("landing navigation uses friendly, child-centered labels", () => {
  assert.deepEqual(
    LANDING_NAV_ITEMS.map(({ label }) => label),
    ["Beranda", "Yuk Belajar", "Cara Belajar", "Coba Gerakan", "Untuk Orang Tua"],
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

test("footer sections use absolute landing URLs for cross-page navigation", () => {
  const sectionLinks = FOOTER_NAV_GROUPS
    .flatMap(({ links }) => links)
    .filter(({ kind }) => kind === "landing-section");

  assert.deepEqual(
    sectionLinks.map(({ href }) => href),
    ["/#topik", "/#demo-gerakan", "/#cara-belajar", "/#progres"],
  );
  for (const destination of sectionLinks) {
    assert.equal(getLandingSectionId(destination.hash), destination.id);
  }
});

test("footer public pages reuse valid route destinations", () => {
  const routeLinks = FOOTER_NAV_GROUPS
    .flatMap(({ links }) => links)
    .filter(({ kind }) => kind === "route");

  assert.deepEqual(
    routeLinks,
    [
      APP_DESTINATIONS.parentGuide,
      APP_DESTINATIONS.aboutBisindo,
      APP_DESTINATIONS.privacyPolicy,
    ],
  );
});
