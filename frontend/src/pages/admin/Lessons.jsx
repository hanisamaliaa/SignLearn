import { useCallback, useState } from "react";
import { Card, Button, Badge, Modal, Alert, Input } from "../../components/ui/ui";
import { PlusIcon, EditIcon, TrashIcon, VideoIcon } from "../../components/ui/Icons";
import { courseService, lessonService } from "../../services";
import {
  useAdminResource,
  useFlash,
  runMutation,
  fieldErrors,
} from "../../hooks/useAdminResource";

/**
 * Manajemen pelajaran — API Contract §8.6-8.9.
 *
 * ── Kenapa kolom "Status" versi mock DIHAPUS ──────────────────────────
 *
 * Versi lama menandai tiap pelajaran `completed` / `current` / `locked` dan
 * menghitung kartu ringkasan darinya. Tiga label itu BUKAN properti pelajaran;
 * ia berasal dari `lesson_progress` yang berbeda untuk SETIAP pengguna.
 * Menampilkannya di panel admin berarti mengklaim satu jawaban untuk
 * pertanyaan yang punya sebanyak-jumlah-pengguna jawaban.
 *
 * Yang benar-benar milik pelajaran adalah `isLocked` — dan itulah yang
 * ditampilkan sekarang.
 *
 * ── Urutan ────────────────────────────────────────────────────────────
 *
 * `PATCH /courses/:id/lessons/reorder` menuntut daftar id LENGKAP milik kursus
 * itu; kurang satu pun ditolak 422. Jadi tombol naik/turun mengirim ulang
 * seluruh urutan, bukan hanya dua id yang bertukar.
 */

const EMPTY_FORM = {
  title: "",
  description: "",
  duration: "",
  videoUrl: "",
  isLocked: false,
};

export default function AdminLessons() {
  const { flash, show, clear } = useFlash();

  const [selectedCourse, setSelectedCourse] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editLesson, setEditLesson] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reordering, setReordering] = useState(false);

  // ─── Daftar kursus (dimuat sekali) ─────────────────────────────────────
  const loadCourses = useCallback(
    () => courseService.getCourses({ limit: 100, sortBy: "sortOrder", sortDir: "asc" }),
    [],
  );
  const { data: courseData, loading: coursesLoading } = useAdminResource(loadCourses, []);
  const courses = courseData?.items ?? [];

  // Kursus pertama dipilih otomatis begitu daftarnya tiba. Dilakukan saat
  // render, bukan di useEffect terpisah, supaya tidak ada satu frame pun yang
  // menampilkan "belum ada kursus dipilih" padahal kursusnya sudah ada.
  const activeCourseId = selectedCourse || courses[0]?.id || "";
  const activeCourse = courses.find((c) => c.id === activeCourseId) ?? null;

  // ─── Pelajaran kursus terpilih ─────────────────────────────────────────
  const loadLessons = useCallback(
    () => lessonService.getLessons(activeCourseId, { limit: 100 }),
    [activeCourseId],
  );
  const {
    data: lessonData,
    loading: lessonsLoading,
    error,
    reload,
  } = useAdminResource(loadLessons, [activeCourseId], { enabled: Boolean(activeCourseId) });

  const lessons = lessonData?.items ?? [];

  function openAdd() {
    setEditLesson(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(lesson) {
    setEditLesson(lesson);
    setForm({
      title: lesson.title ?? "",
      description: lesson.description ?? "",
      duration: lesson.duration ?? "",
      videoUrl: lesson.videoUrl ?? "",
      isLocked: lesson.isLocked ?? false,
    });
    setFormErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditLesson(null);
    setFormErrors({});
  }

  async function handleSave() {
    if (!activeCourseId) return;
    setSaving(true);
    setFormErrors({});

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      duration: form.duration.trim() || null,
      // `""` gagal `new URL("")` dan ditolak 422; `null` berarti "tanpa video".
      videoUrl: form.videoUrl.trim() || null,
      isLocked: Boolean(form.isLocked),
    };

    // Pelajaran baru diletakkan di akhir. Server memberi default 0 bila
    // `sortOrder` tidak dikirim, sehingga seluruh pelajaran baru menumpuk di
    // urutan nol dan tampil dalam urutan id — bukan urutan yang dimaksud admin.
    if (!editLesson) {
      payload.sortOrder = (lessons.at(-1)?.sortOrder ?? 0) + 1;
    }

    const outcome = await runMutation(() =>
      editLesson
        ? lessonService.updateLesson(activeCourseId, editLesson.id, payload)
        : lessonService.createLesson(activeCourseId, payload),
    );

    setSaving(false);

    if (!outcome.ok) {
      setFormErrors(fieldErrors(outcome.errors));
      show("danger", outcome.message);
      return;
    }

    closeModal();
    await reload();
    show(
      "success",
      editLesson ? "Pelajaran berhasil diperbarui." : "Pelajaran baru berhasil ditambahkan.",
    );
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    const outcome = await runMutation(() =>
      lessonService.deleteLesson(activeCourseId, deleteTarget.id),
    );
    setDeleteTarget(null);

    if (!outcome.ok) {
      show("danger", outcome.message);
      return;
    }
    await reload();
    show("success", "Pelajaran berhasil dihapus.");
  }

  /** Menukar dua pelajaran bersebelahan, lalu mengirim SELURUH urutan baru. */
  async function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= lessons.length) return;

    const next = [...lessons];
    [next[index], next[target]] = [next[target], next[index]];

    setReordering(true);
    const outcome = await runMutation(() =>
      lessonService.reorderLessons(
        activeCourseId,
        next.map((l) => l.id),
      ),
    );
    setReordering(false);

    if (!outcome.ok) {
      show("danger", outcome.message);
      return;
    }
    await reload();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text)]">Manajemen Pelajaran</h1>
          <p className="text-[var(--text-muted)] mt-0.5">
            {activeCourse ? activeCourse.title : "Pilih kursus terlebih dahulu"}
          </p>
        </div>
        <Button onClick={openAdd} disabled={!activeCourseId}>
          <PlusIcon size={16} /> Tambah Pelajaran
        </Button>
      </div>

      {flash && <Alert type={flash.type} message={flash.message} onClose={clear} />}
      {error && <Alert type="danger" message={error.message} onClose={() => reload()} />}

      <Card padding="sm">
        <label
          htmlFor="lesson-course-picker"
          className="text-sm font-medium text-[var(--text)] mb-2 block"
        >
          Pilih Kursus
        </label>
        <select
          id="lesson-course-picker"
          value={activeCourseId}
          disabled={coursesLoading || courses.length === 0}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7] disabled:bg-[var(--surface-2)]"
        >
          {coursesLoading && <option>Memuat kursus…</option>}
          {!coursesLoading && courses.length === 0 && <option>Belum ada kursus</option>}
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} ({c.totalLessons} pelajaran)
            </option>
          ))}
        </select>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Pelajaran", value: lessons.length, color: "#4F8EF7" },
          {
            label: "Terbuka",
            value: lessons.filter((l) => !l.isLocked).length,
            color: "#2ECC71",
          },
          {
            label: "Terkunci",
            value: lessons.filter((l) => l.isLocked).length,
            color: "#E74C3C",
          },
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

      <Card padding="none">
        <div className="divide-y divide-[var(--border-light)]">
          {lessons.map((lesson, idx) => (
            <div
              key={lesson.id}
              className="flex items-center gap-4 p-4 hover:bg-[var(--surface-2)] transition-colors"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 bg-[var(--primary-light)] text-[var(--primary)]">
                {idx + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <p className="font-semibold text-[var(--text)] text-sm truncate">
                    {lesson.title}
                  </p>
                  {lesson.isLocked && <Badge variant="muted">🔒 Terkunci</Badge>}
                  {lesson.videoUrl && <Badge variant="primary">🎬 Video</Badge>}
                </div>
                <p className="text-xs text-[var(--text-subtle)]">
                  {lesson.duration ? `⏱ ${lesson.duration} · ` : ""}
                  Urutan {lesson.sortOrder}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0 || reordering}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-3)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Naikkan urutan"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(idx, 1)}
                  disabled={idx === lessons.length - 1 || reordering}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-3)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Turunkan urutan"
                >
                  ↓
                </button>
                <button
                  onClick={() => openEdit(lesson)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-colors"
                  title="Edit"
                >
                  <EditIcon size={14} />
                </button>
                <button
                  onClick={() => setDeleteTarget(lesson)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--danger-light)] hover:text-[#E74C3C] transition-colors"
                  title="Hapus"
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            </div>
          ))}

          {lessonsLoading && (
            <div className="text-center py-12 text-[var(--text-subtle)]">Memuat pelajaran…</div>
          )}
          {!lessonsLoading && lessons.length === 0 && (
            <div className="text-center py-12 text-[var(--text-subtle)]">
              <VideoIcon size={32} className="mx-auto mb-3 text-[#CBD5E1]" />
              <p>
                {activeCourseId
                  ? "Belum ada pelajaran untuk kursus ini"
                  : "Belum ada kursus. Buat kursus lebih dulu."}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Add/Edit modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editLesson ? "Edit Pelajaran" : "Tambah Pelajaran Baru"}
      >
        <div className="space-y-4">
          <Input
            label="Judul Pelajaran"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Huruf A–E"
            error={formErrors.title}
          />

          <Input
            label="Durasi"
            value={form.duration}
            onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
            placeholder="15 mnt"
            maxLength={30}
            error={formErrors.duration}
          />

          <div>
            <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
              Deskripsi
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Deskripsi pelajaran…"
              className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7] resize-none"
            />
            {formErrors.description && (
              <p className="text-xs text-[#E74C3C] mt-1">{formErrors.description}</p>
            )}
          </div>

          <div>
            <Input
              label="URL Video"
              value={form.videoUrl}
              onChange={(e) => setForm((p) => ({ ...p, videoUrl: e.target.value }))}
              placeholder="https://youtu.be/…"
              error={formErrors.videoUrl}
            />
            <p className="text-xs text-[var(--text-subtle)] mt-1">
              Harus diawali http:// atau https://. Kosongkan bila belum ada.
            </p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isLocked}
              onChange={(e) => setForm((p) => ({ ...p, isLocked: e.target.checked }))}
              className="w-4 h-4 accent-[#4F8EF7]"
            />
            <span className="text-sm text-[var(--text)]">
              Pelajaran terkunci (tidak dapat dibuka pengguna)
            </span>
          </label>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth onClick={closeModal} disabled={saving}>
              Batal
            </Button>
            <Button fullWidth onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan…" : editLesson ? "Simpan Perubahan" : "Tambah Pelajaran"}
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
          <h3 className="font-bold text-[var(--text)] mb-2">Hapus Pelajaran?</h3>
          <p className="text-sm text-[var(--text-muted)] mb-5">
            <strong>{deleteTarget?.title}</strong> akan dihapus permanen, beserta seluruh
            riwayat belajar pengguna pada pelajaran ini.
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
