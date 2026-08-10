/**
 * Validator laporan admin & feed aktivitas — API Contract §10.5 dan §10.6.
 *
 * Mengembalikan `Array<{field, message}>`; array kosong berarti valid.
 */

const err = (field, message) => ({ field, message });

export const GROUP_BY = Object.freeze(["day", "week", "month"]);

export const ACTIVITY_TYPES = Object.freeze([
  "user_registered",
  "lesson_completed",
  "quiz_passed",
  "course_created",
]);

/** Rentang maksimum satu laporan. */
export const MAX_RANGE_DAYS = 365;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Mem-parse `YYYY-MM-DD` menjadi Date UTC, atau `null` bila tidak sah.
 *
 * Pemeriksaan format saja tidak cukup: "2026-02-31" lolos regex tetapi bukan
 * tanggal yang ada. `Date` menggesernya diam-diam menjadi 3 Maret, sehingga
 * laporan mencakup rentang yang tidak pernah diminta siapa pun.
 */
export function parseIsoDate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;

  // Bulat-balik memastikan tanggalnya tidak digeser JavaScript.
  return date.toISOString().slice(0, 10) === value ? date : null;
}

/**
 * GET /dashboard/admin/reports — §10.5.
 *
 * `from` dan `to` WAJIB. Tanpa keduanya, endpoint ini akan memindai seluruh
 * tabel setiap kali dipanggil, dan halaman admin yang dibuka otomatis saat
 * login akan menjadi query paling berat di sistem.
 */
export function validateReportQuery(_body, _params, query = {}) {
  const errors = [];

  const from = parseIsoDate(query.from);
  const to = parseIsoDate(query.to);

  if (query.from === undefined) {
    errors.push(err("from", "Parameter from wajib diisi (format YYYY-MM-DD)."));
  } else if (!from) {
    errors.push(err("from", "Parameter from harus tanggal sah berformat YYYY-MM-DD."));
  }

  if (query.to === undefined) {
    errors.push(err("to", "Parameter to wajib diisi (format YYYY-MM-DD)."));
  } else if (!to) {
    errors.push(err("to", "Parameter to harus tanggal sah berformat YYYY-MM-DD."));
  }

  if (from && to) {
    if (from > to) {
      errors.push(err("from", "Tanggal from tidak boleh setelah tanggal to."));
    } else {
      const days = Math.round((to - from) / 86_400_000) + 1;
      if (days > MAX_RANGE_DAYS) {
        errors.push(err("to", `Rentang laporan maksimal ${MAX_RANGE_DAYS} hari (diminta ${days} hari).`));
      }
    }
  }

  if (query.groupBy !== undefined && !GROUP_BY.includes(query.groupBy)) {
    errors.push(err("groupBy", `groupBy harus salah satu dari: ${GROUP_BY.join(", ")}.`));
  }

  return errors;
}

/** GET /admin/activities — §10.6. */
export function validateActivityQuery(_body, _params, query = {}) {
  const errors = [];

  if (query.type !== undefined && !ACTIVITY_TYPES.includes(query.type)) {
    errors.push(err("type", `type harus salah satu dari: ${ACTIVITY_TYPES.join(", ")}.`));
  }

  return errors;
}
