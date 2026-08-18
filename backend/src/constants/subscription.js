export const PREMIUM_MAX_ADVANCE_DAYS = 180;

export const MILLISECONDS_PER_DAY = 86_400_000;
// PostgreSQL dan proses Node membaca jam pada momen yang sedikit berbeda.
// Toleransi ini mencegah tepat 150 hari tampil terblokir karena selisih
// beberapa milidetik; ia jauh lebih kecil daripada satu hari masa aktif.
export const PREMIUM_EXTENSION_TOLERANCE_MS = 60_000;

export function buildExtensionPolicy(activeSubscription, plans, now = new Date()) {
  const nowMs = now.getTime();
  const activeEndMs = activeSubscription?.endDate
    ? Date.parse(activeSubscription.endDate)
    : nowMs;
  const baseMs = Math.max(nowMs, Number.isFinite(activeEndMs) ? activeEndMs : nowMs);
  const maxEndMs = nowMs + PREMIUM_MAX_ADVANCE_DAYS * MILLISECONDS_PER_DAY;
  const remainingDays = activeSubscription
    ? Math.max(
        0,
        Math.ceil(
          (baseMs - nowMs - PREMIUM_EXTENSION_TOLERANCE_MS) /
            MILLISECONDS_PER_DAY,
        ),
      )
    : 0;

  const planEligibility = Object.fromEntries(
    plans.map((plan) => {
      const projectedEndMs = baseMs + plan.durationDays * MILLISECONDS_PER_DAY;
      return [
        String(plan.id),
        {
          canPurchase: projectedEndMs <= maxEndMs + PREMIUM_EXTENSION_TOLERANCE_MS,
          projectedEndDate: new Date(projectedEndMs).toISOString(),
        },
      ];
    }),
  );

  return {
    model: "prepaid",
    maxAdvanceDays: PREMIUM_MAX_ADVANCE_DAYS,
    remainingDays,
    maxEndDate: new Date(maxEndMs).toISOString(),
    canExtend: plans.some((plan) => planEligibility[String(plan.id)]?.canPurchase),
    planEligibility,
  };
}
