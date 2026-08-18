import crypto from "node:crypto";
import { ApiError } from "../utils/ApiError.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { env } from "../config/env.js";
import * as repo from "../repositories/subscriptionRepository.js";

const authHeader = () =>
  `Basic ${Buffer.from(`${env.midtrans.serverKey}:`).toString("base64")}`;
const apiBase = () =>
  env.midtrans.isProduction
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";

function paymentConfigured() {
  return env.payment.provider === "mock"
    ? env.payment.mockEnabled
    : Boolean(env.midtrans.serverKey);
}

function requireConfiguredPayment() {
  if (!paymentConfigured()) {
    throw new ApiError(503, "Layanan checkout belum dikonfigurasi.", {
      code: ERROR_CODES.PAYMENT_NOT_CONFIGURED,
    });
  }
}

export async function getMine(userId) {
  return {
    ...(await repo.subscriptionMe(userId)),
    paymentConfigured: paymentConfigured(),
    paymentProvider: env.payment.provider,
    paymentEnvironment:
      env.payment.provider === "mock"
        ? "internal"
        : env.midtrans.isProduction
          ? "production"
          : "sandbox",
  };
}

export const history = (userId) => repo.paymentHistory(userId);
export const adminSubscriptions = () => repo.adminSubscriptions();
export const adminPayments = () => repo.adminPayments();

export async function checkout(user, planId) {
  requireConfiguredPayment();
  const orderId = `SL-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const pending = await repo.createPendingPayment(
    user.id,
    planId,
    orderId,
    env.payment.provider,
  );
  if (!pending) throw ApiError.notFound("Paket Premium tidak ditemukan.");
  if (pending.pendingExists) {
    throw ApiError.conflict(
      "Masih ada pembayaran yang menunggu konfirmasi. Selesaikan atau batalkan pembayaran tersebut terlebih dahulu.",
    );
  }
  if (pending.limitExceeded) {
    throw ApiError.conflict(
      `Masa aktif Premium sudah mencapai batas ${pending.maxAdvanceDays} hari. Tambah lagi setelah sisa masa aktif berkurang.`,
    );
  }

  if (env.payment.provider === "mock") {
    const redirectUrl = `${env.frontendUrl}/premium/payment/confirm?order_id=${encodeURIComponent(orderId)}`;
    await repo.saveSnap(orderId, null, redirectUrl);
    return {
      orderId,
      provider: "mock",
      environment: "internal",
      redirectUrl,
    };
  }

  const endpoint = env.midtrans.isProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: pending.amount },
        customer_details: {
          first_name: user.name ?? "Pengguna SignLearn",
          email: user.email,
        },
        item_details: [
          {
            id: String(pending.plan.id),
            price: pending.amount,
            quantity: 1,
            name: `SignLearn Premium ${pending.plan.duration_days} hari`,
          },
        ],
        callbacks: {
          finish: `${env.frontendUrl}/premium/payment?order_id=${encodeURIComponent(orderId)}`,
        },
      }),
    });
    if (!response.ok) throw new Error(`Midtrans HTTP ${response.status}`);
    const snap = await response.json();
    if (!snap.token || !snap.redirect_url) throw new Error("Respons Midtrans tidak lengkap");
    await repo.saveSnap(orderId, snap.token, snap.redirect_url);
    return {
      orderId,
      provider: "midtrans",
      environment: env.midtrans.isProduction ? "production" : "sandbox",
      snapToken: snap.token,
      redirectUrl: snap.redirect_url,
    };
  } catch (error) {
    await repo.markCheckoutFailed(orderId, error.message);
    throw new ApiError(502, "Midtrans sedang tidak tersedia. Coba lagi nanti.");
  }
}

async function verifyOrder(orderId) {
  const response = await fetch(
    `${apiBase()}/v2/${encodeURIComponent(orderId)}/status`,
    { headers: { Authorization: authHeader(), Accept: "application/json" } },
  );
  if (!response.ok) {
    throw new ApiError(502, "Status pembayaran belum dapat diverifikasi ke Midtrans.");
  }
  return response.json();
}

async function resultFor(userId, payment) {
  const state = await repo.subscriptionMe(userId);
  return { payment, ...state };
}

export async function paymentStatus(userId, orderId) {
  let payment = await repo.findUserPayment(userId, orderId);
  if (!payment) throw ApiError.notFound("Transaksi tidak ditemukan.");

  if (
    payment.status === "pending" &&
    payment.provider === "midtrans" &&
    env.midtrans.serverKey
  ) {
    const result = await repo.processNotification(await verifyOrder(orderId));
    if (result?.amountMismatch) throw ApiError.conflict("Nominal transaksi tidak cocok.");
    if (result?.limitExceeded) {
      throw ApiError.conflict(
        `Masa aktif Premium sudah mencapai batas ${result.maxAdvanceDays} hari.`,
      );
    }
    payment = await repo.findUserPayment(userId, orderId);
  }
  return resultFor(userId, payment);
}

export async function confirmMockPayment(userId, orderId, action) {
  if (env.payment.provider !== "mock" || !env.payment.mockEnabled) {
    throw ApiError.notFound("Konfirmasi pembayaran tidak tersedia.");
  }

  let payment = await repo.findUserPayment(userId, orderId);
  if (!payment || payment.provider !== "mock") {
    throw ApiError.notFound("Transaksi tidak ditemukan.");
  }
  if (payment.status !== "pending") return resultFor(userId, payment);

  const transactionStatus = action === "complete" ? "settlement" : "cancel";
  const result = await repo.processNotification({
    order_id: orderId,
    gross_amount: payment.amount,
    transaction_status: transactionStatus,
    payment_type: "mock",
    transaction_id: `mock-${orderId}`,
  });
  if (!result) throw ApiError.notFound("Transaksi tidak ditemukan.");
  if (result.amountMismatch) throw ApiError.conflict("Nominal transaksi tidak cocok.");
  if (result.limitExceeded) {
    throw ApiError.conflict(
      `Masa aktif Premium sudah mencapai batas ${result.maxAdvanceDays} hari.`,
    );
  }
  payment = await repo.findUserPayment(userId, orderId);
  return resultFor(userId, payment);
}

export async function webhook(body) {
  if (env.payment.provider !== "midtrans") {
    throw ApiError.notFound("Webhook pembayaran tidak tersedia.");
  }
  const expected = crypto
    .createHash("sha512")
    .update(
      `${body.order_id}${body.status_code}${body.gross_amount}${env.midtrans.serverKey}`,
    )
    .digest("hex");
  const received = String(body.signature_key ?? "");
  if (
    !env.midtrans.serverKey ||
    received.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  ) {
    throw ApiError.unauthorized("Signature Midtrans tidak valid.");
  }
  const verified = await verifyOrder(body.order_id);
  const result = await repo.processNotification(verified);
  if (!result) throw ApiError.notFound("Order pembayaran tidak ditemukan.");
  if (result.amountMismatch) throw ApiError.conflict("Nominal transaksi tidak cocok.");
  if (result.limitExceeded) {
    throw ApiError.conflict(
      `Masa aktif Premium sudah mencapai batas ${result.maxAdvanceDays} hari.`,
    );
  }
  return result;
}
