import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("logout remains in the sidebar and is absent from both header menus", () => {
  const header = read("../components/layout/PortalHeader.jsx");
  const sidebar = read("../components/layout/PortalSidebar.jsx");
  const layout = read("../components/layout/PortalLayout.jsx");

  assert.doesNotMatch(header, /LogoutIcon|onLogout|>Keluar</);
  assert.match(sidebar, /LogoutIcon/);
  assert.match(sidebar, /onClick=\{onLogout\}/);
  assert.equal(layout.match(/onLogout=\{handleLogout\}/g)?.length ?? 0, 1);
});

test("course detail does not add a second quiz CTA after all lessons finish", () => {
  const detail = read("../pages/user/CourseDetail.jsx");
  assert.match(detail, /if \(allLessonsCompleted\) return null/);
  assert.equal(detail.match(/>Mulai Quiz</g)?.length ?? 0, 1);
});

test("guided tour leaves its spotlight clear and has explicit dark contrast", () => {
  const tour = read("../components/common/FirstTimeChecklist.jsx");
  const css = read("../styles/index.css");

  assert.match(tour, /has-spotlight/);
  assert.match(css, /guided-tour-layer\.has-spotlight \.guided-tour-backdrop \{ background: transparent/);
  assert.match(css, /\[data-theme="dark"\] \.guided-tour-spotlight/);
  assert.match(css, /rgba\(2, 8, 23, \.46\)/);
});
