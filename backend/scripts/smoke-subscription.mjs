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

  section("Konfigurasi checkout internal");
  const mine = await call("/subscription/me", { token: buyer.token });
  check("status langganan dapat dibaca", mine.status === 200, `${mine.status}`);
  check("provider checkout internal terkonfigurasi",
    mine.data?.paymentProvider === "mock" && mine.data?.paymentEnvironment === "internal");
  check("checkout aktif", mine.data?.paymentConfigured === true);
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
  check("redirect menuju halaman konfirmasi pembayaran",
    cancelledOrder.data?.checkout?.redirectUrl?.includes("/premium/payment/confirm?order_id="));

  const duplicatePending = await call("/subscription/checkout", {
    method: "POST",
    token: buyer.token,
    body: { planId: plan.id },
  });
  check("dua checkout pending untuk akun yang sama ditolak", duplicatePending.status === 409,
    `${duplicatePending.status}`);

  const foreignRead = await call(`/subscription/payments/${cancelledOrderId}`, {
    token: otherUser.token,
  });
  check("pengguna lain tidak dapat membaca order", foreignRead.status === 404);
  const foreignConfirm = await call(
    `/subscription/payments/${cancelledOrderId}/confirm`,
    { method: "POST", token: otherUser.token, body: { action: "complete" } },
  );
  check("pengguna lain tidak dapat mengaktifkan order", foreignConfirm.status === 404);

  const invalidAction = await call(
    `/subscription/payments/${cancelledOrderId}/confirm`,
    { method: "POST", token: buyer.token, body: { action: "paid" } },
  );
  check("aksi konfirmasi selain allowlist ditolak", invalidAction.status === 422);

  const cancelled = await call(
    `/subscription/payments/${cancelledOrderId}/confirm`,
    { method: "POST", token: buyer.token, body: { action: "cancel" } },
  );
  check("order dapat dibatalkan", cancelled.data?.payment?.status === "cancelled");
  check("pembatalan tidak membuka Premium", cancelled.data?.isPremium === false);

  const cancelReplay = await call(
    `/subscription/payments/${cancelledOrderId}/confirm`,
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

  const completed = await call(`/subscription/payments/${orderId}/confirm`, {
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

  const replay = await call(`/subscription/payments/${orderId}/confirm`, {
    method: "POST",
    token: buyer.token,
    body: { action: "complete" },
  });
  check("konfirmasi ulang tetap paid", replay.data?.payment?.status === "paid");
  check("konfirmasi ulang tidak menggandakan masa aktif",
    replay.data?.subscription?.endDate === completed.data?.subscription?.endDate);

  const interleavedCheckout = await call("/subscription/checkout", {
    method: "POST",
    token: buyer.token,
    body: { planId: plan.id },
  });
  const interleavedOrderId = interleavedCheckout.data?.checkout?.orderId;
  const [interleavedComplete, simultaneousCheckout] = await Promise.all([
    call(`/subscription/payments/${interleavedOrderId}/confirm`, {
      method: "POST",
      token: buyer.token,
      body: { action: "complete" },
    }),
    call("/subscription/checkout", {
      method: "POST",
      token: buyer.token,
      body: { planId: plan.id },
    }),
  ]);
  check("konfirmasi dan checkout baru bersamaan tidak deadlock",
    interleavedComplete.status === 200 && [201, 409].includes(simultaneousCheckout.status),
    `${interleavedComplete.status}/${simultaneousCheckout.status}`);
  if (simultaneousCheckout.status === 201) {
    await call(
      `/subscription/payments/${simultaneousCheckout.data.checkout.orderId}/confirm`,
      { method: "POST", token: buyer.token, body: { action: "cancel" } },
    );
  }

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
  check("riwayat menampilkan provider checkout",
    history.data?.items?.some((item) => item.orderId === orderId && item.provider === "mock"));

  const raceCheckout = await call("/subscription/checkout", {
    method: "POST",
    token: buyer.token,
    body: { planId: plan.id },
  });
  const raceOrderId = raceCheckout.data?.checkout?.orderId;
  const [raceComplete, raceCancel] = await Promise.all([
    call(`/subscription/payments/${raceOrderId}/confirm`, {
      method: "POST",
      token: buyer.token,
      body: { action: "complete" },
    }),
    call(`/subscription/payments/${raceOrderId}/confirm`, {
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
  const terminalReplay = await call(`/subscription/payments/${raceOrderId}/confirm`, {
    method: "POST",
    token: buyer.token,
    body: { action: opposite },
  });
  check("status terminal tidak dapat ditimpa request lawan",
    terminalReplay.data?.payment?.status === terminalStatus);

  section("Batas perpanjangan 180 hari");
  let extensionState = await call("/subscription/me", { token: buyer.token });
  let extensionPurchases = 0;
  while (extensionState.data?.extensionPolicy?.canExtend && extensionPurchases < 8) {
    const extensionCheckout = await call("/subscription/checkout", {
      method: "POST",
      token: buyer.token,
      body: { planId: plan.id },
    });
    const extensionOrderId = extensionCheckout.data?.checkout?.orderId;
    check(`checkout perpanjangan ${extensionPurchases + 1} dibuat`,
      extensionCheckout.status === 201 && Boolean(extensionOrderId));

    const extensionComplete = await call(
      `/subscription/payments/${extensionOrderId}/confirm`,
      { method: "POST", token: buyer.token, body: { action: "complete" } },
    );
    check(`perpanjangan ${extensionPurchases + 1} menambah masa aktif`,
      extensionComplete.status === 200 && extensionComplete.data?.payment?.status === "paid");
    extensionState = extensionComplete;
    extensionPurchases += 1;
  }

  check("kebijakan server berhenti pada batas 180 hari",
    extensionState.data?.extensionPolicy?.canExtend === false &&
      extensionState.data?.extensionPolicy?.maxAdvanceDays === 180,
    `${extensionState.data?.extensionPolicy?.remainingDays ?? "?"} hari`);
  const blockedExtension = await call("/subscription/checkout", {
    method: "POST",
    token: buyer.token,
    body: { planId: plan.id },
  });
  check("checkout di atas batas ditolak 409", blockedExtension.status === 409,
    `${blockedExtension.status}`);

  await query(
    `UPDATE subscriptions
        SET end_date=NOW() + INTERVAL '150 days'
      WHERE id=(SELECT id FROM subscriptions
                 WHERE user_id=$1 AND status='active'
                 ORDER BY end_date DESC LIMIT 1)`,
    [buyer.id],
  );
  const at150Days = await call("/subscription/me", { token: buyer.token });
  check("saat tersisa 150 hari pengguna boleh menambah lagi",
    at150Days.data?.extensionPolicy?.canExtend === true,
    `${at150Days.data?.extensionPolicy?.remainingDays ?? "?"} hari`);
  const finalCheckout = await call("/subscription/checkout", {
    method: "POST",
    token: buyer.token,
    body: { planId: plan.id },
  });
  const finalOrderId = finalCheckout.data?.checkout?.orderId;
  const finalComplete = await call(`/subscription/payments/${finalOrderId}/confirm`, {
    method: "POST",
    token: buyer.token,
    body: { action: "complete" },
  });
  check("tambahan 30 hari setelah menunggu berhasil",
    finalComplete.status === 200 && finalComplete.data?.extensionPolicy?.canExtend === false);

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
