import { useCallback, useState } from "react";
import { Card, Button, Badge, Modal, Alert, Input } from "../../components/ui/ui";
import { PlusIcon, EditIcon, TrashIcon, GridIcon } from "../../components/ui/Icons";
import { courseService, lessonService, quizService } from "../../services";
import {
  useAdminResource,
  useFlash,
  runMutation,
  fieldErrors,
} from "../../hooks/useAdminResource";
import QuestionEditor from "../../components/admin/QuestionEditor";

/**
 * Manajemen kuis — API Contract §8.10-8.13.
 *
 * ── Yang berubah dari versi mock ──────────────────────────────────────
 *
 * · Toggle "Publikasikan" DIHAPUS. Tabel `quizzes` tidak punya kolom untuk itu,
 *   jadi tombolnya hanya mengubah state di memori dan hilang saat halaman
 *   dimuat ulang — sambil memberi kesan kuis draft tersembunyi dari pengguna,
 *   padahal tidak. Yang benar-benar menghalangi pengerjaan adalah kuis tanpa
 *   soal: server menolaknya 409.
 *
 * · "Terkait Pelajaran" dulu menyimpan JUDUL pelajaran sebagai teks. Skema
 *   memakai `lesson_id` (FK). Sekarang pemilihnya mengirim id, dan server
 *   memverifikasi pelajaran itu memang milik kursus yang sama.
 *
 * · `totalQuestions` tidak pernah dikirim — server menghitungnya dari baris
 *   `quiz_questions` dan validator menolaknya terang-terangan.
 *
 * · BARU: penyunting soal. Sebelumnya tidak ada satu pun cara menulis soal
 *   lewat panel admin.
 */

const EMPTY_FORM = {
  title: "",
  lessonId: "",
  minPassingScore: 70,
  durationSeconds: 300,
};

/** Detik → "5 mnt 30 dtk", untuk dibaca sekilas di daftar. */
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} dtk`;
  return s === 0 ? `${m} mnt` : `${m} mnt ${s} dtk`;
}

export default function AdminQuizzes() {
  const { flash, show, clear } = useFlash();

  const [selectedCourse, setSelectedCourse] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editQuiz, setEditQuiz] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [managingQuiz, setManagingQuiz] = useState(null);

  // ─── Kursus ────────────────────────────────────────────────────────────
  const loadCourses = useCallback(
    () => courseService.getCourses({ limit: 100, sortBy: "sortOrder", sortDir: "asc" }),
    [],
  );
  const { data: courseData, loading: coursesLoading } = useAdminResource(loadCourses, []);
  const courses = courseData?.items ?? [];

  const activeCourseId = selectedCourse || courses[0]?.id || "";

  // ─── Kuis + pelajaran kursus terpilih ──────────────────────────────────
  //
  // Pelajaran ikut dimuat karena pemilih "Terkait Pelajaran" membutuhkannya,
  // dan server menolak lessonId yang berasal dari kursus lain.
  const loadQuizzes = useCallback(async () => {
    const [quizzes, lessons] = await Promise.all([
      quizService.getQuizzes(activeCourseId, { limit: 100 }),
      lessonService.getLessons(activeCourseId, { limit: 100 }).catch(() => ({ items: [] })),
    ]);
    return { quizzes, lessons };
  }, [activeCourseId]);

  const { data, loading, error, reload } = useAdminResource(
    loadQuizzes,
    [activeCourseId],
    { enabled: Boolean(activeCourseId) },
  );

  const quizzes = data?.quizzes?.items ?? [];
  const lessons = data?.lessons?.items ?? [];

  const lessonTitle = (lessonId) => lessons.find((l) => l.id === lessonId)?.title ?? null;

  function openAdd() {
    setEditQuiz(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(quiz) {
    setEditQuiz(quiz);
    setForm({
      title: quiz.title ?? "",
      lessonId: quiz.lessonId ?? "",
      minPassingScore: quiz.minPassingScore ?? 70,
      durationSeconds: quiz.durationSeconds ?? 300,
    });
    setFormErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditQuiz(null);
    setFormErrors({});
  }

  async function handleSave() {
    if (!activeCourseId) return;
    setSaving(true);
    setFormErrors({});

    const payload = {
      title: form.title.trim(),
      // "" berarti "tidak terikat pelajaran". Validator menerima null eksplisit
      // tetapi menolak string kosong sebagai id.
      lessonId: form.lessonId || null,
      minPassingScore: Number(form.minPassingScore),
      durationSeconds: Number(form.durationSeconds),
    };

    const outcome = await runMutation(() =>
      editQuiz
        ? quizService.updateQuiz(activeCourseId, editQuiz.id, payload)
        : quizService.createQuiz(activeCourseId, payload),
    );

    setSaving(false);

    if (!outcome.ok) {
      setFormErrors(fieldErrors(outcome.errors));
      show("danger", outcome.message);
      return;
    }

    closeModal();
    await reload();

    // Kuis baru langsung dibuka penyuntingnya: kuis tanpa soal tidak dapat
    // dikerjakan siapa pun, jadi langkah berikutnya selalu "isi soal".
    if (!editQuiz && outcome.result) {
      setManagingQuiz(outcome.result);
      show("success", "Kuis dibuat. Sekarang tambahkan soalnya.");
    } else {
      show("success", "Kuis berhasil diperbarui.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    const outcome = await runMutation(() =>
      quizService.deleteQuiz(activeCourseId, deleteTarget.id),
    );
    setDeleteTarget(null);

    if (!outcome.ok) {
      // 409 = sudah ada yang mengerjakan. Pesannya sudah menjelaskan alasannya.
      show("danger", outcome.message);
      return;
    }
    await reload();
    show("success", "Kuis berhasil dihapus.");
  }

  const withoutQuestions = quizzes.filter((q) => q.totalQuestions === 0).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text)]">Manajemen Kuis</h1>
          <p className="text-[var(--text-muted)] mt-0.5">
            {loading ? "Memuat…" : `${quizzes.length} kuis pada kursus ini`}
          </p>
        </div>
        <Button onClick={openAdd} disabled={!activeCourseId}>
          <PlusIcon size={16} /> Tambah Kuis
        </Button>
      </div>

      {flash && <Alert type={flash.type} message={flash.message} onClose={clear} />}
      {error && <Alert type="danger" message={error.message} onClose={() => reload()} />}

      <Card padding="sm">
        <label
          htmlFor="quiz-course-picker"
          className="text-sm font-medium text-[var(--text)] mb-2 block"
        >
          Pilih Kursus
        </label>
        <select
          id="quiz-course-picker"
          value={activeCourseId}
          disabled={coursesLoading || courses.length === 0}
          onChange={(e) => {
            setSelectedCourse(e.target.value);
            setManagingQuiz(null);
          }}
          className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7] disabled:bg-[var(--surface-2)]"
        >
          {coursesLoading && <option>Memuat kursus…</option>}
          {!coursesLoading && courses.length === 0 && <option>Belum ada kursus</option>}
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Kuis", value: quizzes.length, color: "var(--chart-blue)" },
          {
            label: "Siap Dikerjakan",
            value: quizzes.length - withoutQuestions,
            color: "var(--chart-green)",
          },
          { label: "Belum Ada Soal", value: withoutQuestions, color: "var(--chart-yellow)" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-[var(--surface)] rounded-2xl p-4 border border-[var(--border)] admin-kids-card text-center"
          >
            <p className="text-2xl font-extrabold" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <Card>
          <div className="text-center py-12 text-[var(--text-subtle)]">Memuat kuis…</div>
        </Card>
      ) : quizzes.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <GridIcon size={32} className="mx-auto mb-3 text-[#CBD5E1]" />
            <p className="text-[var(--text-muted)]">
              {activeCourseId
                ? "Belum ada kuis untuk kursus ini"
                : "Belum ada kursus. Buat kursus lebih dulu."}
            </p>
            {activeCourseId && (
              <Button variant="secondary" className="mt-4" onClick={openAdd}>
                <PlusIcon size={14} /> Buat Kuis Pertama
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-[var(--border-light)]">
            {quizzes.map((quiz) => {
              const isManaging = managingQuiz?.id === quiz.id;
              const empty = quiz.totalQuestions === 0;

              return (
                <div key={quiz.id}>
                  <div className="flex items-center gap-4 p-4 hover:bg-[var(--surface-2)] transition-colors">
                    <div className="w-10 h-10 bg-[var(--primary-light)] rounded-xl flex items-center justify-center text-[var(--primary)] flex-shrink-0">
                      <GridIcon size={17} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="font-semibold text-[var(--text)] text-sm truncate">
                          {quiz.title}
                        </p>
                        {empty ? (
                          <Badge variant="warning">Belum ada soal</Badge>
                        ) : (
                          <Badge variant="success">{quiz.totalQuestions} soal</Badge>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-subtle)]">
                        {lessonTitle(quiz.lessonId) ?? "Tidak terikat pelajaran"} · KKM{" "}
                        {quiz.minPassingScore} · {formatDuration(quiz.durationSeconds)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={isManaging ? "primary" : "secondary"}
                        onClick={() => setManagingQuiz(isManaging ? null : quiz)}
                      >
                        {isManaging ? "Tutup Soal" : "Kelola Soal"}
                      </Button>
                      <button
                        onClick={() => openEdit(quiz)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-colors"
                        title="Edit kuis"
                      >
                        <EditIcon size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(quiz)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--danger-light)] hover:text-[#E74C3C] transition-colors"
                        title="Hapus kuis"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </div>

                  {isManaging && (
                    <div className="bg-[var(--surface-2)] border-t border-[var(--border)] p-4">
                      <QuestionEditor
                        courseId={activeCourseId}
                        quizId={quiz.id}
                        quizTitle={quiz.title}
                        // Jumlah soal tampil di baris kuis di atas, jadi daftar
                        // kuis harus ikut segar setiap soal ditambah/dihapus.
                        onChanged={reload}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Add/Edit modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editQuiz ? "Edit Kuis" : "Tambah Kuis Baru"}
      >
        <div className="space-y-4">
          <Input
            label="Judul Kuis"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Kuis Huruf Dasar"
            error={formErrors.title}
          />

          <div>
            <label
              htmlFor="quiz-lesson"
              className="text-sm font-medium text-[var(--text)] mb-1.5 block"
            >
              Terkait Pelajaran
            </label>
            <select
              id="quiz-lesson"
              value={form.lessonId}
              onChange={(e) => setForm((p) => ({ ...p, lessonId: e.target.value }))}
              className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7]"
            >
              <option value="">— Tidak terikat pelajaran —</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
            {formErrors.lessonId && (
              <p className="text-xs text-[#E74C3C] mt-1">{formErrors.lessonId}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Nilai Kelulusan (KKM)"
                type="number"
                min="0"
                max="100"
                value={form.minPassingScore}
                onChange={(e) => setForm((p) => ({ ...p, minPassingScore: e.target.value }))}
                error={formErrors.minPassingScore}
              />
              <p className="text-xs text-[var(--text-subtle)] mt-1">0–100</p>
            </div>
            <div>
              <Input
                label="Durasi (detik)"
                type="number"
                min="30"
                max="7200"
                step="30"
                value={form.durationSeconds}
                onChange={(e) => setForm((p) => ({ ...p, durationSeconds: e.target.value }))}
                error={formErrors.durationSeconds}
              />
              <p className="text-xs text-[var(--text-subtle)] mt-1">
                30–7200 ({formatDuration(Number(form.durationSeconds) || 0)})
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth onClick={closeModal} disabled={saving}>
              Batal
            </Button>
            <Button fullWidth onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan…" : editQuiz ? "Simpan Perubahan" : "Tambah Kuis"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="sm">
        <div className="text-center">
          <div className="w-14 h-14 bg-[var(--danger-light)] rounded-full flex items-center justify-center mx-auto mb-4">
            <TrashIcon size={24} className="text-[#E74C3C]" />
          </div>
          <h3 className="font-bold text-[var(--text)] mb-2">Hapus Kuis?</h3>
          <p className="text-sm text-[var(--text-muted)] mb-5">
            <strong>{deleteTarget?.title}</strong> beserta seluruh soalnya akan dihapus.
            Kuis yang sudah pernah dikerjakan tidak dapat dihapus — server menolaknya agar
            nilai pengguna tidak ikut hilang.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button variant="danger" fullWidth onClick={handleDelete}>
              Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
