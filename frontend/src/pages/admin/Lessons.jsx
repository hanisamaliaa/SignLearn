import { useState } from "react";
import { Card, Button, Badge, Modal, Alert } from "../../components/ui/ui";
import { COURSES } from "../../data/mock";
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  VideoIcon,
} from "../../components/ui/Icons";

const EMPTY_FORM = {
  title: "",
  duration: "15 mnt",
  order: 1,
  description: "",
};

export default function AdminLessons() {
  const [selectedCourse, setSelectedCourse] = useState(COURSES[0].id);
  const [lessons, setLessons] = useState(COURSES[0].lessons);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editLesson, setEditLesson] = useState(null);
  const [alert, setAlert] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const course = COURSES.find((c) => c.id === selectedCourse) || COURSES[0];

  function showAlert(type, msg) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 3000);
  }

  function handleCourseChange(courseId) {
    setSelectedCourse(courseId);
    const c = COURSES.find((cc) => cc.id === courseId) || COURSES[0];
    setLessons(c.lessons);
  }

  function openEdit(lesson) {
    setEditLesson(lesson);
    setForm({
      title: lesson.title,
      duration: lesson.duration,
      order: lesson.order,
      description: lesson.description || "",
    });
    setShowModal(true);
  }

  function openAdd() {
    setEditLesson(null);
    setForm({ ...EMPTY_FORM, order: lessons.length + 1 });
    setShowModal(true);
  }

  function handleSave() {
    const status = editLesson ? "completed" : "current";
    if (editLesson) {
      setLessons((prev) =>
        prev.map((l) => (l.id === editLesson.id ? { ...l, ...form } : l)),
      );
      showAlert("success", "Pelajaran berhasil diperbarui.");
    } else {
      const newLesson = {
        id: `l${Date.now()}`,
        courseId: selectedCourse,
        status,
        videoUrl: "",
        vocabulary: [],
        gestureImages: [],
        ...form,
      };
      setLessons((prev) => [...prev, newLesson]);
      showAlert("success", "Pelajaran baru berhasil ditambahkan.");
    }
    setShowModal(false);
    setEditLesson(null);
  }

  function handleDelete(id) {
    setLessons((prev) => prev.filter((l) => l.id !== id));
    setDeleteId(null);
    showAlert("success", "Pelajaran berhasil dihapus.");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text)]">
            Manajemen Pelajaran
          </h1>
          <p className="text-[var(--text-muted)] mt-0.5">{course.title}</p>
        </div>
        <Button onClick={openAdd}>
          <PlusIcon size={16} /> Tambah Pelajaran
        </Button>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.msg}
          onClose={() => setAlert(null)}
        />
      )}

      <Card padding="sm">
        <label className="text-sm font-medium text-[var(--text)] mb-2 block">
          Pilih Kursus
        </label>
        <select
          value={selectedCourse}
          onChange={(e) => handleCourseChange(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7]"
        >
          {COURSES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Pelajaran", value: lessons.length, color: "#4F8EF7" },
          {
            label: "Selesai",
            value: lessons.filter((l) => l.status === "completed").length,
            color: "#2ECC71",
          },
          {
            label: "Terkunci",
            value: lessons.filter((l) => l.status === "locked").length,
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
        <div className="divide-y divide-[#F1F5F9]">
          {lessons.map((lesson, idx) => (
            <div
              key={lesson.id}
              className="flex items-center gap-4 p-4 hover:bg-[var(--surface-2)] transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  lesson.status === "completed"
                    ? "bg-[var(--success-light)] text-[#2ECC71]"
                    : lesson.status === "current"
                      ? "bg-[var(--primary-light)] text-[var(--primary)]"
                      : "bg-[var(--surface-3)] text-[var(--text-subtle)]"
                }`}
              >
                {lesson.status === "completed" ? "✓" : idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-[var(--text)] text-sm truncate">
                    {lesson.title}
                  </p>
                  {lesson.status === "completed" && (
                    <Badge variant="success">Selesai</Badge>
                  )}
                  {lesson.status === "current" && (
                    <Badge variant="primary">Aktif</Badge>
                  )}
                  {lesson.status === "locked" && (
                    <Badge variant="muted">Terkunci</Badge>
                  )}
                </div>
                <p className="text-xs text-[var(--text-subtle)]">
                  ⏱ {lesson.duration} · Pelajaran {lesson.order}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(lesson)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-colors"
                  title="Edit"
                >
                  <EditIcon size={14} />
                </button>
                <button
                  onClick={() => setDeleteId(lesson.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--danger-light)] hover:text-[#E74C3C] transition-colors"
                  title="Hapus"
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            </div>
          ))}
          {lessons.length === 0 && (
            <div className="text-center py-12 text-[var(--text-subtle)]">
              <VideoIcon size={32} className="mx-auto mb-3 text-[#CBD5E1]" />
              <p>Belum ada pelajaran untuk kursus ini</p>
            </div>
          )}
        </div>
      </Card>

      {/* Add/Edit modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editLesson ? "Edit Pelajaran" : "Tambah Pelajaran Baru"}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
              Judul Pelajaran
            </label>
            <input
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Judul pelajaran"
              className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
                Durasi
              </label>
              <input
                value={form.duration}
                onChange={(e) =>
                  setForm((p) => ({ ...p, duration: e.target.value }))
                }
                placeholder="15 mnt"
                className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
                Urutan
              </label>
              <input
                type="number"
                value={form.order}
                onChange={(e) =>
                  setForm((p) => ({ ...p, order: +e.target.value }))
                }
                className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7]"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
              Deskripsi
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              rows={3}
              placeholder="Deskripsi pelajaran..."
              className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7] resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
              Video
            </label>
            <div className="flex-1 border-2 border-dashed border-[var(--border)] rounded-xl p-4 text-center text-sm text-[var(--text-subtle)] hover:border-[#4F8EF7] cursor-pointer transition-colors">
              🎬 Klik untuk unggah video isyarat
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowModal(false)}
            >
              Batal
            </Button>
            <Button fullWidth onClick={handleSave}>
              {editLesson ? "Simpan Perubahan" : "Tambah Pelajaran"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} size="sm">
        <div className="text-center">
          <div className="w-14 h-14 bg-[var(--danger-light)] rounded-full flex items-center justify-center mx-auto mb-4">
            <TrashIcon size={24} className="text-[#E74C3C]" />
          </div>
          <h3 className="font-bold text-[var(--text)] mb-2">Hapus Pelajaran?</h3>
          <p className="text-sm text-[var(--text-muted)] mb-5">
            Pelajaran ini akan dihapus permanen dari kursus.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setDeleteId(null)}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={() => handleDelete(deleteId)}
            >
              Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
