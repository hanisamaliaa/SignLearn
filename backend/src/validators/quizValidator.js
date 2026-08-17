/**
 * Validator kuis dan pertanyaan.
 *
 * Mengembalikan `Array<{field, message}>` — konsisten dengan validator lain.
 */

const err = (field, message) => ({ field, message });
const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";

export const QUESTION_TYPES = Object.freeze(["multiple-choice", "camera-spell"]);
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

/** Batas panjang target ejaan; tiap huruf perlu beberapa detik untuk diperagakan. */
export const MAX_SPELL_TARGET = 40;
export const MIN_SPELL_TARGET = 2;

/**
 * Bentuk baku target ejaan: huruf besar A-Z dengan spasi tunggal.
 *
 * Dipakai bersama oleh validasi penyusunan soal dan penilaian jawaban, supaya
 * "Pagi " yang tersimpan dan "pagi" yang dikenali kamera tidak pernah dianggap
 * berbeda hanya karena spasi atau kapitalisasi.
 */
export function normalizeSpellTarget(value) {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

export function validateSpellTarget(value, field = "answerText") {
  if (isBlank(value)) {
    return [err(field, "Kata yang harus dieja wajib diisi.")];
  }
  const normalized = normalizeSpellTarget(value);
  if (!/^[A-Z]+( [A-Z]+)*$/.test(normalized)) {
    // Disebutkan eksplisit karena penyusun soal tidak punya cara lain untuk
    // tahu bahwa model pengenal hanya menguasai abjad.
    return [err(field, "Hanya huruf A-Z dan spasi yang dapat diperagakan; angka, tanda baca, dan huruf beraksen tidak dikenali model.")];
  }
  const letters = normalized.replace(/ /g, "").length;
  if (letters < MIN_SPELL_TARGET) {
    return [err(field, `Kata yang harus dieja minimal ${MIN_SPELL_TARGET} huruf.`)];
  }
  if (normalized.length > MAX_SPELL_TARGET) {
    return [err(field, `Kata yang harus dieja maksimal ${MAX_SPELL_TARGET} karakter.`)];
  }
  return [];
}

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

  const type = body.questionType ?? "multiple-choice";
  if (!QUESTION_TYPES.includes(type)) {
    errors.push(err("questionType", `questionType harus salah satu dari: ${QUESTION_TYPES.join(", ")}.`));
  } else if (type === "camera-spell") {
    errors.push(...validateSpellTarget(body.answerText));
  } else {
    errors.push(...validateOptions(body.options, body.correctIndex, true));
  }

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

  // Berpindah ke camera-spell tanpa mengirim answerText akan menyisakan soal
  // tanpa kunci jawaban, jadi keduanya wajib menyertai.
  if (body.questionType === "camera-spell") {
    errors.push(...validateSpellTarget(body.answerText));
  } else if (body.answerText !== undefined) {
    errors.push(...validateSpellTarget(body.answerText));
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

  const updatable = ["question", "questionType", "options", "correctIndex", "answerText", "sortOrder"];
  if (!updatable.some((k) => body[k] !== undefined)) {
    errors.push(err("body", "Tidak ada field yang dapat diperbarui."));
  }

  return errors;
}

/** POST submit — seluruh pertanyaan wajib dijawab. */
export function validateSubmitQuiz(body = {}) {
  const errors = [];

  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(body.sessionId??""))){errors.push(err("sessionId","sessionId quiz tidak valid."));}

  if (!Array.isArray(body.answers)) {
    return [err("answers", "answers harus berupa array.")];
  }
  if (body.answers.length === 0) {
    return [err("answers", "answers tidak boleh kosong.")];
  }
  if(body.answers.length!==5)errors.push(err("answers","Quiz Premium harus berisi tepat 5 jawaban."));

  for (const [i, a] of body.answers.entries()) {
    if (!a || typeof a !== "object") {
      errors.push(err(`answers[${i}]`, "Setiap jawaban harus berupa objek."));
      continue;
    }
    if (!/^\d+$/.test(String(a.questionId))) {
      errors.push(err(`answers[${i}].questionId`, "questionId harus berupa angka."));
    }

    // Soal pilihan ganda mengirim selectedIndex, soal kamera mengirim
    // answerText. Bentuk mana yang benar ditentukan server dari tipe soal yang
    // tersimpan; di sini cukup dipastikan salah satunya ada dan berbentuk sah.
    const hasIndex = a.selectedIndex !== undefined && a.selectedIndex !== null;
    const hasText = a.answerText !== undefined && a.answerText !== null;

    if (!hasIndex && !hasText) {
      errors.push(err(`answers[${i}]`, "Jawaban harus berisi selectedIndex atau answerText."));
    }
    if (hasIndex && (!Number.isInteger(Number(a.selectedIndex)) || Number(a.selectedIndex) < 0)) {
      errors.push(err(`answers[${i}].selectedIndex`, "selectedIndex harus bilangan bulat tidak negatif."));
    }
    if (hasText && typeof a.answerText !== "string") {
      errors.push(err(`answers[${i}].answerText`, "answerText harus berupa teks."));
    }
    if (hasText && typeof a.answerText === "string" && a.answerText.length > 200) {
      errors.push(err(`answers[${i}].answerText`, "answerText maksimal 200 karakter."));
    }

    // Catatan huruf yang sempat keliru. Murni telemetri belajar dan tidak
    // memengaruhi skor sama sekali, jadi bentuk yang aneh cukup ditolak di
    // sini alih-alih menggagalkan pengiriman kuis.
    if (a.mistakes !== undefined && a.mistakes !== null) {
      const shapeOk =
        typeof a.mistakes === "object" &&
        !Array.isArray(a.mistakes) &&
        Object.entries(a.mistakes).every(
          ([letter, count]) => /^[A-Z]$/.test(letter) && Number.isInteger(count) && count > 0,
        );
      if (!shapeOk) {
        errors.push(err(`answers[${i}].mistakes`, "mistakes harus berupa peta huruf A-Z ke jumlah kesalahan."));
      }
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
