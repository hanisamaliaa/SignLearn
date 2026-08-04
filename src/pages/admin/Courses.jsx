import { useState } from "react";
import { Card, Button, Badge, Modal, Alert } from "../../components/ui/ui";
import { COURSES } from "../../data/mock";
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
} from "../../components/ui/Icons";

const EMPTY_FORM = {
  title: "",
  category: "",
  level: "Pemula",
  description: "",
  estimatedHours: 2,
  isLocked: false,
};

const CATEGORIES = [
  "Alfabet",
  "Angka",
  "Sapaan",
  "Keluarga",
  "Warna",
  "Makanan",
  "Hewan",
  "Kegiatan",
];

export default function AdminCourses() {
  const [courses, setCourses] = useState(COURSES);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editCourse, setEditCourse] = useState(null);
  const [alert, setAlert] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const filtered = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase()),
  );

  function showAlert(type, msg) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 3000);
  }

  function openEdit(course) {
    setEditCourse(course);
    setForm({
      title: course.title,
      category: course.category,
      level: course.level,
      description: course.description,
      estimatedHours: course.estimatedHours,
      isLocked: course.isLocked,
    });
    setShowModal(true);
  }

  function openAdd() {
    setEditCourse(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function handleSave() {
    if (editCourse) {
      setCourses((prev) =>
        prev.map((c) => (c.id === editCourse.id ? { ...c, ...form } : c)),
      );
      showAlert("success", "Kursus berhasil diperbarui.");
    } else {
      const newCourse = {
        ...COURSES[0],
        id: `c${Date.now()}`,
        ...form,
        totalLessons: 0,
        completedLessons: 0,
        lessons: [],
        thumbnail: COURSES[0].thumbnail,
      };
      setCourses((prev) => [...prev, newCourse]);
      showAlert("success", "Kursus baru berhasil ditambahkan.");
    }
    setShowModal(false);
    setEditCourse(null);
  }

  function handleDelete(id) {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    setDeleteId(null);
    showAlert("success", "Kursus berhasil dihapus.");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text)]">
            Manajemen Kursus
          </h1>
          <p className="text-[var(--text-muted)] mt-0.5">
            {courses.length} kursus tersedia
          </p>
        </div>
        <Button onClick={openAdd}>
          <PlusIcon size={16} /> Tambah Kursus
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
        <div className="relative">
          <SearchIcon
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
          />
          <input
            type="text"
            placeholder="Cari kursus atau kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] text-sm outline-none focus:border-[#4F8EF7] focus:ring-2 focus:ring-[#4F8EF7]/20"
          />
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((course) => (
          <Card key={course.id} padding="none" className="overflow-hidden">
            <div className="relative">
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-40 object-cover"
              />
              <div className="absolute top-3 left-3 flex gap-1.5">
                <Badge
                  variant={
                    course.level === "Pemula"
                      ? "success"
                      : course.level === "Menengah"
                        ? "warning"
                        : "primary"
                  }
                >
                  {course.level}
                </Badge>
                {course.isLocked && <Badge variant="muted">🔒 Terkunci</Badge>}
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-[var(--text)] mb-1">{course.title}</h3>
              <p className="text-xs text-[var(--text-muted)] mb-3 line-clamp-2">
                {course.description}
              </p>
              <div className="flex items-center gap-3 text-xs text-[var(--text-subtle)] mb-4">
                <span>📖 {course.totalLessons} pelajaran</span>
                <span>⏱ {course.estimatedHours} jam</span>
                <span>📁 {course.category}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => openEdit(course)}
                >
                  <EditIcon size={13} /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteId(course.id)}
                  className="text-[#E74C3C] border-[#E74C3C]/30 hover:bg-[var(--danger-light)]"
                >
                  <TrashIcon size={13} />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editCourse ? "Edit Kursus" : "Tambah Kursus Baru"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
                Judul Kursus
              </label>
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Judul kursus"
                className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
                Kategori
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((p) => ({ ...p, category: e.target.value }))
                }
                className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
                Level
              </label>
              <select
                value={form.level}
                onChange={(e) =>
                  setForm((p) => ({ ...p, level: e.target.value }))
                }
                className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7]"
              >
                <option>Pemula</option>
                <option>Menengah</option>
                <option>Lanjutan</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
                Estimasi Jam
              </label>
              <input
                type="number"
                value={form.estimatedHours}
                onChange={(e) =>
                  setForm((p) => ({ ...p, estimatedHours: +e.target.value }))
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
              placeholder="Deskripsi kursus..."
              className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7] resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
              Thumbnail
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 border-2 border-dashed border-[var(--border)] rounded-xl p-4 text-center text-sm text-[var(--text-subtle)] hover:border-[#4F8EF7] cursor-pointer transition-colors">
                📷 Klik untuk unggah gambar kursus
              </div>
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isLocked}
              onChange={(e) =>
                setForm((p) => ({ ...p, isLocked: e.target.checked }))
              }
              className="w-4 h-4 accent-[#4F8EF7]"
            />
            <span className="text-sm text-[var(--text)]">
              Kursus terkunci (tidak dapat diakses pengguna)
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
              {editCourse ? "Simpan Perubahan" : "Tambah Kursus"}
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
          <h3 className="font-bold text-[var(--text)] mb-2">Hapus Kursus?</h3>
          <p className="text-sm text-[var(--text-muted)] mb-5">
            Semua pelajaran dan kuis dalam kursus ini akan ikut terhapus.
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
