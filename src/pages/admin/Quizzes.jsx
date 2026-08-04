import { useState } from "react";
import { Card, Button, Badge, Modal, Alert } from "../../components/ui/ui";
import { COURSES, QUIZ_QUESTIONS } from "../../data/mock";
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  GridIcon,
} from "../../components/ui/Icons";

const EMPTY_QUESTION = {
  question: "",
  options: ["", "", "", ""],
  correctIndex: 0,
};

export default function AdminQuizzes() {
  const [selectedCourse, setSelectedCourse] = useState(COURSES[0].id);
  const [quizzes, setQuizzes] = useState([
    {
      id: "q1",
      courseId: COURSES[0].id,
      title: "Kuis Huruf Dasar",
      lesson: COURSES[0].lessons[0]?.title || "Pelajaran 1",
      totalQuestions: QUIZ_QUESTIONS.length,
      passingScore: 70,
      published: true,
    },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editQuiz, setEditQuiz] = useState(null);
  const [alert, setAlert] = useState(null);
  const [form, setForm] = useState({
    title: "",
    lesson: "",
    passingScore: 70,
    published: true,
  });

  const course = COURSES.find((c) => c.id === selectedCourse) || COURSES[0];
  const courseQuizzes = quizzes.filter((q) => q.courseId === selectedCourse);

  function showAlert(type, msg) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 3000);
  }

  function openAdd() {
    setEditQuiz(null);
    setForm({
      title: "",
      lesson: course.lessons[0]?.title || "",
      passingScore: 70,
      published: true,
    });
    setShowModal(true);
  }

  function openEdit(quiz) {
    setEditQuiz(quiz);
    setForm({
      title: quiz.title,
      lesson: quiz.lesson,
      passingScore: quiz.passingScore,
      published: quiz.published,
    });
    setShowModal(true);
  }

  function handleSave() {
    if (editQuiz) {
      setQuizzes((prev) =>
        prev.map((q) => (q.id === editQuiz.id ? { ...q, ...form } : q)),
      );
      showAlert("success", "Kuis berhasil diperbarui.");
    } else {
      const newQuiz = {
        id: `q${Date.now()}`,
        courseId: selectedCourse,
        totalQuestions: 0,
        ...form,
        published: form.published,
      };
      setQuizzes((prev) => [...prev, newQuiz]);
      showAlert("success", "Kuis baru berhasil ditambahkan.");
    }
    setShowModal(false);
    setEditQuiz(null);
  }

  function handleDelete(id) {
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
    setDeleteId(null);
    showAlert("success", "Kuis berhasil dihapus.");
  }

  function handleTogglePublish(id) {
    setQuizzes((prev) =>
      prev.map((q) => (q.id === id ? { ...q, published: !q.published } : q)),
    );
    showAlert("success", "Status kuis berhasil diperbarui.");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text)]">
            Manajemen Kuis
          </h1>
          <p className="text-[var(--text-muted)] mt-0.5">
            Kelola kuis untuk setiap kursus
          </p>
        </div>
        <Button onClick={openAdd}>
          <PlusIcon size={16} /> Tambah Kuis
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
          onChange={(e) => setSelectedCourse(e.target.value)}
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
          {
            label: "Total Kuis",
            value: courseQuizzes.length,
            color: "#4F8EF7",
          },
          {
            label: "Dipublikasikan",
            value: courseQuizzes.filter((q) => q.published).length,
            color: "#2ECC71",
          },
          {
            label: "Draft",
            value: courseQuizzes.filter((q) => !q.published).length,
            color: "#F4B400",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-[var(--surface)] rounded-2xl p-4 border border-[var(--border)] text-center"
          >
            <p className="text-2xl font-extrabold" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {courseQuizzes.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <GridIcon size={32} className="mx-auto mb-3 text-[#CBD5E1]" />
            <p className="text-[var(--text-muted)]">Belum ada kuis untuk kursus ini</p>
            <Button variant="secondary" className="mt-4" onClick={openAdd}>
              <PlusIcon size={14} /> Buat Kuis Pertama
            </Button>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-[#F1F5F9]">
            {courseQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="flex items-center gap-4 p-4 hover:bg-[var(--surface-2)] transition-colors"
              >
                <div className="w-10 h-10 bg-[var(--primary-light)] rounded-xl flex items-center justify-center text-[var(--primary)] flex-shrink-0">
                  <GridIcon size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-[var(--text)] text-sm truncate">
                      {quiz.title}
                    </p>
                    <Badge variant={quiz.published ? "success" : "warning"}>
                      {quiz.published ? "Dipublikasikan" : "Draft"}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--text-subtle)]">
                    {quiz.lesson} · {quiz.totalQuestions} soal · KKM{" "}
                    {quiz.passingScore}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTogglePublish(quiz.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--success-light)] hover:text-[#2ECC71] transition-colors"
                    title="Publish/Draft"
                  >
                    {quiz.published ? "👁" : "🚫"}
                  </button>
                  <button
                    onClick={() => openEdit(quiz)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-colors"
                    title="Edit"
                  >
                    <EditIcon size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteId(quiz.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--danger-light)] hover:text-[#E74C3C] transition-colors"
                    title="Hapus"
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add/Edit modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editQuiz ? "Edit Kuis" : "Tambah Kuis Baru"}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
              Judul Kuis
            </label>
            <input
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Judul kuis"
              className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7]"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
              Terkait Pelajaran
            </label>
            <select
              value={form.lesson}
              onChange={(e) =>
                setForm((p) => ({ ...p, lesson: e.target.value }))
              }
              className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7]"
            >
              {course.lessons.map((l) => (
                <option key={l.id} value={l.title}>
                  {l.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
              Nilai Kelulusan (KKM)
            </label>
            <input
              type="number"
              value={form.passingScore}
              onChange={(e) =>
                setForm((p) => ({ ...p, passingScore: +e.target.value }))
              }
              className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7]"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) =>
                setForm((p) => ({ ...p, published: e.target.checked }))
              }
              className="w-4 h-4 accent-[#4F8EF7]"
            />
            <span className="text-sm text-[var(--text)]">
              Publikasikan kuis ini
            </span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowModal(false)}
            >
              Batal
            </Button>
            <Button fullWidth onClick={handleSave}>
              {editQuiz ? "Simpan Perubahan" : "Tambah Kuis"}
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
          <h3 className="font-bold text-[var(--text)] mb-2">Hapus Kuis?</h3>
          <p className="text-sm text-[var(--text-muted)] mb-5">
            Semua soal dan hasil yang terkait akan ikut terhapus.
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
