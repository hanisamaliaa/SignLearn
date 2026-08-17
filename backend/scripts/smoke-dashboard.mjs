#!/usr/bin/env node
/**
 * Smoke test modul Dashboard & Admin — API Contract §10.3-10.6.
 *
 *   npm run smoke:dashboard
 *
 * Membangun sedikit riwayat belajar sungguhan lebih dulu (menyelesaikan
 * pelajaran, mengerjakan kuis) supaya angka yang diuji berasal dari data
 * nyata, bukan dari database kosong yang membuat setiap nol terlihat benar.
 */

import {
  call, check, section, summary, requireServer,
  registerUser, loginAdmin, grantPremiumFixture, closeHarnessDatabase, c,
} from "./lib/harness.mjs";

/** Menyiapkan data: satu kursus + pelajaran + kuis, lalu dikerjakan learner. */
async function seedActivity(admin, learner) {
  const course = await call("/courses", {
    token: admin.token,
    method: "POST",
    body: {
      title: `Kursus Uji Dashboard ${Date.now()}`,
      level: "Pemula",
      category: "Uji",
      description: "Dibuat oleh smoke test dashboard.",
    },
  });
  if (course.status !== 201 && course.status !== 200) {
    throw new Error(`buat kursus gagal (${course.status}): ${JSON.stringify(course.body)}`);
  }
  const courseId = course.data.course?.id ?? course.data.id;

  const lessonIds = [];
  for (const title of ["Pelajaran Satu", "Pelajaran Dua"]) {
    const res = await call(`/courses/${courseId}/lessons`, {
      token: admin.token,
      method: "POST",
      body: { title, duration: "5 menit" },
    });
    lessonIds.push(res.data.lesson?.id ?? res.data.id);
  }

  const quiz = await call(`/courses/${courseId}/quizzes`, {
    token: admin.token,
    method: "POST",
    body: { title: "Kuis Uji Dashboard", lessonId: lessonIds[0], minPassingScore: 50 },
  });
  const quizId = quiz.data.quiz?.id ?? quiz.data.id;

  const questionIds = [];
  for (let index = 0; index < 5; index += 1) {
    const question = await call(`/courses/${courseId}/quizzes/${quizId}/questions`, {
      token: admin.token,
      method: "POST",
      body: {
        question: `Soal dashboard ${index + 1}`,
        options: ["1", "2", "3", "4"],
        correctIndex: 1,
      },
    });
    questionIds.push(question.data.question?.id ?? question.data.id);
  }

  // Learner menyelesaikan pelajaran pertama dan lulus kuisnya.
  await call(`/progress/lessons/${lessonIds[0]}`, {
    token: learner.token, method: "PUT", body: { status: "completed" },
  });
  const started = await call(`/courses/${courseId}/quizzes/${quizId}/start`, {
    token: learner.token,
    method: "POST",
  });
  const submitted = await call(`/courses/${courseId}/quizzes/${quizId}/submit`, {
    token: learner.token,
    method: "POST",
    body: {
      sessionId: started.data?.session?.id,
      answers: questionIds.map((questionId) => ({ questionId, selectedIndex: 1 })),
      durationSeconds: 30,
    },
  });

  return { courseId, lessonIds, quizId, submitted };
}

async function main() {
  console.log(`\n${c.b("SignLearn — smoke test dashboard & admin")}`);
  await requireServer();

  const admin = await loginAdmin();
  const learner = await registerUser("dash");
  const freshUser = await registerUser("baru");
  await grantPremiumFixture(learner.id);
  const fixture = await seedActivity(admin, learner);

  // §8.12 menetapkan 201: satu baris `quiz_results` benar-benar dibuat.
  check("persiapan: kuis berhasil dikerjakan", fixture.submitted.status === 201,
    `${fixture.submitted.status}`);

  // ── GET /dashboard/me — §10.3 ──────────────────────────────────────────
  section("GET /dashboard/me — §10.3");

  const anon = await call("/dashboard/me");
  check("tanpa token ditolak", anon.status === 401, anon.body?.code);

  const me = await call("/dashboard/me", { token: learner.token });
  check("berhasil", me.status === 200, `${me.status}`);
  check("memuat user ringkas", me.data?.user?.id === learner.id && "avatar" in (me.data?.user ?? {}));
  check("user TIDAK memuat email/role", !("email" in (me.data?.user ?? {})));

  check("memuat summary",
    ["coursesStarted", "coursesCompleted", "lessonsCompleted", "totalLessons",
     "quizzesPassed", "overallPercent", "streakDays"].every((k) => k in (me.data?.summary ?? {})));
  check("summary mencerminkan pelajaran yang selesai",
    me.data?.summary?.lessonsCompleted >= 1, `${me.data?.summary?.lessonsCompleted}`);
  check("summary mencerminkan kuis yang lulus",
    me.data?.summary?.quizzesPassed >= 1, `${me.data?.summary?.quizzesPassed}`);

  check("memuat continueLearning", "continueLearning" in (me.data ?? {}));
  check("continueLearning menunjuk pelajaran berikutnya",
    me.data?.continueLearning?.lessonId === fixture.lessonIds[1],
    `lessonId=${me.data?.continueLearning?.lessonId}`);
  check("continueLearning memuat judul",
    typeof me.data?.continueLearning?.courseTitle === "string" &&
    typeof me.data?.continueLearning?.lessonTitle === "string");

  check("memuat recentQuizzes", Array.isArray(me.data?.recentQuizzes));
  check("recentQuizzes memuat kuis yang baru dikerjakan",
    me.data?.recentQuizzes?.[0]?.quizId === fixture.quizId,
    `${me.data?.recentQuizzes?.[0]?.quizId}`);
  check("recentQuizzes berbentuk kontrak",
    ["quizId", "quizTitle", "score", "passed", "takenAt"]
      .every((k) => k in (me.data?.recentQuizzes?.[0] ?? {})));
  check("recentQuizzes TIDAK membocorkan kunci jawaban",
    !JSON.stringify(me.data?.recentQuizzes ?? []).includes("correctIndex"));

  check("memuat blok practice", "practice" in (me.data ?? {}));

  // Pengguna baru: kontrak menyebut continueLearning bernilai null supaya
  // frontend menampilkan CTA ke /courses, bukan kartu kosong.
  const fresh = await call("/dashboard/me", { token: freshUser.token });
  check("pengguna baru: berhasil", fresh.status === 200, `${fresh.status}`);
  check("pengguna baru: continueLearning null", fresh.data?.continueLearning === null,
    JSON.stringify(fresh.data?.continueLearning));
  check("pengguna baru: recentQuizzes kosong", fresh.data?.recentQuizzes?.length === 0);
  check("pengguna baru: angka nol, bukan null",
    fresh.data?.summary?.lessonsCompleted === 0 && fresh.data?.summary?.overallPercent === 0);

  // Admin memakai dashboard-nya sendiri; /dashboard/me bukan untuknya.
  const adminMe = await call("/dashboard/me", { token: admin.token });
  check("admin tetap dilayani tanpa error", adminMe.status === 200, `${adminMe.status}`);

  // ── GET /dashboard/admin — §10.4 ───────────────────────────────────────
  section("GET /dashboard/admin — §10.4");

  const adminAnon = await call("/dashboard/admin");
  check("tanpa token ditolak", adminAnon.status === 401, adminAnon.body?.code);

  const adminAsUser = await call("/dashboard/admin", { token: learner.token });
  check("peran user ditolak", adminAsUser.status === 403, adminAsUser.body?.code);

  const dash = await call("/dashboard/admin", { token: admin.token });
  check("admin berhasil", dash.status === 200, `${dash.status}`);
  check("memuat totals",
    ["users", "activeUsers", "courses", "lessons", "quizzes"]
      .every((k) => k in (dash.data?.totals ?? {})));
  check("memuat growth",
    ["newUsers7d", "newUsers30d"].every((k) => k in (dash.data?.growth ?? {})));
  check("memuat engagement",
    ["lessonsCompleted7d", "quizzesTaken7d", "avgQuizScore"]
      .every((k) => k in (dash.data?.engagement ?? {})));

  check("totals.users menghitung pengguna nyata", dash.data?.totals?.users >= 3,
    `${dash.data?.totals?.users}`);
  check("totals.courses menghitung kursus nyata", dash.data?.totals?.courses >= 1,
    `${dash.data?.totals?.courses}`);
  check("growth mencatat pendaftaran hari ini", dash.data?.growth?.newUsers7d >= 2,
    `${dash.data?.growth?.newUsers7d}`);
  check("engagement mencatat aktivitas hari ini",
    dash.data?.engagement?.lessonsCompleted7d >= 1 && dash.data?.engagement?.quizzesTaken7d >= 1,
    `lessons=${dash.data?.engagement?.lessonsCompleted7d} quizzes=${dash.data?.engagement?.quizzesTaken7d}`);
  check("seluruh angka berupa number",
    Object.values(dash.data?.totals ?? {}).every((v) => typeof v === "number"));

  // ── GET /dashboard/admin/reports — §10.5 ───────────────────────────────
  section("GET /dashboard/admin/reports — §10.5");

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);

  const reportAsUser = await call(`/dashboard/admin/reports?from=${weekAgo}&to=${today}`, {
    token: learner.token,
  });
  check("peran user ditolak", reportAsUser.status === 403, reportAsUser.body?.code);

  const noRange = await call("/dashboard/admin/reports", { token: admin.token });
  check("from & to wajib", noRange.status === 422, `${noRange.status}`);

  const badFormat = await call("/dashboard/admin/reports?from=01-08-2026&to=2026-08-10", {
    token: admin.token,
  });
  check("format tanggal salah ditolak", badFormat.status === 422, `${badFormat.status}`);

  const reversed = await call(`/dashboard/admin/reports?from=${today}&to=${weekAgo}`, {
    token: admin.token,
  });
  check("from setelah to ditolak", reversed.status === 422, `${reversed.status}`);

  const tooWide = await call("/dashboard/admin/reports?from=2020-01-01&to=2026-08-10", {
    token: admin.token,
  });
  check("rentang lebih dari 365 hari ditolak", tooWide.status === 422, `${tooWide.status}`);

  const badGroup = await call(
    `/dashboard/admin/reports?from=${weekAgo}&to=${today}&groupBy=decade`,
    { token: admin.token },
  );
  check("groupBy tidak dikenal ditolak", badGroup.status === 422, `${badGroup.status}`);

  const report = await call(`/dashboard/admin/reports?from=${weekAgo}&to=${today}`, {
    token: admin.token,
  });
  check("laporan berhasil", report.status === 200, `${report.status}`);
  check("memuat range", report.data?.range?.from === weekAgo && report.data?.range?.to === today);
  check("groupBy default 'day'", report.data?.range?.groupBy === "day",
    report.data?.range?.groupBy);
  check("memuat series", Array.isArray(report.data?.series));
  check("series berbentuk kontrak",
    ["date", "newUsers", "lessonsCompleted", "quizzesTaken"]
      .every((k) => k in (report.data?.series?.[0] ?? {})));

  // Rentang 7 hari harus menghasilkan 7 titik, termasuk hari tanpa aktivitas.
  // Melewatkan hari kosong membuat grafik frontend melompat dan berbohong.
  check("series memuat hari tanpa aktivitas (7 titik)", report.data?.series?.length === 7,
    `${report.data?.series?.length} titik`);
  check("hari ini mencatat pendaftaran",
    report.data?.series?.at(-1)?.newUsers >= 2,
    `${report.data?.series?.at(-1)?.newUsers}`);

  check("memuat topCourses", Array.isArray(report.data?.topCourses));
  check("topCourses berbentuk kontrak",
    report.data.topCourses.length === 0 ||
    ["courseId", "title", "enrollments", "completionRate"]
      .every((k) => k in report.data.topCourses[0]));
  check("completionRate berupa pecahan 0-1",
    report.data.topCourses.every((t) => t.completionRate >= 0 && t.completionRate <= 1));

  const monthly = await call(
    `/dashboard/admin/reports?from=${weekAgo}&to=${today}&groupBy=month`,
    { token: admin.token },
  );
  check("groupBy=month diterima", monthly.status === 200, `${monthly.status}`);
  check("groupBy=month memadatkan series", monthly.data?.series?.length <= 2,
    `${monthly.data?.series?.length} titik`);

  const weekly = await call(
    `/dashboard/admin/reports?from=${weekAgo}&to=${today}&groupBy=week`,
    { token: admin.token },
  );
  check("groupBy=week diterima", weekly.status === 200, `${weekly.status}`);

  // ── GET /admin/stats — §10.6 ───────────────────────────────────────────
  section("GET /admin/stats — §10.6");

  const statsAsUser = await call("/admin/stats", { token: learner.token });
  check("peran user ditolak", statsAsUser.status === 403, statsAsUser.body?.code);

  const stats = await call("/admin/stats", { token: admin.token });
  check("admin berhasil", stats.status === 200, `${stats.status}`);
  check("bentuknya sama dengan dashboard.admin.totals",
    ["users", "activeUsers", "courses", "lessons", "quizzes"]
      .every((k) => k in (stats.data?.totals ?? {})));
  check("angkanya konsisten dengan /dashboard/admin",
    stats.data?.totals?.courses === dash.data?.totals?.courses,
    `${stats.data?.totals?.courses} vs ${dash.data?.totals?.courses}`);

  // ── GET /admin/activities — §10.6 ──────────────────────────────────────
  section("GET /admin/activities — §10.6");

  const actAsUser = await call("/admin/activities", { token: learner.token });
  check("peran user ditolak", actAsUser.status === 403, actAsUser.body?.code);

  const activities = await call("/admin/activities", { token: admin.token });
  check("admin berhasil", activities.status === 200, `${activities.status}`);
  check("berbentuk items + pagination",
    Array.isArray(activities.data?.items) && typeof activities.data?.pagination === "object");
  check("ada aktivitas tercatat", activities.data?.items?.length > 0,
    `${activities.data?.items?.length} item`);
  check("item berbentuk kontrak",
    ["id", "type", "actor", "subject", "createdAt"]
      .every((k) => k in (activities.data?.items?.[0] ?? {})));
  check("setiap item punya kunci actor",
    activities.data.items.every((i) => "actor" in i));

  // Peristiwa yang berasal dari tindakan seseorang WAJIB menyebut siapa.
  check("aktivitas pengguna menyebut aktornya",
    activities.data.items
      .filter((i) => i.type !== "course_created")
      .every((i) => typeof i.actor?.id === "string" && typeof i.actor?.name === "string"));

  // `course_created` adalah pengecualian yang disengaja: skema tidak punya
  // kolom `created_by`, jadi aktornya memang tidak diketahui. Mengarangnya
  // menjadi "Administrator" akan membuat log audit berbohong.
  check("course_created jujur menyatakan aktor tidak diketahui",
    activities.data.items
      .filter((i) => i.type === "course_created")
      .every((i) => i.actor === null));
  check("terurut dari yang terbaru",
    activities.data.items.every((item, i, arr) =>
      i === 0 || new Date(arr[i - 1].createdAt) >= new Date(item.createdAt)));
  check("id setiap aktivitas unik",
    new Set(activities.data.items.map((i) => i.id)).size === activities.data.items.length);

  const passed = await call("/admin/activities?type=quiz_passed", { token: admin.token });
  check("filter type=quiz_passed bekerja",
    passed.status === 200 && passed.data.items.every((i) => i.type === "quiz_passed"),
    `${passed.data?.items?.length} item`);

  const registered = await call("/admin/activities?type=user_registered", { token: admin.token });
  check("filter type=user_registered bekerja",
    registered.data?.items?.length > 0 &&
    registered.data.items.every((i) => i.type === "user_registered"));

  const badType = await call("/admin/activities?type=meledak", { token: admin.token });
  check("type tidak dikenal ditolak", badType.status === 422, `${badType.status}`);

  const pagedAct = await call("/admin/activities?page=1&limit=2", { token: admin.token });
  check("limit dipatuhi", pagedAct.data?.items?.length <= 2, `${pagedAct.data?.items?.length}`);
  check("pagination lengkap",
    ["page", "limit", "total", "totalPages", "hasNext", "hasPrev"]
      .every((k) => k in (pagedAct.data?.pagination ?? {})));

  const page2 = await call("/admin/activities?page=2&limit=2", { token: admin.token });
  check("halaman kedua tidak mengulang halaman pertama",
    page2.data?.items?.every((i) => !pagedAct.data.items.some((p) => p.id === i.id)) !== false);

  // ── POST /admin/ai/** — §10.8 (placeholder berbendera fitur) ───────────
  section("Admin AI — placeholder (§10.8)");

  const aiAsUser = await call(`/admin/ai/subtitles/${fixture.lessonIds[0]}`, {
    token: learner.token, method: "POST", body: {},
  });
  check("peran user ditolak", aiAsUser.status === 403, aiAsUser.body?.code);

  /**
   * Fitur yang belum ada harus MENGATAKANNYA, bukan membalas 200.
   *
   * Placeholder yang membalas `200 {"data": null}` memberi tahu frontend bahwa
   * pekerjaan berhasil. UI lalu menampilkan "subtitle sedang dibuat" untuk
   * proses yang tidak pernah berjalan, dan tidak seorang pun tahu fitur itu
   * belum ada sampai ada yang mencarinya di produksi.
   */
  const subtitles = await call(`/admin/ai/subtitles/${fixture.lessonIds[0]}`, {
    token: admin.token, method: "POST", body: {},
  });
  check("AI subtitle membalas 501, bukan 200", subtitles.status === 501,
    `${subtitles.status}`);
  check("kode error NOT_IMPLEMENTED", subtitles.body?.code === "NOT_IMPLEMENTED",
    subtitles.body?.code);

  const aiQuiz = await call(`/admin/ai/quiz/${fixture.lessonIds[0]}`, {
    token: admin.token, method: "POST", body: {},
  });
  check("AI kuis membalas 501, bukan 200", aiQuiz.status === 501, `${aiQuiz.status}`);
  check("bukan 500 — placeholder tidak boleh terlihat seperti server rusak",
    aiQuiz.status !== 500, `${aiQuiz.status}`);

  process.exitCode = summary("dashboard & admin") ? 0 : 1;
}

main().catch((err) => {
  console.error(`\n  ${c.no("Test berhenti:")} ${err.message}\n`);
  process.exitCode = 1;
}).finally(() => closeHarnessDatabase());
