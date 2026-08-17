#!/usr/bin/env node

import { closePool, query } from "../src/config/database.js";
import {
  call,
  c,
  check,
  registerUser,
  requireServer,
  section,
  summary,
} from "./lib/harness.mjs";

let buyer;
let otherUser;

async function cleanup() {
  const ids = [buyer?.id, otherUser?.id].filter(Boolean);
  if (ids.length) {
    await query("DELETE FROM payments WHERE user_id = ANY($1::bigint[])", [ids]).catch(() => {});
    await query("DELETE FROM subscriptions WHERE user_id = ANY($1::bigint[])", [ids]).catch(() => {});
    await query("DELETE FROM users WHERE id = ANY($1::bigint[])", [ids]).catch(() => {});
  }
}

async function main() {
  console.log(`\n${c.b("SignLearn — smoke test checkout Premium")}`);
  await requireServer();

  buyer = await registerUser("premium-buyer");
  otherUser = await registerUser("premium-other");

  section("Konfigurasi checkout demo");
  const mine = await call("/subscription/me", { token: buyer.token });
  check("status langganan dapat dibaca", mine.status === 200, `${mine.status}`);
  check("provider mock dinyatakan transparan",
    mine.data?.paymentProvider === "mock" && mine.data?.paymentEnvironment === "demo");
  check("checkout demo aktif", mine.data?.paymentConfigured === true);
  check("akun baru belum Premium", mine.data?.isPremium === false);
  const plan = mine.data?.plans?.[0];
  check("paket aktif tersedia dari server", Boolean(plan?.id && plan?.price > 0));

  const invalidPlan = await call("/subscription/checkout", {
    method: "POST",
    token: buyer.token,
    body: { planId: "not-an-id" },
  });
  check("plan ID yang rusak ditolak validator", invalidPlan.status === 422);

  section("Kepemilikan dan pembatalan order");
  const cancelledOrder = await call("/subscription/checkout", {
    method: "POST",
    token: buyer.token,
    body: { planId: plan.id },
  });
  const cancelledOrderId = cancelledOrder.data?.checkout?.orderId;
  check("order pending dibuat", cancelledOrder.status === 201 && Boolean(cancelledOrderId));
  check("redirect hanya menuju halaman mock internal",
    cancelledOrder.data?.checkout?.redirectUrl?.includes("/premium/mock-payment?order_id="));

  const foreignRead = await call(`/subscription/payments/${cancelledOrderId}`, {
    token: otherUser.token,
  });
  check("pengguna lain tidak dapat membaca order", foreignRead.status === 404);
  const foreignConfirm = await call(
    `/subscription/payments/${cancelledOrderId}/mock-confirm`,
    { method: "POST", token: otherUser.token, body: { action: "complete" } },
  );
  check("pengguna lain tidak dapat mengaktifkan order", foreignConfirm.status === 404);

  const invalidAction = await call(
    `/subscription/payments/${cancelledOrderId}/mock-confirm`,
    { method: "POST", token: buyer.token, body: { action: "paid" } },
  );
  check("aksi simulasi selain allowlist ditolak", invalidAction.status === 422);

  const cancelled = await call(
    `/subscription/payments/${cancelledOrderId}/mock-confirm`,
    { method: "POST", token: buyer.token, body: { action: "cancel" } },
  );
  check("order dapat dibatalkan", cancelled.data?.payment?.status === "cancelled");
  check("pembatalan tidak membuka Premium", cancelled.data?.isPremium === false);

  const cancelReplay = await call(
    `/subscription/payments/${cancelledOrderId}/mock-confirm`,
    { method: "POST", token: buyer.token, body: { action: "complete" } },
  );
  check("order batal tidak dapat diubah menjadi paid", cancelReplay.data?.payment?.status === "cancelled");

  section("Aktivasi Premium idempoten");
  const checkout = await call("/subscription/checkout", {
    method: "POST",
    token: buyer.token,
    body: { planId: plan.id },
  });
  const orderId = checkout.data?.checkout?.orderId;
  check("order aktivasi dibuat", checkout.status === 201 && Boolean(orderId));

  const completed = await call(`/subscription/payments/${orderId}/mock-confirm`, {
    method: "POST",
    token: buyer.token,
    body: { action: "complete" },
  });
  check("konfirmasi mengubah transaksi menjadi paid", completed.data?.payment?.status === "paid");
  check("Premium aktif dari sumber kebenaran database", completed.data?.isPremium === true);
  check("masa aktif memiliki tanggal mulai dan akhir",
    Boolean(completed.data?.subscription?.startDate && completed.data?.subscription?.endDate));

  const durationDays =
    (new Date(completed.data.subscription.endDate) -
      new Date(completed.data.subscription.startDate)) /
    86_400_000;
  check("masa aktif mengikuti durasi paket", Math.abs(durationDays - plan.durationDays) < 0.01,
    `${durationDays} hari`);

  const replay = await call(`/subscription/payments/${orderId}/mock-confirm`, {
    method: "POST",
    token: buyer.token,
    body: { action: "complete" },
  });
  check("konfirmasi ulang tetap paid", replay.data?.payment?.status === "paid");
  check("konfirmasi ulang tidak menggandakan masa aktif",
    replay.data?.subscription?.endDate === completed.data?.subscription?.endDate);

  const persisted = await query(
    `SELECT pay.transaction_status, pay.provider, s.status
       FROM payments pay JOIN subscriptions s ON s.id=pay.subscription_id
      WHERE pay.order_id=$1`,
    [orderId],
  );
  check("payment dan subscription konsisten di database",
    persisted.rows[0]?.transaction_status === "paid" &&
      persisted.rows[0]?.provider === "mock" &&
      persisted.rows[0]?.status === "active");

  const history = await call("/subscription/payment-history", { token: buyer.token });
  check("riwayat menampilkan provider demo",
    history.data?.items?.some((item) => item.orderId === orderId && item.provider === "mock"));

  const raceCheckout = await call("/subscription/checkout", {
    method: "POST",
    token: buyer.token,
    body: { planId: plan.id },
  });
  const raceOrderId = raceCheckout.data?.checkout?.orderId;
  const [raceComplete, raceCancel] = await Promise.all([
    call(`/subscription/payments/${raceOrderId}/mock-confirm`, {
      method: "POST",
      token: buyer.token,
      body: { action: "complete" },
    }),
    call(`/subscription/payments/${raceOrderId}/mock-confirm`, {
      method: "POST",
      token: buyer.token,
      body: { action: "cancel" },
    }),
  ]);
  check("konfirmasi bersamaan diproses tanpa error server",
    raceComplete.status === 200 && raceCancel.status === 200);
  const raceStatus = await call(`/subscription/payments/${raceOrderId}`, {
    token: buyer.token,
  });
  const terminalStatus = raceStatus.data?.payment?.status;
  check("race complete/cancel berakhir pada satu status terminal",
    ["paid", "cancelled"].includes(terminalStatus), terminalStatus);
  const opposite = terminalStatus === "paid" ? "cancel" : "complete";
  const terminalReplay = await call(`/subscription/payments/${raceOrderId}/mock-confirm`, {
    method: "POST",
    token: buyer.token,
    body: { action: opposite },
  });
  check("status terminal tidak dapat ditimpa request lawan",
    terminalReplay.data?.payment?.status === terminalStatus);

  const quiz = await query(
    "SELECT id, course_id FROM quizzes ORDER BY id LIMIT 1",
  );
  if (quiz.rows[0]) {
    const premiumEndpoint = await call(
      `/courses/${quiz.rows[0].course_id}/quizzes/${quiz.rows[0].id}`,
      { token: buyer.token },
    );
    check("fitur Premium lolos middleware server setelah aktivasi",
      premiumEndpoint.status !== 403, `${premiumEndpoint.status}`);
  } else {
    check("fixture quiz tersedia untuk uji akses Premium", false);
  }

  return summary("checkout Premium");
}

main()
  .then((ok) => {
    process.exitCode = ok ? 0 : 1;
  })
  .catch((error) => {
    console.error(`\n  ${c.no("Test berhenti:")} ${error.stack || error.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await closePool();
  });
