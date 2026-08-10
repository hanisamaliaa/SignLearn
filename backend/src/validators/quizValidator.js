/**
 * Validator kuis dan pertanyaan.
 *
 * Mengembalikan `Array<{field, message}>` — konsisten dengan validator lain.
 */

const err = (field, message) => ({ field, message });
const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";

export const QUESTION_TYPES = Object.freeze(["multiple-choice"]);
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

function validateTitle(title, required, label = "Judul kuis") {
  if (isBlank(title)) return required ? [err("title", `${label} wajib diisi.`)] : [];
  const v = String(title).trim();
  if (v.length < 3) return [err("title", `${label} minimal 3 karakter.`)];
  if (v.length > 190) return [err("title", `${label} maksimal 190 karakter.`)];
  return [];
}

function validateInt(value, field, { min, max, label }) {
  if (value === undefined || value === null) return [];
  const n = Number(value);
  if (!Number.isInteger(n)) return [err(field, `${label} harus bilangan bulat.`)];
  if (n < min || n > max) return [err(field, `${label} harus antara ${min} dan ${max}.`)];
  return [];
}

function validateLessonId(value) {
  // null eksplisit sah — kuis boleh tidak terikat pelajaran tertentu.
  if (value === undefined || value === null) return [];
  if (!/^\d+$/.test(String(value))) {
    return [err("lessonId", "lessonId harus berupa angka.")];
  }
  return [];
}

export function validateCreateQuiz(body = {}) {
  return [
    ...validateTitle(body.title, true),
    ...validateLessonId(body.lessonId),
    // KKM. Skema memberi default 70; nilai ini yang dipakai saat penilaian,
    // bukan konstanta global — tiap kuis boleh punya ambangnya sendiri.
    ...validateInt(body.minPassingScore, "minPassingScore", { min: 0, max: 100, label: "KKM" }),
    ...validateInt(body.durationSeconds, "durationSeconds", { min: 30, max: 7200, label: "Durasi" }),
  ];
}

export function validateUpdateQuiz(body = {}) {
  const errors = [
    ...validateTitle(body.title, false),
    ...validateLessonId(body.lessonId),
    ...validateInt(body.minPassingScore, "minPassingScore", { min: 0, max: 100, label: "KKM" }),
    ...validateInt(body.durationSeconds, "durationSeconds", { min: 30, max: 7200, label: "Durasi" }),
  ];

  const updatable = ["title", "lessonId", "minPassingScore", "durationSeconds"];
  if (!updatable.some((k) => body[k] !== undefined)) {
    errors.push(err("body", "Tidak ada field yang dapat diperbarui."));
  }
  if (body.totalQuestions !== undefined) {
    errors.push(err("totalQuestions", "totalQuestions dihitung otomatis dan tidak dapat diubah."));
  }

  return errors;
}

/**
 * Validasi pertanyaan.
 *
 * `correctIndex` HARUS berada dalam jangkauan `options`. Tanpa pemeriksaan ini,
 * pertanyaan dapat tersimpan dengan kunci jawaban di luar batas — dan setiap
 * peserta akan selalu salah pada soal itu, tanpa cara memperbaikinya sendiri.
 */
function validateOptions(options, correctIndex, required) {
  const errors = [];

  if (options === undefined) {
    return required ? [err("options", "Pilihan jawaban wajib diisi.")] : [];
  }
  if (!Array.isArray(options)) {
    return [err("options", "Pilihan jawaban harus berupa array.")];
  }
  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
    errors.push(err("options", `Pilihan jawaban harus ${MIN_OPTIONS}-${MAX_OPTIONS} item.`));
  }
  if (options.some((o) => typeof o !== "string" || o.trim() === "")) {
    errors.push(err("options", "Setiap pilihan jawaban harus teks yang tidak kosong."));
  }
  if (options.some((o) => typeof o === "string" && o.length > 200)) {
    errors.push(err("options", "Setiap pilihan jawaban maksimal 200 karakter."));
  }

  const normalized = options
    .filter((o) => typeof o === "string")
    .map((o) => o.trim().toLowerCase());
  if (new Set(normalized).size !== normalized.length) {
    errors.push(err("options", "Pilihan jawaban tidak boleh ada yang sama."));
  }

  if (correctIndex !== undefined) {
    const n = Number(correctIndex);
    if (!Number.isInteger(n) || n < 0 || n >= options.length) {
      errors.push(err("correctIndex", `correctIndex harus antara 0 dan ${options.length - 1}.`));
    }
  } else if (required) {
    errors.push(err("correctIndex", "correctIndex wajib diisi."));
  }

  return errors;
}

export function validateCreateQuestion(body = {}) {
  const errors = [];

  if (isBlank(body.question)) {
    errors.push(err("question", "Pertanyaan wajib diisi."));
  } else if (String(body.question).length > 1000) {
    errors.push(err("question", "Pertanyaan maksimal 1000 karakter."));
  }

  if (body.questionType !== undefined && !QUESTION_TYPES.includes(body.questionType)) {
    errors.push(err("questionType", `questionType harus salah satu dari: ${QUESTION_TYPES.join(", ")}.`));
  }

  errors.push(...validateOptions(body.options, body.correctIndex, true));
  errors.push(...validateInt(body.sortOrder, "sortOrder", { min: 0, max: 9999, label: "Urutan" }));

  return errors;
}

export function validateUpdateQuestion(body = {}) {
  const errors = [];

  if (body.question !== undefined) {
    if (isBlank(body.question)) errors.push(err("question", "Pertanyaan tidak boleh kosong."));
    else if (String(body.question).length > 1000) {
      errors.push(err("question", "Pertanyaan maksimal 1000 karakter."));
    }
  }
  if (body.questionType !== undefined && !QUESTION_TYPES.includes(body.questionType)) {
    errors.push(err("questionType", `questionType harus salah satu dari: ${QUESTION_TYPES.join(", ")}.`));
  }

  // correctIndex hanya dapat divalidasi terhadap options. Bila salah satunya
  // dikirim, keduanya wajib dikirim — kalau tidak, indeks bisa jatuh di luar
  // batas array yang tersimpan.
  const hasOptions = body.options !== undefined;
  const hasIndex = body.correctIndex !== undefined;

  if (hasOptions !== hasIndex && (hasOptions || hasIndex)) {
    errors.push(err(
      hasOptions ? "correctIndex" : "options",
      "options dan correctIndex harus diperbarui bersamaan.",
    ));
  } else if (hasOptions && hasIndex) {
    errors.push(...validateOptions(body.options, body.correctIndex, true));
  }

  errors.push(...validateInt(body.sortOrder, "sortOrder", { min: 0, max: 9999, label: "Urutan" }));

  const updatable = ["question", "questionType", "options", "correctIndex", "sortOrder"];
  if (!updatable.some((k) => body[k] !== undefined)) {
    errors.push(err("body", "Tidak ada field yang dapat diperbarui."));
  }

  return errors;
}

/** POST submit — seluruh pertanyaan wajib dijawab. */
export function validateSubmitQuiz(body = {}) {
  const errors = [];

  if (!Array.isArray(body.answers)) {
    return [err("answers", "answers harus berupa array.")];
  }
  if (body.answers.length === 0) {
    return [err("answers", "answers tidak boleh kosong.")];
  }

  for (const [i, a] of body.answers.entries()) {
    if (!a || typeof a !== "object") {
      errors.push(err(`answers[${i}]`, "Setiap jawaban harus berupa objek."));
      continue;
    }
    if (!/^\d+$/.test(String(a.questionId))) {
      errors.push(err(`answers[${i}].questionId`, "questionId harus berupa angka."));
    }
    if (!Number.isInteger(Number(a.selectedIndex)) || Number(a.selectedIndex) < 0) {
      errors.push(err(`answers[${i}].selectedIndex`, "selectedIndex harus bilangan bulat tidak negatif."));
    }
  }

  const ids = body.answers.map((a) => String(a?.questionId));
  if (new Set(ids).size !== ids.length) {
    errors.push(err("answers", "Terdapat questionId yang dijawab lebih dari sekali."));
  }

  errors.push(...validateInt(body.durationSeconds, "durationSeconds", { min: 0, max: 7200, label: "Durasi" }));

  return errors;
}

export function validateReorderQuestions(body = {}) {
  if (!Array.isArray(body.order)) return [err("order", "order harus berupa array berisi id pertanyaan.")];
  if (body.order.length === 0) return [err("order", "order tidak boleh kosong.")];
  if (body.order.some((id) => !/^\d+$/.test(String(id)))) {
    return [err("order", "Seluruh id pada order harus berupa angka.")];
  }
  if (new Set(body.order.map(String)).size !== body.order.length) {
    return [err("order", "Terdapat id yang duplikat pada order.")];
  }
  return [];
}
