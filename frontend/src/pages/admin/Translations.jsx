import { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Modal } from "../../components/ui/ui";
import { EditIcon, PlusIcon, SearchIcon, TrashIcon } from "../../components/ui/Icons";
import { translationService } from "../../services";
import { parseYouTubeId } from "../../features/lesson/youtube";
import { letterImage } from "../../features/bisindo/alphabetImages";
import { spellPhrase, toSpellingText } from "../../features/bisindo/spelling";
import {
  IMAGE_UPLOAD_ACCEPT,
  validateImageFile,
} from "../../features/media/imageUpload";
import {
  fieldErrors,
  runMutation,
  useAdminResource,
  useFlash,
} from "../../hooks/useAdminResource";

const EMPTY = {
  word: "",
  translation: "",
  description: "",
  category: "Umum",
  status: "active",
  signVideo: "",
  aliases: "",
};

export default function AdminTranslations() {
  const { flash, show, clear } = useFlash();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(
    () => () => {
      if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview],
  );

  const load = useCallback(async () => {
    const params = { page, limit: 10 };
    if (search.length >= 1) params.q = search;
    if (category !== "all") params.category = category;
    if (status !== "all") params.status = status;
    const [list, categories] = await Promise.all([
      translationService.getTranslations(params),
      translationService.getCategories(),
    ]);
    return { list, categories };
  }, [category, page, search, status]);

  const { data, loading, error, reload } = useAdminResource(
    load,
    [category, page, search, status],
  );
  const items = data?.list?.items ?? [];
  const pagination = data?.list?.pagination;

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setImageFile(null);
    setImagePreview("");
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      word: item.word,
      translation: item.translation,
      description: item.description ?? "",
      category: item.category,
      status: item.status,
      signVideo: item.signVideo ?? "",
      aliases: (item.aliases ?? []).join(", "),
    });
    setImageFile(null);
    setImagePreview(item.signImage ?? "");
    setErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setImageFile(null);
    setImagePreview("");
    setErrors({});
  }

  function payload() {
    return {
      word: form.word.trim(),
      translation: form.translation.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || "Umum",
      status: form.status,
      signImage: editing?.signImage ?? null,
      signVideo: form.signVideo.trim() || null,
      aliases: form.aliases.split(",").map((item) => item.trim()).filter(Boolean),
    };
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      validateImageFile(file);
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setErrors((current) => ({ ...current, image: "" }));
    } catch (validationError) {
      setImageFile(null);
      setErrors((current) => ({ ...current, image: validationError.message }));
    } finally {
      event.target.value = "";
    }
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    const result = await runMutation(() =>
      editing
        ? translationService.updateTranslation(editing.id, payload())
        : translationService.createTranslation(payload()),
    );

    if (!result.ok) {
      setSaving(false);
      setErrors(fieldErrors(result.errors));
      show("danger", result.message);
      return;
    }

    let imageUploadFailure = null;
    if (imageFile) {
      const upload = await runMutation(() =>
        translationService.uploadTranslationImage(result.result.id, imageFile),
      );
      if (!upload.ok) imageUploadFailure = upload.message;
    }

    setSaving(false);
    closeModal();
    await reload();
    show(
      imageUploadFailure ? "danger" : "success",
      imageUploadFailure
        ? `Kata tersimpan, tetapi gambarnya gagal diunggah: ${imageUploadFailure}`
        : editing
          ? "Kata berhasil diperbarui."
          : "Kata baru berhasil ditambahkan.",
    );
  }

  async function remove() {
    if (!deleteTarget) return;
    const result = await runMutation(() =>
      translationService.deleteTranslation(deleteTarget.id),
    );
    setDeleteTarget(null);
    if (!result.ok) {
      show("danger", result.message);
      return;
    }
    if (items.length === 1 && page > 1) setPage((value) => value - 1);
    else await reload();
    show("success", "Kata berhasil dihapus.");
  }

  const update = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const updateWord = (event) => {
    const word = event.target.value;
    setForm((current) => {
      const generated = toSpellingText(current.word);
      const shouldSync = !current.translation || current.translation === generated;
      return {
        ...current,
        word,
        translation: shouldSync ? toSpellingText(word) : current.translation,
      };
    });
  };

  return (
    <div className="space-y-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text)]">Bank Kata BISINDO</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Kelola kata yang tampil langsung di penerjemah anak.
          </p>
        </div>
        <Button onClick={openAdd}><PlusIcon size={16} /> Tambah Kata</Button>
      </div>

      {flash && <Alert type={flash.type} message={flash.message} onClose={clear} />}
      {error && <Alert type="danger" message={error.message} onClose={reload} />}

      <Card padding="sm">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_150px]">
          <label className="relative">
            <span className="sr-only">Cari kata</span>
            <SearchIcon
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
            />
            <input
              className="admin-word-input pl-10"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari kata atau alias…"
            />
          </label>
          <select
            className="admin-word-input"
            value={category}
            onChange={(event) => { setCategory(event.target.value); setPage(1); }}
            aria-label="Filter kategori"
          >
            <option value="all">Semua kategori</option>
            {(data?.categories ?? []).map((item) => (
              <option key={item.category} value={item.category}>
                {item.category} ({item.count})
              </option>
            ))}
          </select>
          <select
            className="admin-word-input"
            value={status}
            onChange={(event) => { setStatus(event.target.value); setPage(1); }}
            aria-label="Filter status"
          >
            <option value="all">Semua status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-word-table">
            <thead>
              <tr><th>Kata</th><th>BISINDO</th><th>Kategori</th><th>Status</th><th className="text-right">Aksi</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5"><div className="admin-word-empty" role="status">Memuat Bank Kata…</div></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="5"><div className="admin-word-empty">Belum ada kata yang cocok. Tambahkan kata pertama untuk mulai.</div></td></tr>
              ) : items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.word}</strong><small>{item.aliases?.length ? `Alias: ${item.aliases.join(", ")}` : "Tanpa alias"}</small></td>
                  <td><span className="admin-word-translation">{toSpellingText(item.word) || item.translation}</span></td>
                  <td>{item.category}</td>
                  <td><Badge variant={item.status === "active" ? "success" : "muted"}>{item.status === "active" ? "Aktif" : "Nonaktif"}</Badge></td>
                  <td>
                    <div className="admin-word-actions">
                      <Button size="sm" variant="secondary" onClick={() => setPreview(item)}>Preview</Button>
                      <button type="button" onClick={() => openEdit(item)} aria-label={`Edit ${item.word}`}><EditIcon size={15} /></button>
                      <button type="button" className="is-danger" onClick={() => setDeleteTarget(item)} aria-label={`Hapus ${item.word}`}><TrashIcon size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="admin-word-pagination">
            <span>Halaman {pagination.page} dari {pagination.totalPages}</span>
            <div>
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Sebelumnya</Button>
              <Button size="sm" variant="secondary" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Berikutnya</Button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => !saving && closeModal()}
        title={editing ? "Edit Kata BISINDO" : "Tambah Kata BISINDO"}
        size="lg"
      >
        <form onSubmit={save} className="admin-word-form">
          <div className="grid sm:grid-cols-2 gap-4">
            <WordField label="Kata" value={form.word} onChange={updateWord} error={errors.word} required />
            <WordField label="Ejaan alfabet BISINDO" value={form.translation} onChange={update("translation")} error={errors.translation} hint="Terisi otomatis dari kata dan tetap dapat disunting." required />
            <WordField label="Kategori" value={form.category} onChange={update("category")} error={errors.category} />
            <label>
              Status
              <select value={form.status} onChange={update("status")}>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
              {errors.status && <small>{errors.status}</small>}
            </label>
            <label>
              Gambar gerakan
              <input type="file" accept={IMAGE_UPLOAD_ACCEPT} onChange={handleImageChange} />
              <small>{errors.image || "JPEG, PNG, atau WebP maksimal 5 MB; disimpan di Cloudinary."}</small>
            </label>
            <WordField label="URL video gerakan" value={form.signVideo} onChange={update("signVideo")} error={errors.signVideo} placeholder="https://…" />
          </div>
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Pratinjau gambar gerakan"
              className="max-h-52 w-full rounded-xl border border-[var(--border)] object-contain"
            />
          )}
          <WordField label="Alias (pisahkan dengan koma)" value={form.aliases} onChange={update("aliases")} error={errors.aliases} placeholder="makasih, terimakasih" />
          <label>
            Deskripsi
            <textarea rows="3" value={form.description} onChange={update("description")} />
            {errors.description && <small>{errors.description}</small>}
          </label>
          <div className="admin-word-form-actions">
            <Button type="button" variant="secondary" onClick={closeModal} disabled={saving}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan Kata"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Hapus kata?">
        <p className="text-sm text-[var(--text-muted)]">
          Kata <strong>{deleteTarget?.word}</strong> akan hilang dari penerjemah. Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="admin-word-form-actions mt-5">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button>
          <Button onClick={remove} className="bg-[#c93434]">Hapus</Button>
        </div>
      </Modal>
      <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title={`Preview: ${preview?.word ?? ""}`}>
        <PreviewBody item={preview} />
      </Modal>
    </div>
  );
}
function PreviewBody({ item }) {
  if (!item) return null;
  const youTubeId = parseYouTubeId(item.signVideo ?? "");
  const spelled = spellPhrase(item.word);

  return (
    <div className="admin-word-preview">
      {youTubeId ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youTubeId}`}
          title={`Gerakan BISINDO ${item.word}`}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      ) : item.signVideo ? (
        <video src={item.signVideo} controls playsInline />
      ) : item.signImage ? (
        <img src={item.signImage} alt={`Gerakan BISINDO ${item.word}`} />
      ) : (
        <div className="admin-word-alphabet-preview" aria-label={`Ejaan alfabet BISINDO ${item.word}`}>
          {spelled.words.map((word, wordIndex) => (
            <div className="admin-word-alphabet-word" key={`${word.text}-${wordIndex}`}>
              {word.letters.map((letter, index) => (
                <figure key={`${letter}-${index}`}>
                  <img src={letterImage(letter)} alt={`Isyarat huruf ${letter}`} />
                  <figcaption aria-hidden="true">{letter}</figcaption>
                </figure>
              ))}
            </div>
          ))}
        </div>
      )}
      <p>{item.description || "Belum ada deskripsi."}</p>
    </div>
  );
}

function WordField({ label, error, hint, ...props }) {
  return (
    <label>
      {label}
      <input {...props} aria-invalid={Boolean(error)} />
      {hint && !error && <small>{hint}</small>}
      {error && <small>{error}</small>}
    </label>
  );
}
