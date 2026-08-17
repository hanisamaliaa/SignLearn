#!/usr/bin/env node
/**
 * Smoke test modul konten — Courses, Lessons, Quizzes, Progress.
 * API Contract §8.1-8.13 dan §10.1-10.2.
 *
 *   npm run smoke:content
 *
 * ── Kenapa suite ini ada ──────────────────────────────────────────────
 *
 * Modul-modul ini sempat diverifikasi lewat skrip sekali pakai yang tidak
 * ikut tersimpan. Akibatnya perubahan lintas-modul — misalnya mengekstrak
 * paginasi ke satu utilitas bersama — tidak punya jaring pengaman sama
 * sekali: seluruh test lain tetap hijau meski daftar kursus rusak total.
 */

import {
  call, check, section, summary, requireServer,
  registerUser, loginAdmin, grantPremiumFixture, closeHarnessDatabase, c,
} from "./lib/harness.mjs";

async function main() {
  console.log(`\n${c.b("SignLearn — smoke test konten & progres")}`);
  await requireServer();

  const admin = await loginAdmin();
  const learner = await registerUser("murid");
  await grantPremiumFixture(learner.id);
  const stamp = Date.now();

  // ── Courses: tulis ─────────────────────────────────────────────────────
  section("Courses — tulis (§8.3-8.5)");

  const anonCreate = await call("/courses", {
    method: "POST", body: { title: "Kursus Anonim", level: "Pemula" },
  });
  check("anon tidak dapat membuat kursus", anonCreate.status === 401, anonCreate.body?.code);

  const userCreate = await call("/courses", {
    token: learner.token, method: "POST", body: { title: "Kursus Murid", level: "Pemula" },
  });
  check("peran user tidak dapat membuat kursus", userCreate.status === 403, userCreate.body?.code);

  const invalid = await call("/courses", {
    token: admin.token, method: "POST", body: { title: "ab", level: "Dewa" },
  });
  check("validasi menolak judul pendek & level tak dikenal", invalid.status === 422,
    `${invalid.status}`);
  check("error dilaporkan per field",
    Array.isArray(invalid.body?.errors) && invalid.body.errors.length === 2,
    `${invalid.body?.errors?.length} pelanggaran`);

  const xss = await call("/courses", {
    token: admin.token,
    method: "POST",
    body: { title: "Kursus XSS", level: "Pemula", thumbnail: "javascript:alert(1)" },
  });
  check("thumbnail non-http ditolak", xss.status === 422, `${xss.status}`);

  const created = await call("/courses", {
    token: admin.token,
    method: "POST",
    body: {
      title: `Konten Uji ${stamp}`,
      titleEn: "Content Test",
      level: "Menengah",
      category: `Uji${stamp}`,
      description: "Dibuat smoke test konten.",
      estimatedHours: 3.5,
    },
  });
  check("admin dapat membuat kursus", created.status === 201, `${created.status}`);
  const courseId = created.data?.course?.id;
  check("id kursus berupa string", typeof courseId === "string");
  check("totalLessons dimulai dari 0", created.data?.course?.totalLessons === 0);

  const totalLessonsInjection = await call(`/courses/${courseId}`, {
    token: admin.token, method: "PUT", body: { totalLessons: 999 },
  });
  check("totalLessons tidak dapat dikirim klien", totalLessonsInjection.status === 422,
    `${totalLessonsInjection.status}`);

  // ── Courses: baca, filter, urut, paginasi ──────────────────────────────
  section("Courses — baca & paginasi (§8.1-8.2, §2.7-2.8)");

  const list = await call("/courses", { token: learner.token });
  check("daftar kursus berhasil", list.status === 200, `${list.status}`);
  check("berbentuk items + pagination",
    Array.isArray(list.data?.items) && typeof list.data?.pagination === "object");
  check("pagination lengkap §2.7",
    ["page", "limit", "total", "totalPages", "hasNext", "hasPrev"]
      .every((k) => k in (list.data?.pagination ?? {})));

  const paged = await call("/courses?page=1&limit=2", { token: learner.token });
  check("limit dipatuhi", paged.data?.items?.length <= 2, `${paged.data?.items?.length}`);
  check("hasNext benar saat masih ada halaman",
    paged.data?.pagination?.hasNext === (paged.data.pagination.totalPages > 1));
  check("hasPrev false di halaman pertama", paged.data?.pagination?.hasPrev === false);

  const page2 = await call("/courses?page=2&limit=2", { token: learner.token });
  check("halaman kedua punya hasPrev true", page2.data?.pagination?.hasPrev === true);

  const clamped = await call("/courses?limit=9999", { token: learner.token });
  check("limit dijepit ke 100", clamped.data?.pagination?.limit === 100,
    `${clamped.data?.pagination?.limit}`);

  const zeroPage = await call("/courses?page=0&limit=0", { token: learner.token });
  check("page/limit nol dinormalkan, bukan error",
    zeroPage.status === 200 && zeroPage.data.pagination.page === 1 &&
    zeroPage.data.pagination.limit >= 1,
    `page=${zeroPage.data?.pagination?.page} limit=${zeroPage.data?.pagination?.limit}`);

  const filtered = await call(`/courses?category=Uji${stamp}`, { token: learner.token });
  check("filter kategori bekerja", filtered.data?.items?.length === 1,
    `${filtered.data?.items?.length} hasil`);

  const badSort = await call("/courses?sortBy=id;DROP", { token: learner.token });
  check("sortBy di luar allowlist ditolak", badSort.status === 422, `${badSort.status}`);

  const badLevel = await call("/courses?level=Dewa", { token: learner.token });
  check("filter level tak dikenal ditolak", badLevel.status === 422, `${badLevel.status}`);

  const shortQuery = await call("/courses?q=%25", { token: learner.token });
  check("q satu karakter ditolak (§2.8)", shortQuery.status === 422, `${shortQuery.status}`);

  /**
   * Wildcard LIKE harus di-escape.
   *
   * Dipakai "%%" (dua karakter) dan bukan "%" karena aturan panjang minimum
   * menolak yang satu karakter LEBIH DULU — query itu tidak pernah sampai ke
   * kode pencarian, sehingga tidak menguji apa pun tentang escaping.
   * Tanpa ESCAPE, "%%" menjadi ILIKE '%%%%' yang cocok dengan SELURUH baris.
   */
  const wildcard = await call("/courses?q=%25%25", { token: learner.token });
  check("wildcard '%%' pada q tidak mengembalikan semua",
    wildcard.status === 200 && wildcard.data.items.length === 0,
    `${wildcard.data?.items?.length} hasil`);

  const underscore = await call("/courses?q=__", { token: learner.token });
  check("wildcard '__' pada q tidak mencocokkan sembarang karakter",
    underscore.status === 200 && underscore.data.items.length === 0,
    `${underscore.data?.items?.length} hasil`);

  const learnerView = await call("/courses", { token: learner.token });
  check("peran user menerima blok progress", "progress" in (learnerView.data?.items?.[0] ?? {}));

  const adminView = await call("/courses", { token: admin.token });
  check("admin TIDAK menerima blok progress", !("progress" in (adminView.data?.items?.[0] ?? {})));

  const detail = await call(`/courses/${courseId}`, { token: learner.token });
  check("detail memuat course, lessons, quizzes",
    ["course", "lessons", "quizzes"].every((k) => k in (detail.data ?? {})));

  const missingCourse = await call("/courses/99999999", { token: learner.token });
  check("kursus tidak ada = 404", missingCourse.status === 404, `${missingCourse.status}`);

  // ── Lessons ────────────────────────────────────────────────────────────
  section("Lessons (§8.6-8.9)");

  const lessonIds = [];
  for (const title of ["Pelajaran A", "Pelajaran B", "Pelajaran C"]) {
    const res = await call(`/courses/${courseId}/lessons`, {
      token: admin.token, method: "POST", body: { title, duration: "5 menit" },
    });
    lessonIds.push(res.data?.lesson?.id);
  }
  check("tiga pelajaran dibuat", lessonIds.every((id) => typeof id === "string"));

  const afterLessons = await call(`/courses/${courseId}`, { token: admin.token });
  check("totalLessons diselaraskan otomatis", afterLessons.data?.course?.totalLessons === 3,
    `${afterLessons.data?.course?.totalLessons}`);

  // Regresi: PUT parsial tidak boleh menghapus field yang tidak dikirim.
  const before = await call(`/lessons/${lessonIds[0]}`, { token: admin.token });
  const partial = await call(`/lessons/${lessonIds[0]}`, {
    token: admin.token, method: "PUT", body: { title: "Pelajaran A (revisi)" },
  });
  check("PUT parsial berhasil", partial.status === 200, `${partial.status}`);
  check("judul berubah", partial.data?.lesson?.title === "Pelajaran A (revisi)");
  check("durasi TIDAK ikut terhapus",
    partial.data?.lesson?.duration === before.data?.lesson?.duration,
    `${partial.data?.lesson?.duration}`);

  const anonDelete = await call(`/lessons/${lessonIds[2]}`, { method: "DELETE" });
  check("anon TIDAK dapat menghapus pelajaran", anonDelete.status === 401, anonDelete.body?.code);

  const neighbours = await call(`/courses/${courseId}/lessons/${lessonIds[1]}`, {
    token: admin.token,
  });
  check("detail pelajaran memuat prev & next",
    neighbours.data?.prev?.id === lessonIds[0] && neighbours.data?.next?.id === lessonIds[2],
    `prev=${neighbours.data?.prev?.id} next=${neighbours.data?.next?.id}`);

  const wrongCourse = await call(`/courses/99999999/lessons/${lessonIds[0]}`, {
    token: admin.token,
  });
  check("pelajaran di kursus lain = 404", wrongCourse.status === 404, `${wrongCourse.status}`);

  const partialReorder = await call(`/courses/${courseId}/lessons/reorder`, {
    token: admin.token, method: "PATCH", body: { order: [lessonIds[1]] },
  });
  check("reorder parsial ditolak", partialReorder.status === 422, `${partialReorder.status}`);

  const reorder = await call(`/courses/${courseId}/lessons/reorder`, {
    token: admin.token,
    method: "PATCH",
    body: { order: [lessonIds[2], lessonIds[0], lessonIds[1]] },
  });
  check("reorder lengkap berhasil", reorder.status === 200, `${reorder.status}`);
  check("urutan benar-benar berubah", reorder.data?.items?.[0]?.id === lessonIds[2],
    `${reorder.data?.items?.[0]?.id}`);

  // Kembalikan urutan semula agar sisa test mudah dibaca.
  await call(`/courses/${courseId}/lessons/reorder`, {
    token: admin.token, method: "PATCH", body: { order: lessonIds },
  });

  // ── Quizzes ────────────────────────────────────────────────────────────
  section("Quizzes (§8.10-8.13)");

  const quiz = await call(`/courses/${courseId}/quizzes`, {
    token: admin.token,
    method: "POST",
    body: { title: "Kuis Konten", lessonId: lessonIds[0], minPassingScore: 70 },
  });
  check("admin dapat membuat kuis", quiz.status === 201, `${quiz.status}`);
  const quizId = quiz.data?.quiz?.id;

  const questionIds = [];
  const correctIndexes = [1, 2, 0, 3, 1];
  for (const [index, correct] of correctIndexes.entries()) {
    const res = await call(`/courses/${courseId}/quizzes/${quizId}/questions`, {
      token: admin.token,
      method: "POST",
      body: {
        question: `Soal adaptif ${index + 1}`,
        options: ["A", "B", "C", "D"],
        correctIndex: correct,
      },
    });
    questionIds.push(res.data?.question?.id);
  }
  check("lima pertanyaan adaptif dibuat",
    questionIds.length === 5 && questionIds.every((id) => typeof id === "string"));

  const quizAfter = await call(`/courses/${courseId}/quizzes/${quizId}`, { token: admin.token });
  check("totalQuestions diselaraskan otomatis", quizAfter.data?.quiz?.totalQuestions === 5,
    `${quizAfter.data?.quiz?.totalQuestions}`);

  // Inti keamanan kuis: kunci jawaban tidak pernah sampai ke peserta.
  const asAdmin = await call(`/courses/${courseId}/quizzes/${quizId}`, { token: admin.token });
  check("admin MELIHAT correctIndex", "correctIndex" in (asAdmin.data?.questions?.[0] ?? {}));

  const asLearner = await call(`/courses/${courseId}/quizzes/${quizId}`, { token: learner.token });
  check("peserta TIDAK melihat correctIndex",
    !("correctIndex" in (asLearner.data?.questions?.[0] ?? {})));

  const asGuest = await call(`/courses/${courseId}/quizzes/${quizId}`);
  check("tamu TIDAK melihat correctIndex",
    !JSON.stringify(asGuest.data?.questions ?? []).includes("correctIndex"));

  const adminSubmit = await call(`/courses/${courseId}/quizzes/${quizId}/submit`, {
    token: admin.token,
    method: "POST",
    body: { answers: questionIds.map((id, i) => ({ questionId: id, selectedIndex: i + 1 })) },
  });
  check("admin TIDAK dapat mengerjakan kuis", adminSubmit.status === 403, adminSubmit.body?.code);

  const started = await call(`/courses/${courseId}/quizzes/${quizId}/start`, {
    token: learner.token,
    method: "POST",
  });
  const sessionId = started.data?.session?.id;
  check("sesi quiz Premium berisi lima soal", started.status === 201 &&
    Boolean(sessionId) && started.data?.questions?.length === 5);

  const partialAnswers = await call(`/courses/${courseId}/quizzes/${quizId}/submit`, {
    token: learner.token,
    method: "POST",
    body: { sessionId, answers: [{ questionId: questionIds[0], selectedIndex: correctIndexes[0] }] },
  });
  check("jawaban tidak lengkap ditolak", partialAnswers.status === 422,
    `${partialAnswers.status}`);

  const strayAnswer = await call(`/courses/${courseId}/quizzes/${quizId}/submit`, {
    token: learner.token,
    method: "POST",
    body: {
      sessionId,
      answers: [
        ...questionIds.map((id, index) => ({
          questionId: id,
          selectedIndex: correctIndexes[index],
        })),
        { questionId: "99999999", selectedIndex: 0 },
      ],
    },
  });
  check("jawaban untuk soal asing ditolak", strayAnswer.status === 422, `${strayAnswer.status}`);

  // Skor DIHITUNG SERVER: klien mengirim skor palsu, server mengabaikannya.
  const halfRight = await call(`/courses/${courseId}/quizzes/${quizId}/submit`, {
    token: learner.token,
    method: "POST",
    body: {
      sessionId,
      score: 100,
      passed: true,
      answers: questionIds.map((id, index) => ({
        questionId: id,
        selectedIndex: index < 2
          ? correctIndexes[index]
          : (correctIndexes[index] + 1) % 4,
      })),
    },
  });
  check("pengerjaan berhasil", halfRight.status === 201, `${halfRight.status}`);
  check("skor dihitung server, bukan diambil dari klien",
    halfRight.data?.result?.score === 40, `${halfRight.data?.result?.score}`);
  check("KKM per kuis diterapkan (40 < 70)", halfRight.data?.result?.passed === false);
  check("review menjelaskan jawaban salah",
    halfRight.data?.result?.review?.filter((r) => !r.isCorrect).length === 3);

  const retry = await call(`/courses/${courseId}/quizzes/${quizId}/start`, {
    token: learner.token,
    method: "POST",
  });

  const allRight = await call(`/courses/${courseId}/quizzes/${quizId}/submit`, {
    token: learner.token,
    method: "POST",
    body: {
      sessionId: retry.data?.session?.id,
      answers: questionIds.map((id, index) => ({
        questionId: id,
        selectedIndex: correctIndexes[index],
      })),
    },
  });
  check("skor sempurna lulus", allRight.data?.result?.score === 100 &&
    allRight.data?.result?.passed === true, `${allRight.data?.result?.score}`);

  const quizWithResults = await call(`/courses/${courseId}/quizzes/${quizId}`, {
    token: admin.token, method: "DELETE",
  });
  check("kuis yang sudah dikerjakan tidak dapat dihapus", quizWithResults.status === 409,
    `${quizWithResults.status}`);

  // ── Progress ───────────────────────────────────────────────────────────
  section("Progress (§10.1-10.2)");

  const anonProgress = await call("/progress");
  check("anon ditolak", anonProgress.status === 401, anonProgress.body?.code);

  const adminProgress = await call("/progress", { token: admin.token });
  check("admin ditolak (tidak punya progres)", adminProgress.status === 403,
    adminProgress.body?.code);

  const markDone = await call(`/progress/lessons/${lessonIds[0]}`, {
    token: learner.token, method: "PUT", body: { status: "completed" },
  });
  check("menandai selesai berhasil", markDone.status === 200, `${markDone.status}`);
  check("courseProgress ikut dikembalikan",
    markDone.data?.courseProgress?.completedLessons === 1,
    `${markDone.data?.courseProgress?.completedLessons}`);

  const firstCompletedAt = markDone.data?.progress?.completedAt;
  const markAgain = await call(`/progress/lessons/${lessonIds[0]}`, {
    token: learner.token, method: "PUT", body: { status: "completed" },
  });
  check("idempoten: completedAt tidak bergeser",
    markAgain.data?.progress?.completedAt === firstCompletedAt);

  const goBackwards = await call(`/progress/lessons/${lessonIds[0]}`, {
    token: learner.token, method: "PUT", body: { status: "in_progress" },
  });
  check("status tidak mundur dari completed",
    goBackwards.data?.progress?.status === "completed",
    goBackwards.data?.progress?.status);

  const badStatus = await call(`/progress/lessons/${lessonIds[0]}`, {
    token: learner.token, method: "PUT", body: { status: "not_started" },
  });
  check("status not_started ditolak", badStatus.status === 422, `${badStatus.status}`);

  const progress = await call("/progress", { token: learner.token });
  check("ringkasan progres berhasil", progress.status === 200, `${progress.status}`);
  check("summary lengkap",
    ["coursesStarted", "coursesCompleted", "lessonsCompleted", "totalLessons",
     "quizzesPassed", "overallPercent", "streakDays"].every((k) => k in (progress.data?.summary ?? {})));
  check("badge diturunkan dari progres", Array.isArray(progress.data?.badges));
  check("badge pelajaran pertama diraih",
    progress.data?.badges?.find((b) => b.code === "FIRST_LESSON")?.earned === true);
  check("badge kuis pertama diraih",
    progress.data?.badges?.find((b) => b.code === "FIRST_QUIZ")?.earned === true);
  check("streak minimal 1 hari", progress.data?.summary?.streakDays >= 1,
    `${progress.data?.summary?.streakDays}`);

  // ── Buka-kunci pelajaran (tracker #12) ─────────────────────────────────
  section("Buka-kunci pelajaran (tracker #12)");

  const locked = await call(`/courses/${courseId}/lessons`, {
    token: admin.token,
    method: "POST",
    body: { title: "Pelajaran Terkunci", isLocked: true },
  });
  const lockedId = locked.data?.lesson?.id;

  const blocked = await call(`/lessons/${lockedId}`, { token: learner.token });
  check("materi tetap gratis walau flag isLocked aktif", blocked.status === 200,
    `${blocked.status}`);
  check("flag kunci tetap tersedia sebagai metadata", blocked.data?.lesson?.isLocked === true);

  const adminSeesLocked = await call(`/lessons/${lockedId}`, { token: admin.token });
  check("admin tetap dapat membuka pelajaran terkunci", adminSeesLocked.status === 200,
    `${adminSeesLocked.status}`);

  const bypass = await call(`/progress/lessons/${lockedId}`, {
    token: learner.token, method: "PUT", body: { status: "completed" },
  });
  check("progres materi gratis tetap dapat disimpan", bypass.status === 200,
    `${bypass.status}`);

  // Menyelesaikan pelajaran sebelumnya membuka yang terkunci.
  for (const id of lessonIds.slice(1)) {
    await call(`/progress/lessons/${id}`, {
      token: learner.token, method: "PUT", body: { status: "completed" },
    });
  }
  const nowOpen = await call(`/lessons/${lockedId}`, { token: learner.token });
  check("kunci TERBUKA setelah pelajaran sebelumnya selesai", nowOpen.status === 200,
    `${nowOpen.status}`);

  const access = await call(`/progress/courses/${courseId}`, { token: learner.token });
  check("status akses per pelajaran tersedia", Array.isArray(access.data?.items));
  check("setiap pelajaran menyertakan isAccessible",
    access.data?.items?.every((i) => typeof i.isAccessible === "boolean"));

  // ── Penjaga penghapusan ────────────────────────────────────────────────
  section("Penjaga penghapusan (§8.5)");

  const deleteStudied = await call(`/lessons/${lessonIds[0]}`, {
    token: admin.token, method: "DELETE",
  });
  check("pelajaran yang sudah diselesaikan tidak dapat dihapus",
    deleteStudied.status === 409, `${deleteStudied.status}`);

  const deleteCourse = await call(`/courses/${courseId}`, {
    token: admin.token, method: "DELETE",
  });
  check("kursus yang sudah dipelajari tidak dapat dihapus", deleteCourse.status === 409,
    `${deleteCourse.status}`);

  const emptyCourse = await call("/courses", {
    token: admin.token,
    method: "POST",
    body: { title: `Kursus Kosong ${stamp}`, level: "Pemula" },
  });
  const removed = await call(`/courses/${emptyCourse.data.course.id}`, {
    token: admin.token, method: "DELETE",
  });
  check("kursus tanpa riwayat belajar dapat dihapus", removed.status === 200,
    `${removed.status}`);

  process.exitCode = summary("konten & progres") ? 0 : 1;
}

main().catch((err) => {
  console.error(`\n  ${c.no("Test berhenti:")} ${err.message}\n`);
  process.exitCode = 1;
}).finally(() => closeHarnessDatabase());
