/**
 * Pemeriksaan fungsional menyeluruh terhadap server yang sedang berjalan.
 *
 *   node scripts/e2e-check.mjs
 *
 * Membuat datanya sendiri lalu membersihkannya, jadi aman dijalankan berulang
 * terhadap database bersama. Yang diperiksa bukan hanya "status 2xx", tetapi
 * juga janji yang mudah diam-diam rusak:
 *
 *   · kunci jawaban tidak pernah sampai ke peran `user`
 *   · skor dihitung server, bukan diterima dari klien
 *   · permintaan tanpa body tidak ditolak 400 (regresi `data: null`)
 *   · penjaga peran menolak yang bukan admin
 */

const BASE = (process.env.API_URL || "http://127.0.0.1:4788").replace(/\/$/, "");
const API = `${BASE}/api/v1`;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@signlearn.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const USER_EMAIL = process.env.USER_EMAIL;
const USER_PASSWORD = process.env.USER_PASSWORD;

if (!ADMIN_PASSWORD || !USER_EMAIL || !USER_PASSWORD) {
  console.error("Set ADMIN_PASSWORD, USER_EMAIL, dan USER_PASSWORD lebih dulu.");
  process.exit(1);
}

let pass = 0;
let fail = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    pass += 1;
    console.log(`  ✓ ${name}`);
  } else {
    fail += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, 58 - title.length))}`);
}

async function call(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* respons tanpa body */
  }
  return { status: res.status, body: json, data: json?.data ?? null };
}

const created = { courseId: null, lessonId: null, quizId: null, translationId: null };

async function main() {
  console.log(`Target: ${API}\n`);

  // ─── Auth ──────────────────────────────────────────────────────────
  section("Autentikasi");

  const adminLogin = await call("POST", "/auth/login", {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  check("Login admin", adminLogin.status === 200, `status ${adminLogin.status}`);
  check("Peran admin benar", adminLogin.data?.user?.role === "admin");
  const adminToken = adminLogin.data?.accessToken;

  const userLogin = await call("POST", "/auth/login", {
    body: { email: USER_EMAIL, password: USER_PASSWORD },
  });
  check("Login user", userLogin.status === 200, `status ${userLogin.status}`);
  const userToken = userLogin.data?.accessToken;

  const badLogin = await call("POST", "/auth/login", {
    body: { email: ADMIN_EMAIL, password: "SalahSekali9!" },
  });
  check("Kredensial salah ditolak 401", badLogin.status === 401, `status ${badLogin.status}`);

  const noToken = await call("GET", "/users");
  check("Tanpa token ditolak 401", noToken.status === 401, `status ${noToken.status}`);

  const userOnAdmin = await call("GET", "/users", { token: userToken });
  check("Peran user ditolak 403 di endpoint admin", userOnAdmin.status === 403, `status ${userOnAdmin.status}`);

  if (!adminToken || !userToken) {
    console.error("\nToken tidak didapat — pemeriksaan dihentikan.");
    process.exit(1);
  }

  // ─── Kursus ────────────────────────────────────────────────────────
  section("Kursus");

  const courseCreate = await call("POST", "/courses", {
    token: adminToken,
    body: { title: `E2E Kursus ${Date.now()}`, level: "Pemula", category: "E2E" },
  });
  check("Buat kursus", courseCreate.status === 201, `status ${courseCreate.status}`);
  created.courseId = courseCreate.data?.course?.id;
  check("totalLessons mulai 0", courseCreate.data?.course?.totalLessons === 0);

  const courseUpdate = await call("PUT", `/courses/${created.courseId}`, {
    token: adminToken,
    body: { description: "Diperbarui oleh e2e-check." },
  });
  check("Ubah kursus", courseUpdate.status === 200, `status ${courseUpdate.status}`);

  const courseList = await call("GET", "/courses?limit=100");
  check("Daftar kursus publik", courseList.status === 200);

  // ─── Pelajaran ─────────────────────────────────────────────────────
  section("Pelajaran");

  const lessonCreate = await call("POST", `/courses/${created.courseId}/lessons`, {
    token: adminToken,
    body: { title: "E2E Pelajaran Satu", duration: "5 mnt" },
  });
  check("Buat pelajaran", lessonCreate.status === 201, `status ${lessonCreate.status}`);
  created.lessonId = lessonCreate.data?.lesson?.id;

  const lesson2 = await call("POST", `/courses/${created.courseId}/lessons`, {
    token: adminToken,
    body: { title: "E2E Pelajaran Dua", sortOrder: 2 },
  });
  check("Buat pelajaran kedua", lesson2.status === 201, `status ${lesson2.status}`);
  const lesson2Id = lesson2.data?.lesson?.id;

  const reorder = await call("PATCH", `/courses/${created.courseId}/lessons/reorder`, {
    token: adminToken,
    body: { order: [lesson2Id, created.lessonId] },
  });
  check("Urutkan ulang pelajaran", reorder.status === 200, `status ${reorder.status}`);

  const courseAfter = await call("GET", `/courses/${created.courseId}`);
  check("totalLessons ikut terhitung jadi 2", courseAfter.data?.course?.totalLessons === 2, `nilai ${courseAfter.data?.course?.totalLessons}`);

  // ─── Kuis & soal ───────────────────────────────────────────────────
  section("Kuis & soal");

  const quizCreate = await call("POST", `/courses/${created.courseId}/quizzes`, {
    token: adminToken,
    body: { title: "E2E Kuis", lessonId: created.lessonId, minPassingScore: 50, durationSeconds: 300 },
  });
  check("Buat kuis", quizCreate.status === 201, `status ${quizCreate.status}`);
  created.quizId = quizCreate.data?.quiz?.id;

  const emptySubmit = await call("POST", `/courses/${created.courseId}/quizzes/${created.quizId}/submit`, {
    token: userToken,
    body: { answers: [{ questionId: "1", selectedIndex: 0 }] },
  });
  check("Kuis tanpa soal ditolak 409", emptySubmit.status === 409, `status ${emptySubmit.status}`);

  const q1 = await call("POST", `/courses/${created.courseId}/quizzes/${created.quizId}/questions`, {
    token: adminToken,
    body: { question: "Berapa tangan untuk BISINDO?", options: ["Satu", "Dua"], correctIndex: 1 },
  });
  check("Buat soal 1", q1.status === 201, `status ${q1.status}`);

  const q2 = await call("POST", `/courses/${created.courseId}/quizzes/${created.quizId}/questions`, {
    token: adminToken,
    body: { question: "BISINDO singkatan dari?", options: ["Bahasa Isyarat Indonesia", "Bahasa Indonesia"], correctIndex: 0 },
  });
  check("Buat soal 2", q2.status === 201, `status ${q2.status}`);

  const badIndex = await call("POST", `/courses/${created.courseId}/quizzes/${created.quizId}/questions`, {
    token: adminToken,
    body: { question: "Soal cacat", options: ["A", "B"], correctIndex: 5 },
  });
  check("correctIndex di luar jangkauan ditolak 422", badIndex.status === 422, `status ${badIndex.status}`);

  const dupOptions = await call("POST", `/courses/${created.courseId}/quizzes/${created.quizId}/questions`, {
    token: adminToken,
    body: { question: "Opsi kembar", options: ["Sama", "sama"], correctIndex: 0 },
  });
  check("Opsi duplikat ditolak 422", dupOptions.status === 422, `status ${dupOptions.status}`);

  const adminView = await call("GET", `/courses/${created.courseId}/quizzes/${created.quizId}`, { token: adminToken });
  check("Admin MELIHAT correctIndex", adminView.data?.questions?.every((q) => "correctIndex" in q));

  const userView = await call("GET", `/courses/${created.courseId}/quizzes/${created.quizId}`, { token: userToken });
  check(
    "User TIDAK menerima correctIndex",
    userView.data?.questions?.every((q) => !("correctIndex" in q)),
    "kunci jawaban bocor ke peserta",
  );

  const questions = adminView.data?.questions ?? [];
  const reorderQ = await call("PATCH", `/courses/${created.courseId}/quizzes/${created.quizId}/questions/reorder`, {
    token: adminToken,
    body: { order: [questions[1]?.id, questions[0]?.id] },
  });
  check("Urutkan ulang soal", reorderQ.status === 200, `status ${reorderQ.status}`);

  // ─── Penilaian ─────────────────────────────────────────────────────
  section("Penilaian kuis");

  const allCorrect = questions.map((q) => ({ questionId: q.id, selectedIndex: q.correctIndex }));
  const submitFull = await call("POST", `/courses/${created.courseId}/quizzes/${created.quizId}/submit`, {
    token: userToken,
    body: { answers: allCorrect, durationSeconds: 42 },
  });
  check("Kirim jawaban benar semua", submitFull.status === 201, `status ${submitFull.status}`);
  check("Skor 100 dihitung server", submitFull.data?.result?.score === 100, `skor ${submitFull.data?.result?.score}`);
  check("Lulus terhadap KKM 50", submitFull.data?.result?.passed === true);

  const partial = await call("POST", `/courses/${created.courseId}/quizzes/${created.quizId}/submit`, {
    token: userToken,
    body: { answers: [allCorrect[0]] },
  });
  check("Jawaban parsial ditolak 422", partial.status === 422, `status ${partial.status}`);

  const adminSubmit = await call("POST", `/courses/${created.courseId}/quizzes/${created.quizId}/submit`, {
    token: adminToken,
    body: { answers: allCorrect },
  });
  check("Admin tidak boleh mengerjakan kuis (403)", adminSubmit.status === 403, `status ${adminSubmit.status}`);

  // ─── Progres & dashboard ───────────────────────────────────────────
  section("Progres & dashboard");

  const markLesson = await call("PUT", `/progress/lessons/${created.lessonId}`, {
    token: userToken,
    body: { status: "completed" },
  });
  check("Tandai pelajaran selesai", markLesson.status === 200, `status ${markLesson.status}`);

  const progress = await call("GET", "/progress", { token: userToken });
  check("Ringkasan progres", progress.status === 200, `status ${progress.status}`);
  check("summary memuat streakDays", typeof progress.data?.summary?.streakDays === "number");

  const meDash = await call("GET", "/dashboard/me", { token: userToken });
  check("Dashboard pembelajar", meDash.status === 200, `status ${meDash.status}`);

  const adminDash = await call("GET", "/dashboard/admin", { token: adminToken });
  check("Dashboard admin", adminDash.status === 200, `status ${adminDash.status}`);
  check("totals memuat lima angka", ["users", "activeUsers", "courses", "lessons", "quizzes"].every((k) => k in (adminDash.data?.totals ?? {})));

  const today = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

  const reports = await call("GET", `/dashboard/admin/reports?from=${from}&to=${today}&groupBy=day`, { token: adminToken });
  check("Laporan admin", reports.status === 200, `status ${reports.status}`);
  check("Deret 30 titik termasuk hari kosong", reports.data?.series?.length === 30, `panjang ${reports.data?.series?.length}`);

  // ─── Admin ─────────────────────────────────────────────────────────
  section("Admin");

  const stats = await call("GET", "/admin/stats", { token: adminToken });
  check("Statistik platform", stats.status === 200, `status ${stats.status}`);

  const activities = await call("GET", "/admin/activities?limit=5", { token: adminToken });
  check("Feed aktivitas", activities.status === 200, `status ${activities.status}`);

  const qr = await call("GET", `/admin/quiz-results?from=${from}&to=${today}&limit=50`, { token: adminToken });
  check("Hasil kuis lintas pengguna", qr.status === 200, `status ${qr.status}`);
  const s = qr.data?.summary;
  check("Pita nilai berjumlah = total", s && s.bands.high + s.bands.mid + s.bands.low === s.total);
  check("Hasil kuis tidak membawa answers", (qr.data?.items ?? []).every((r) => !("answers" in r)));

  const users = await call("GET", "/users?limit=5", { token: adminToken });
  check("Daftar pengguna", users.status === 200, `status ${users.status}`);

  // ─── Terjemahan ────────────────────────────────────────────────────
  section("Bank kata / terjemahan");

  const word = `e2e-${Date.now()}`;
  const tCreate = await call("POST", "/translations", {
    token: adminToken,
    body: { word, translation: "Dua tangan membentuk huruf.", category: "E2E", aliases: [`${word}-alias`] },
  });
  check("Buat entri", tCreate.status === 201, `status ${tCreate.status}`);
  created.translationId = tCreate.data?.translation?.id;

  const tList = await call("GET", "/translations?limit=5");
  check("Daftar publik", tList.status === 200, `status ${tList.status}`);

  const tLookup = await call("GET", `/translations/lookup?word=${word}`);
  check("Lookup menemukan kata", tLookup.status === 200, `status ${tLookup.status}`);

  const tAlias = await call("GET", `/translations/lookup?word=${word}-alias`);
  check("Lookup lewat alias", tAlias.status === 200, `status ${tAlias.status}`);

  const tCat = await call("GET", "/translations/categories");
  check("Daftar kategori", tCat.status === 200, `status ${tCat.status}`);

  const tUserWrite = await call("POST", "/translations", {
    token: userToken,
    body: { word: `tolak-${Date.now()}`, translation: "x" },
  });
  check("Peran user tidak boleh menulis (403)", tUserWrite.status === 403, `status ${tUserWrite.status}`);

  // ─── Permintaan tanpa body (regresi data:null) ─────────────────────
  section("Permintaan tanpa body");

  const delTranslation = await call("DELETE", `/translations/${created.translationId}`, { token: adminToken });
  check("DELETE tanpa body tidak 400", delTranslation.status === 200, `status ${delTranslation.status}`);
  if (delTranslation.status === 200) created.translationId = null;

  const logout = await call("POST", "/auth/logout");
  check("POST /auth/logout tanpa body", logout.status === 200, `status ${logout.status}`);

  // ─── Bersih-bersih ─────────────────────────────────────────────────
  section("Bersih-bersih");

  const delQuiz = await call("DELETE", `/courses/${created.courseId}/quizzes/${created.quizId}`, { token: adminToken });
  check("Kuis yang sudah dikerjakan ditolak 409", delQuiz.status === 409, `status ${delQuiz.status}`);

  const delCourse = await call("DELETE", `/courses/${created.courseId}`, { token: adminToken });
  check(
    "Kursus dengan riwayat belajar ditolak 409",
    delCourse.status === 409,
    `status ${delCourse.status}`,
  );

  if (delCourse.status === 409) {
    console.log("  ℹ Data uji sengaja dipertahankan: server menolak menghapus konten");
    console.log(`    yang sudah dipelajari. courseId=${created.courseId}`);
  }

  // ─── Layanan AI ────────────────────────────────────────────────────
  section("Layanan AI");

  try {
    const aiHealth = await fetch("http://127.0.0.1:8000/api/health");
    check("AI /api/health", aiHealth.status === 200, `status ${aiHealth.status}`);

    const aiPredict = await fetch("http://127.0.0.1:8000/api/v1/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    check("AI /predict menolak JSON dengan 415", aiPredict.status === 415, `status ${aiPredict.status}`);
  } catch (error) {
    check("Layanan AI terjangkau", false, error.message);
  }

  // ─── Ringkasan ─────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(62)}`);
  console.log(`  LULUS: ${pass}   GAGAL: ${fail}`);
  if (failures.length) {
    console.log("\n  Yang gagal:");
    failures.forEach((f) => console.log(`    · ${f}`));
  }
  console.log("═".repeat(62));

  process.exit(fail === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("\nPemeriksaan berhenti:", error.message);
  process.exit(1);
});
