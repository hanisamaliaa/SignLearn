import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("parent guide is reopenable inside the protected learner portal", () => {
  const routes = read("../routes/index.jsx");
  const navigation = read("./navigation.js");
  const tour = read("../components/common/FirstTimeChecklist.jsx");

  assert.match(routes, /path="\/guide" element={<ParentGuide embedded \/>}/);
  assert.match(navigation, /Panduan Orang Tua/);
  assert.match(navigation, /path: "\/guide"/);
  assert.match(tour, /navigate\("\/guide"\)/);
});
