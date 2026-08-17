const err = (field, message) => ({ field, message });

export function validateCheckout(body = {}) {
  return /^\d+$/.test(String(body.planId ?? ""))
    ? []
    : [err("planId", "Paket Premium tidak valid.")];
}

export function validateMockPayment(body = {}) {
  return ["complete", "cancel"].includes(body.action)
    ? []
    : [err("action", "Aksi simulasi pembayaran tidak valid.")];
}
