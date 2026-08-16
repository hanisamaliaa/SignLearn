import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/app";

const SEEN_KEY = "signlearn.notifications.lastSeenAt";

/**
 * Notifikasi yang diturunkan dari kejadian belajar yang benar-benar terjadi.
 *
 * Sebelumnya isinya array yang ditulis langsung di header — "Anda lulus kuis
 * Huruf A-F dengan skor 90" muncul untuk setiap pengguna, termasuk yang belum
 * pernah mengerjakan satu kuis pun, lengkap dengan titik "belum dibaca" yang
 * tidak pernah bisa hilang.
 *
 * ── Kenapa diturunkan, bukan disimpan ────────────────────────────────
 *
 * Tabel notifikasi menuntut penulisan pada setiap kejadian, penghapusan
 * berkala, dan penanganan kegagalan tersendiri. Seluruh kejadian yang ingin
 * ditampilkan sudah tercatat di progres dan hasil kuis, jadi menurunkannya
 * saat dibaca memberi isi yang benar tanpa subsistem baru yang bisa melenceng
 * dari kenyataan.
 *
 * Batasnya jujur: tanpa tabel, "sudah dibaca" hanya dapat disimpan di
 * perangkat ini. Berganti browser akan menampilkan kembali penanda belum
 * dibaca. Itu ketidaknyamanan kecil, bukan data yang salah.
 */
export function useNotifications() {
  const { courses, dashboard } = useApp();

  const [lastSeenAt, setLastSeenAt] = useState(() => {
    try {
      return window.localStorage.getItem(SEEN_KEY) ?? "";
    } catch {
      // Mode privat sebagian browser melarang localStorage; notifikasi tetap
      // tampil, hanya penanda belum dibaca yang tidak diingat.
      return "";
    }
  });

  const items = useMemo(() => {
    const events = [];

    for (const quiz of dashboard?.recentQuizzes ?? []) {
      events.push({
        id: `quiz-${quiz.quizId}-${quiz.takenAt}`,
        at: quiz.takenAt,
        tone: quiz.passed ? "success" : "warning",
        title: quiz.passed ? "Kuis lulus" : "Kuis belum lulus",
        body: quiz.passed
          ? `Kamu lulus "${quiz.quizTitle}" dengan nilai ${quiz.score}.`
          : `Nilai "${quiz.quizTitle}" masih ${quiz.score}. Coba lagi untuk memperbaikinya.`,
        to: "/progress",
      });
    }

    for (const course of courses ?? []) {
      if (!course.lastAccessedAt) continue;
      if (course.learningStatus === "completed") {
        events.push({
          id: `course-done-${course.id}`,
          at: course.lastAccessedAt,
          tone: "success",
          title: "Kursus selesai",
          body: `Kamu menyelesaikan seluruh pelajaran "${course.title}".`,
          to: "/courses",
        });
      } else if (course.learningStatus === "in_progress") {
        events.push({
          id: `course-resume-${course.id}`,
          at: course.lastAccessedAt,
          tone: "info",
          title: "Lanjutkan belajar",
          body: `"${course.title}" masih dalam proses. Lanjutkan dari tempat terakhir.`,
          to: "/courses",
        });
      }
    }

    return events
      .filter((event) => !Number.isNaN(new Date(event.at).getTime()))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 8)
      .map((event) => ({ ...event, unread: !lastSeenAt || event.at > lastSeenAt }));
  }, [courses, dashboard, lastSeenAt]);

  const unreadCount = items.filter((item) => item.unread).length;

  /** Dipanggil saat panel dibuka; menandai seluruh yang tampil sudah dilihat. */
  const markAllSeen = useCallback(() => {
    const newest = items[0]?.at;
    if (!newest) return;
    setLastSeenAt(newest);
    try {
      window.localStorage.setItem(SEEN_KEY, newest);
    } catch {
      /* diabaikan: penanda gagal disimpan tidak boleh menutup panelnya */
    }
  }, [items]);

  // Keluar dari akun tidak boleh menyisakan penanda milik orang sebelumnya.
  useEffect(() => {
    if (courses === null) setLastSeenAt("");
  }, [courses]);

  return { items, unreadCount, markAllSeen };
}

/** Jarak waktu yang terbaca manusia, tanpa pustaka tambahan. */
export function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return "baru saja";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} hari lalu`;

  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
