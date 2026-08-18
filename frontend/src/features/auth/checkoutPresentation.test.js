import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("checkout uses production-facing language and a neutral confirmation URL", () => {
  const pages = [
    "../../pages/user/PremiumCheckout.jsx",
    "../../pages/user/MockPayment.jsx",
    "../../pages/user/PaymentResult.jsx",
    "../../pages/user/Subscription.jsx",
  ].map(source).join("\n");
  const routes = source("../../routes/index.jsx");

  assert.doesNotMatch(pages, /simulasi|mode demo|mode demonstrasi/i);
  assert.match(routes, /premium\/payment\/confirm/);
  assert.doesNotMatch(routes, /premium\/mock-payment/);
});
