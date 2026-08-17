import { useCallback, useEffect, useState } from "react";
import { Card, Button, Badge, Modal, Alert, Input } from "../../components/ui/ui";
import { PlusIcon, EditIcon, TrashIcon, SearchIcon } from "../../components/ui/Icons";
import { courseService } from "../../services";
import {
  getCourseThumbnail,
  imageFileToDataUrl,
  saveCourseThumbnail,
  removeCourseThumbnail,
} from "../../utils/courseThumbnail";
import {
  useAdminResource,
  useFlash,
  runMutation,
  fieldErrors,
} from "../../hooks/useAdminResource";

/**
 * Manajemen kursus — API Contract §8.1-8.5.
 *
 * ── Yang berubah dari versi mock ──────────────────────────────────────
 *
 * · `totalLessons` TIDAK dikirim saat menyimpan. Server menghitungnya dari
 *   jumlah baris `lessons`, dan `validateUpdateCourse` menolak field itu
 *   terang-terangan. Versi lama menyalin seluruh objek kursus apa adanya —
 *   yang berarti setiap penyimpanan akan gagal 422 begitu tersambung API.
 *
 * · Thumbnail tidak dikirim sebagai berkas ke backend karena API saat ini hanya
 *   menerima URL http/https. Gambar yang dipilih admin dikompres dan disimpan
 *   di localStorage perangkat, lalu dipakai di seluruh halaman frontend.
 *
 * · Menghapus kursus dapat DITOLAK 409 bila sudah ada yang mempelajarinya.
 *   Itu bukan galat tak terduga melainkan penjagaan yang disengaja, jadi
 *   pesannya ditampilkan apa adanya beserta jalan keluarnya: kunci kursus.
 */

const LEVELS = ["Pemula", "Menengah", "Lanjutan"];

const EMPTY_FORM = {
  title: "",
  titleEn: "",
  category: "",
  level: "Pemula",
  description: "",
  estimatedHours: 2,
  sortOrder: 0,
  isLocked: false,
};

/** Thumbnail dengan fallback untuk daftar kursus admin. */
function Thumbnail({ src, className, fallbackClassName }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={fallbackClassName} aria-hidden="true">
        📚
      </div>
    );
  }

  return <img src={src} alt="" className={className} onError={() => setFailed(true)} />;
}

export default function AdminCourses() {
  const { flash, show, clear } = useFlash();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBlocked, setDeleteBlocked] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    const params = { limit: 100, sortBy: "sortOrder", sortDir: "asc" };
    if (search.length >= 2) params.q = search;
    if (levelFilter !== "all") params.level = levelFilter;

    const [list, categories] = await Promise.all([
      courseService.getCourses(params),
      courseService.getCategories().catch(() => []),
    ]);
    return { list, categories };
  }, [search, levelFilter]);

  const { data, loading, error, reload } = useAdminResource(load, [search, levelFilter]);

  const courses = data?.list?.items ?? [];
  const categories = data?.categories ?? [];

  function openAdd() {
    setEditCourse(null);
    setForm({ ...EMPTY_FORM, sortOrder: courses.length });
    setThumbnailPreview("");
    setThumbnailFile(null);
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(course) {
    setEditCourse(course);
    setForm({
      title: course.title ?? "",
      titleEn: course.titleEn ?? "",
      category: course.category ?? "",
      level: course.level ?? "Pemula",
      description: course.description ?? "",
      estimatedHours: course.estimatedHours ?? 0,
      sortOrder: course.sortOrder ?? 0,
      isLocked: course.isLocked ?? false,
    });
    setThumbnailPreview(getCourseThumbnail(course));
    setThumbnailFile(null);
    setFormErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditCourse(null);
    setThumbnailPreview("");
    setThumbnailFile(null);
    setFormErrors({});
  }

  async function handleThumbnailChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await imageFileToDataUrl(file);
      setThumbnailFile(dataUrl);
      setThumbnailPreview(dataUrl);
      setFormErrors((previous) => ({ ...previous, thumbnail: "" }));
    } catch (error) {
      setThumbnailFile(null);
      setFormErrors((previous) => ({
        ...previous,
        thumbnail: error?.message ?? "Gambar tidak dapat digunakan.",
      }));
    } finally {
      event.target.value = "";
    }
  }

  /**
   * Menyusun body permintaan.
   *
   * String kosong dikirim sebagai `null`, bukan `""`. Validator memperlakukan
   * keduanya berbeda pada `thumbnail`: `""` lolos `isBlank` tetapi tersimpan
   * sebagai URL kosong. Atribut src yang kosong membuat browser meminta ulang
   * halaman itu sendiri, lalu menampilkan ikon gambar rusak di setiap kartu.
   */
  function buildPayload() {
    return {
      title: form.title.trim(),
      titleEn: form.titleEn.trim() || null,
      category: form.category.trim() || null,
      level: form.level,
      description: form.description.trim() || null,
      // Backend tetap menerima URL lama/null; gambar lokal disimpan terpisah di browser.
      thumbnail: editCourse?.thumbnail ?? null,
      estimatedHours: Number(form.estimatedHours) || 0,
      sortOrder: Number(form.sortOrder) || 0,
      isLocked: Boolean(form.isLocked),
    };
  }

  async function handleSave() {
    setSaving(true);
    setFormErrors({});

    const payload = buildPayload();
    const outcome = await runMutation(() =>
      editCourse
        ? courseService.updateCourse(editCourse.id, payload)
        : courseService.createCourse(payload),
    );

    setSaving(false);

    if (!outcome.ok) {
      setFormErrors(fieldErrors(outcome.errors));
      show("danger", outcome.message);
      return;
    }

    let thumbnailSaveFailed = false;
    if (thumbnailFile) {
      const savedCourseId = outcome.result?.id ?? editCourse?.id;
      try {
        saveCourseThumbnail(savedCourseId, thumbnailFile);
      } catch {
        thumbnailSaveFailed = true;
      }
    }

    closeModal();
    await reload();
    show(
      thumbnailSaveFailed ? "danger" : "success",
      thumbnailSaveFailed
        ? "Kursus tersimpan, tetapi gambar lokal tidak dapat disimpan di browser."
        : editCourse
          ? "Kursus berhasil diperbarui."
          : "Kursus baru berhasil dibuat.",
    );
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;

    const outcome = await runMutation(() => courseService.deleteCourse(target.id));
    setDeleteTarget(null);

    if (!outcome.ok) {
      // 409 CONFLICT = ada riwayat belajar. Tawarkan penguncian, bukan sekadar
      // menampilkan galat merah lalu membiarkan admin buntu.
      if (outcome.code === "CONFLICT") {
        setDeleteBlocked({ course: target, message: outcome.message });
        return;
      }
      show("danger", outcome.message);
      return;
    }

    removeCourseThumbnail(target.id);
    await reload();
    show("success", "Kursus berhasil dihapus.");
  }

  async function handleLockInstead() {
    if (!deleteBlocked) return;

    const outcome = await runMutation(() =>
      courseService.updateCourse(deleteBlocked.course.id, { isLocked: true }),
    );
    setDeleteBlocked(null);

    if (!outcome.ok) {
      show("danger", outcome.message);
      return;
    }
    await reload();
    show("success", "Kursus dikunci — pengguna baru tidak dapat mengaksesnya.");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text)]">Manajemen Kursus</h1>
          <p className="text-[var(--text-muted)] mt-0.5">
            {loading ? "Memuat…" : `${courses.length} kursus ditampilkan`}
          </p>
        </div>
        <Button onClick={openAdd}>
          <PlusIcon size={16} /> Tambah Kursus
        </Button>
      </div>

      {flash && <Alert type={flash.type} message={flash.message} onClose={clear} />}
      {error && <Alert type="danger" message={error.message} onClose={() => reload()} />}

      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
            />
            <input
              type="text"
              placeholder="Cari judul atau kategori (minimal 2 karakter)…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] text-sm outline-none focus:border-[#4F8EF7] focus:ring-2 focus:ring-[#4F8EF7]/20"
            />
          </div>
          <div className="flex gap-2">
            {[{ id: "all", label: "Semua" }, ...LEVELS.map((l) => ({ id: l, label: l }))].map(
              (f) => (
                <button
                  key={f.id}
                  onClick={() => setLevelFilter(f.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    levelFilter === f.id
                      ? "bg-[#4F8EF7] text-white"
                      : "bg-[var(--surface-3)] text-[var(--text-muted)] hover:bg-[#E2E8F0]"
                  }`}
                >
                  {f.label}
                </button>
              ),
            )}
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="h-64 animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-[var(--text-muted)]">Tidak ada kursus yang cocok.</p>
            <Button variant="secondary" className="mt-4" onClick={openAdd}>
              <PlusIcon size={14} /> Buat Kursus Pertama
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <Card key={course.id} padding="none" className="overflow-hidden">
              <div className="relative">
                <Thumbnail
                  key={course.thumbnail ?? "none"}
                  src={getCourseThumbnail(course)}
                  className="w-full h-40 object-cover"
                  fallbackClassName="w-full h-40 bg-[var(--surface-3)] flex items-center justify-center text-4xl"
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
                <p className="text-xs text-[var(--text-muted)] mb-3 line-clamp-2 min-h-[2rem]">
                  {course.description || "Belum ada deskripsi."}
                </p>
                <div className="flex items-center gap-3 text-xs text-[var(--text-subtle)] mb-4 flex-wrap">
                  <span>📖 {course.totalLessons} pelajaran</span>
                  <span>⏱ {course.estimatedHours} jam</span>
                  <span>📁 {course.category ?? "Tanpa kategori"}</span>
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
                    onClick={() => setDeleteTarget(course)}
                    className="text-[#E74C3C] border-[#E74C3C]/30 hover:bg-[var(--danger-light)]"
                  >
                    <TrashIcon size={13} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editCourse ? "Edit Kursus" : "Tambah Kursus Baru"}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Judul Kursus"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Alfabet BISINDO"
              error={formErrors.title}
            />
            <Input
              label="Judul (Inggris) — opsional"
              value={form.titleEn}
              onChange={(e) => setForm((p) => ({ ...p, titleEn: e.target.value }))}
              placeholder="BISINDO Alphabet"
              error={formErrors.titleEn}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
                Kategori
              </label>
              {/*
                Datalist, bukan <select> tertutup: kategori adalah kolom teks
                bebas di skema, bukan enum. Mengunci pilihan ke daftar tetap
                berarti kategori baru mustahil dibuat lewat panel ini.
              */}
              <input
                list="course-categories"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                placeholder="Alfabet"
                className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7]"
              />
              <datalist id="course-categories">
                {categories.map((c) => (
                  <option key={c.category} value={c.category}>
                    {c.courseCount} kursus
                  </option>
                ))}
              </datalist>
              {formErrors.category && (
                <p className="text-xs text-[#E74C3C] mt-1">{formErrors.category}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">Level</label>
              <select
                value={form.level}
                onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7]"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              {formErrors.level && (
                <p className="text-xs text-[#E74C3C] mt-1">{formErrors.level}</p>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Estimasi Jam"
              type="number"
              min="0"
              step="0.5"
              value={form.estimatedHours}
              onChange={(e) => setForm((p) => ({ ...p, estimatedHours: e.target.value }))}
              error={formErrors.estimatedHours}
            />
            <Input
              label="Urutan Tampil"
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
              error={formErrors.sortOrder}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
              Deskripsi
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Deskripsi kursus…"
              className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7] resize-none"
            />
            {formErrors.description && (
              <p className="text-xs text-[#E74C3C] mt-1">{formErrors.description}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
              Gambar Thumbnail
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              className="w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm text-[var(--text)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface-3)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--text)]"
            />
            <p className="text-xs text-[var(--text-subtle)] mt-1">
              Pilih gambar dari perangkat ini. Gambar otomatis diperkecil agar ringan dan tersimpan lokal di browser.
            </p>
            {formErrors.thumbnail && (
              <p className="text-xs text-[#E74C3C] mt-1">{formErrors.thumbnail}</p>
            )}
            {thumbnailPreview ? (
              <img
                src={thumbnailPreview}
                alt="Pratinjau thumbnail kursus"
                className="mt-2 h-24 w-full object-cover rounded-xl border border-[var(--border)]"
              />
            ) : (
              <div className="mt-2 h-24 w-full rounded-xl border border-dashed border-[var(--border)] flex items-center justify-center text-xs text-[var(--text-subtle)]">
                Belum ada gambar thumbnail
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isLocked}
              onChange={(e) => setForm((p) => ({ ...p, isLocked: e.target.checked }))}
              className="w-4 h-4 accent-[#4F8EF7]"
            />
            <span className="text-sm text-[var(--text)]">
              Kursus terkunci (tidak dapat diakses pengguna)
            </span>
          </label>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth onClick={closeModal} disabled={saving}>
              Batal
            </Button>
            <Button fullWidth onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan…" : editCourse ? "Simpan Perubahan" : "Tambah Kursus"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="sm">
        <div className="text-center">
          <div className="w-14 h-14 bg-[var(--danger-light)] rounded-full flex items-center justify-center mx-auto mb-4">
            <TrashIcon size={24} className="text-[#E74C3C]" />
          </div>
          <h3 className="font-bold text-[var(--text)] mb-2">Hapus Kursus?</h3>
          <p className="text-sm text-[var(--text-muted)] mb-5">
            <strong>{deleteTarget?.title}</strong> beserta seluruh pelajaran dan kuis di
            dalamnya akan dihapus permanen.
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

      {/* 409 — sudah dipelajari, tawarkan penguncian */}
      <Modal open={!!deleteBlocked} onClose={() => setDeleteBlocked(null)} size="sm">
        <div className="text-center">
          <div className="w-14 h-14 bg-[var(--warning-light)] rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            🔒
          </div>
          <h3 className="font-bold text-[var(--text)] mb-2">Kursus tidak dapat dihapus</h3>
          <p className="text-sm text-[var(--text-muted)] mb-5">{deleteBlocked?.message}</p>
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setDeleteBlocked(null)}>
              Batal
            </Button>
            <Button fullWidth onClick={handleLockInstead}>
              Kunci Kursus
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
