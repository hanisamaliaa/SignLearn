import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSpellTarget,
  validateSpellTarget,
  validateCreateQuestion,
  validateUpdateQuestion,
  validateSubmitQuiz,
} from "../src/validators/quizValidator.js";
import { COURSE_CATALOGUE } from "../src/database/courseCatalogue.js";

const fieldsOf = (errors) => errors.map((e) => e.field);

test("normalises spell targets so stored and recognised text always match", () => {
  assert.equal(normalizeSpellTarget("  pagi  "), "PAGI");
  assert.equal(normalizeSpellTarget("selamat   pagi"), "SELAMAT PAGI");
  assert.equal(normalizeSpellTarget("SeLaMaT Pagi"), "SELAMAT PAGI");
  assert.equal(normalizeSpellTarget(undefined), "");
  assert.equal(normalizeSpellTarget(42), "");
});

test("accepts targets the alphabet model can actually perform", () => {
  assert.deepEqual(validateSpellTarget("PAGI"), []);
  assert.deepEqual(validateSpellTarget("selamat pagi"), []);
  assert.deepEqual(validateSpellTarget("  ibu  "), []);
});

test("rejects targets that no alphabet-only model could ever spell", () => {
  // Angka dan tanda baca tidak ada isyarat abjadnya; membiarkannya lolos
  // berarti membuat soal yang mustahil diselesaikan peserta.
  for (const bad of ["PAGI!", "BUS 12", "3", "KAFÉ", "A-B"]) {
    assert.equal(validateSpellTarget(bad).length, 1, `seharusnya ditolak: ${bad}`);
  }
});

test("rejects targets that are empty or unreasonably long", () => {
  assert.deepEqual(fieldsOf(validateSpellTarget("")), ["answerText"]);
  assert.deepEqual(fieldsOf(validateSpellTarget("   ")), ["answerText"]);
  assert.deepEqual(fieldsOf(validateSpellTarget("A")), ["answerText"]);
  assert.deepEqual(fieldsOf(validateSpellTarget("A".repeat(41))), ["answerText"]);
});

test("a camera question needs a target, not options", () => {
  assert.deepEqual(validateCreateQuestion({
    question: "Eja kata PAGI dengan abjad BISINDO.",
    questionType: "camera-spell",
    answerText: "PAGI",
  }), []);

  assert.deepEqual(fieldsOf(validateCreateQuestion({
    question: "Eja kata ini.",
    questionType: "camera-spell",
  })), ["answerText"]);
});

test("a multiple-choice question is still validated against its options", () => {
  assert.deepEqual(validateCreateQuestion({
    question: "Huruf apa ini?",
    options: ["A", "B"],
    correctIndex: 1,
  }), []);

  assert.deepEqual(fieldsOf(validateCreateQuestion({
    question: "Huruf apa ini?",
    options: ["A", "B"],
    correctIndex: 5,
  })), ["correctIndex"]);
});

test("switching a question to camera-spell must bring its target along", () => {
  // Tanpa aturan ini soal berpindah tipe tanpa kunci jawaban dan selalu salah.
  assert.deepEqual(fieldsOf(validateUpdateQuestion({ questionType: "camera-spell" })), ["answerText"]);
  assert.deepEqual(validateUpdateQuestion({ questionType: "camera-spell", answerText: "BOLA" }), []);
});

test("an unknown question type is refused", () => {
  assert.deepEqual(
    fieldsOf(validateCreateQuestion({ question: "x", questionType: "essay" })),
    ["questionType"],
  );
});

test("submitted answers may carry either an index or recognised text", () => {
  const sessionId = "123e4567-e89b-42d3-a456-426614174000";
  assert.deepEqual(validateSubmitQuiz({
    sessionId,
    answers: [{ questionId: "1", selectedIndex: 0 }, { questionId: "2", answerText: "PAGI" }, { questionId: "3", selectedIndex: 1 }, { questionId: "4", answerText: "SAYA" }, { questionId: "5", selectedIndex: 0 }],
  }), []);

  // Melewati soal kamera mengirim teks kosong, dan itu sah: dinilai salah,
  // tetapi kuisnya tetap dapat diselesaikan saat kamera bermasalah.
  assert.deepEqual(validateSubmitQuiz({ sessionId, answers: [{ questionId: "1", answerText: "" }, { questionId: "2", answerText: "A" }, { questionId: "3", answerText: "B" }, { questionId: "4", answerText: "C" }, { questionId: "5", answerText: "D" }] }), []);
});

test("an answer carrying neither an index nor text is refused", () => {
  assert.deepEqual(
    fieldsOf(validateSubmitQuiz({ sessionId: "123e4567-e89b-42d3-a456-426614174000", answers: [{ questionId: "1" }, { questionId: "2", answerText: "A" }, { questionId: "3", answerText: "B" }, { questionId: "4", answerText: "C" }, { questionId: "5", answerText: "D" }] })),
    ["answers[0]"],
  );
});

test("the shipped catalogue is internally consistent", () => {
  assert.equal(COURSE_CATALOGUE.length, 10);

  const videoIds = new Set();
  const orders = new Set();
  for (const course of COURSE_CATALOGUE) {
    assert.ok(course.title, "kursus wajib punya judul");
    assert.ok(["Dasar", "Kosakata"].includes(course.category), course.title);
    assert.ok(["Pemula", "Menengah", "Lanjutan"].includes(course.level), course.title);

    const id = new URL(course.videoUrl).searchParams.get("v");
    assert.ok(id, `videoUrl tidak dapat diurai: ${course.title}`);
    assert.ok(!videoIds.has(id), `video dipakai dua kali: ${id}`);
    videoIds.add(id);

    assert.ok(course.thumbnail.includes(id), `thumbnail tidak cocok videonya: ${course.title}`);

    assert.ok(!orders.has(course.sortOrder), `sortOrder ganda: ${course.sortOrder}`);
    orders.add(course.sortOrder);

    assert.ok(course.lesson?.title, course.title);
    assert.ok(
      course.quiz.questions.length >= 10,
      `${course.title} hanya punya ${course.quiz.questions.length} soal`,
    );

    // Urutan soal harus rapat dan unik, kalau tidak navigasi nomor soal di
    // halaman kuis akan melompat atau menampilkan dua soal di posisi sama.
    const questionOrders = course.quiz.questions.map((q) => q.sortOrder);
    assert.deepEqual(
      questionOrders, [...questionOrders].sort((a, b) => a - b), course.title,
    );
    assert.equal(new Set(questionOrders).size, questionOrders.length, course.title);

    const targets = course.quiz.questions.map((q) => q.answerText);
    assert.equal(
      new Set(targets).size, targets.length,
      `${course.title} memuat kata yang sama dua kali`,
    );
  }
});

test("quiz durations leave room for spelling every word", () => {
  // Satu huruf realistis butuh 2-4 detik termasuk memposisikan tangan dan
  // mengulang yang keliru. Batas waktu yang lebih ketat dari itu membuat kuis
  // mustahil diselesaikan, bukan sekadar sulit.
  for (const course of COURSE_CATALOGUE) {
    const letters = course.quiz.questions
      .reduce((total, q) => total + q.answerText.replace(/ /g, "").length, 0);
    const needed = letters * 4;
    assert.ok(
      course.quiz.durationSeconds >= needed,
      `${course.title}: ${letters} huruf butuh ~${needed}s, tersedia ${course.quiz.durationSeconds}s`,
    );
  }
});

test("every seeded quiz target is one the model can be asked to spell", () => {
  for (const course of COURSE_CATALOGUE) {
    for (const question of course.quiz.questions) {
      assert.equal(question.questionType, "camera-spell");
      assert.deepEqual(
        validateSpellTarget(question.answerText), [],
        `target tidak sah pada kursus ${course.title}: ${question.answerText}`,
      );
      // Perintah soal harus memuat katanya, karena peserta tidak punya cara
      // lain mengetahui apa yang harus dieja.
      assert.ok(
        question.question.includes(question.answerText),
        `soal tidak menyebut kata targetnya: ${course.title}`,
      );
    }
  }
});
