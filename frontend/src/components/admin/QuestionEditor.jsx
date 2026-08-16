import { useCallback, useState } from "react";
import { Button, Alert } from "../ui/ui";
import { PlusIcon, EditIcon, TrashIcon } from "../ui/Icons";
import { quizService } from "../../services";
import {
  useAdminResource,
  useFlash,
  runMutation,
  fieldErrors,
} from "../../hooks/useAdminResource";

/**
 * Penyunting soal kuis — API Contract §8.13.
 *
 * Panel admin sebelumnya TIDAK punya satu pun cara menulis soal. Kuis dapat
 * dibuat, diberi KKM, dan "dipublikasikan", tetapi isinya mustahil diisi lewat
 * antarmuka; tujuh baris `quiz_questions` yang ada di basis data seluruhnya
 * berasal dari skrip uji. Berkas ini yang menutup lubang itu.
 *
 * ── Aturan server yang dicerminkan di sini ────────────────────────────
 *
 *   · 2-6 pilihan, masing-masing tidak kosong dan maksimal 200 karakter
 *   · tidak boleh ada dua pilihan yang sama (dibandingkan tanpa peduli
 *     huruf besar/kecil, setelah dipangkas spasi)
 *   · `correctIndex` wajib berada dalam jangkauan pilihan
 *   · pada PEMBARUAN, `options` dan `correctIndex` harus dikirim BERSAMAAN —
 *     mengirim salah satunya membuat indeks bisa jatuh di luar array tersimpan
 *
 * Validasi diulang di klien bukan karena server tidak dipercaya, melainkan
 * supaya admin tahu kesalahannya sebelum menekan Simpan. Server tetap
 * pemutus terakhir.
 */

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

const EMPTY_DRAFT = {
  question: "",
  questionType: "multiple-choice",
  options: ["", ""],
  correctIndex: 0,
  answerText: "",
};

/**
 * Bentuk baku target ejaan; cerminan `normalizeSpellTarget` di backend.
 * Server tetap pemutus terakhir — ini hanya agar admin melihat bentuk yang
 * benar-benar akan tersimpan.
 */
const normalizeSpellTarget = (value) =>
  String(value ?? "").trim().toUpperCase().replace(/\s+/g, " ");

/**
 * ══ TITIK KEPUTUSAN ═══════════════════════════════════════════════════
 *
 * Apa yang terjadi ketika admin menghapus pilihan yang SEDANG ditandai
 * sebagai jawaban benar?
 *
 * Tiga perilaku yang sama-sama masuk akal:
 *
 *   (a) Tolak penghapusan — paksa admin memilih jawaban benar yang baru
 *       lebih dulu. Paling aman, paling mengganggu.
 *
 *   (b) Kosongkan penanda — hapus pilihannya, biarkan tidak ada jawaban
 *       benar, dan tolak penyimpanan sampai admin memilih ulang. Eksplisit,
 *       tetapi butuh keadaan "belum ada jawaban benar" di form.
 *
 *   (c) Geser penanda — yang dipakai di bawah. Menghapus pilihan SEBELUM
 *       jawaban benar menggeser indeksnya turun satu; menghapus jawaban
 *       benar itu sendiri memindahkan penanda ke pilihan pertama.
 *
 * Saya memilih (c) karena ia tidak pernah membuat form terjebak dalam
 * keadaan tidak sah. Harganya nyata: menghapus jawaban benar akan diam-diam
 * menandai pilihan A sebagai benar, dan admin yang tidak memperhatikan bisa
 * menyimpan kunci jawaban yang salah. Itu sebabnya baris penanda diberi
 * peringatan kuning ketika hal ini terjadi — lihat `warnCorrectMoved`.
 *
 * Bila Anda lebih suka (a) atau (b), fungsi inilah satu-satunya yang perlu
 * diubah; sisa komponen tidak peduli strategi mana yang dipakai.
 *
 * @param {string[]} options       daftar pilihan saat ini
 * @param {number}   correctIndex  indeks jawaban benar saat ini
 * @param {number}   removedIndex  indeks yang dihapus
 * @returns {{options: string[], correctIndex: number, correctMoved: boolean}}
 */
function removeOption(options, correctIndex, removedIndex) {
  const next = options.filter((_, i) => i !== removedIndex);

  if (removedIndex === correctIndex) {
    return { options: next, correctIndex: 0, correctMoved: true };
  }
  if (removedIndex < correctIndex) {
    return { options: next, correctIndex: correctIndex - 1, correctMoved: false };
  }
  return { options: next, correctIndex, correctMoved: false };
}

/** Validasi lokal — cerminan `validateCreateQuestion` di backend. */
function validateDraft(draft) {
  const errors = {};

  const question = draft.question.trim();
  if (!question) errors.question = "Pertanyaan wajib diisi.";
  else if (question.length > 1000) errors.question = "Pertanyaan maksimal 1000 karakter.";

  // Soal kamera dijawab dengan memperagakan huruf, bukan memilih. Model
  // pengenal hanya menguasai A-Z, jadi target di luar itu akan menghasilkan
  // soal yang mustahil diselesaikan peserta.
  if (draft.questionType === "camera-spell") {
    const target = normalizeSpellTarget(draft.answerText);
    if (!target) {
      errors.answerText = "Kata yang harus dieja wajib diisi.";
    } else if (!/^[A-Z]+( [A-Z]+)*$/.test(target)) {
      errors.answerText =
        "Hanya huruf A-Z dan spasi yang dapat diperagakan; angka, tanda baca, dan huruf beraksen tidak dikenali model.";
    } else if (target.replace(/ /g, "").length < 2) {
      errors.answerText = "Kata yang harus dieja minimal 2 huruf.";
    } else if (target.length > 40) {
      errors.answerText = "Kata yang harus dieja maksimal 40 karakter.";
    }
    return errors;
  }

  const trimmed = draft.options.map((o) => o.trim());

  if (trimmed.length < MIN_OPTIONS || trimmed.length > MAX_OPTIONS) {
    errors.options = `Pilihan jawaban harus ${MIN_OPTIONS}-${MAX_OPTIONS} item.`;
  } else if (trimmed.some((o) => o === "")) {
    errors.options = "Setiap pilihan jawaban harus diisi.";
  } else if (trimmed.some((o) => o.length > 200)) {
    errors.options = "Setiap pilihan jawaban maksimal 200 karakter.";
  } else {
    const normalized = trimmed.map((o) => o.toLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      errors.options = "Pilihan jawaban tidak boleh ada yang sama.";
    }
  }

  if (draft.correctIndex < 0 || draft.correctIndex >= trimmed.length) {
    errors.correctIndex = "Pilih salah satu jawaban sebagai kunci.";
  }

  return errors;
}

export default function QuestionEditor({ courseId, quizId, quizTitle, onChanged }) {
  const { flash, show, clear } = useFlash();

  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [warnCorrectMoved, setWarnCorrectMoved] = useState(false);

  const load = useCallback(
    () => quizService.getQuestions(courseId, quizId),
    [courseId, quizId],
  );
  const { data, loading, error, reload } = useAdminResource(load, [courseId, quizId]);
  const questions = data ?? [];

  /** Memberi tahu induk agar `totalQuestions` ikut segar. */
  const afterChange = useCallback(async () => {
    await reload();
    onChanged?.();
  }, [reload, onChanged]);

  function openCreate() {
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT, options: ["", ""] });
    setErrors({});
    setWarnCorrectMoved(false);
  }

  function openEdit(question) {
    setEditingId(question.id);
    setDraft({
      question: question.question ?? "",
      questionType: question.questionType ?? "multiple-choice",
      answerText: question.answerText ?? "",
      options: question.options?.length ? [...question.options] : ["", ""],
      // Endpoint daftar pertanyaan ini khusus admin, jadi `correctIndex`
      // memang ikut. Peran `user` tidak pernah menerimanya (§5.5).
      correctIndex: question.correctIndex ?? 0,
    });
    setErrors({});
    setWarnCorrectMoved(false);
  }

  function closeDraft() {
    setDraft(null);
    setEditingId(null);
    setErrors({});
    setWarnCorrectMoved(false);
  }

  function setOption(index, value) {
    setDraft((d) => ({
      ...d,
      options: d.options.map((o, i) => (i === index ? value : o)),
    }));
  }

  function addOption() {
    setDraft((d) =>
      d.options.length >= MAX_OPTIONS ? d : { ...d, options: [...d.options, ""] },
    );
  }

  function handleRemoveOption(index) {
    setDraft((d) => {
      if (d.options.length <= MIN_OPTIONS) return d;
      const next = removeOption(d.options, d.correctIndex, index);
      setWarnCorrectMoved(next.correctMoved);
      return { ...d, options: next.options, correctIndex: next.correctIndex };
    });
  }

  async function handleSave() {
    const localErrors = validateDraft(draft);
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setSaving(true);
    setErrors({});

    const payload =
      draft.questionType === "camera-spell"
        ? {
            question: draft.question.trim(),
            questionType: "camera-spell",
            answerText: normalizeSpellTarget(draft.answerText),
          }
        : {
            question: draft.question.trim(),
            questionType: "multiple-choice",
            options: draft.options.map((o) => o.trim()),
            correctIndex: draft.correctIndex,
          };

    const outcome = await runMutation(() =>
      editingId
        ? quizService.updateQuestion(courseId, quizId, editingId, payload)
        : quizService.createQuestion(courseId, quizId, payload),
    );

    setSaving(false);

    if (!outcome.ok) {
      setErrors(fieldErrors(outcome.errors));
      show("danger", outcome.message);
      return;
    }

    closeDraft();
    await afterChange();
    show("success", editingId ? "Soal berhasil diperbarui." : "Soal berhasil ditambahkan.");
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setBusy(true);
    const outcome = await runMutation(() =>
      quizService.deleteQuestion(courseId, quizId, deleteTarget.id),
    );
    setBusy(false);
    setDeleteTarget(null);

    if (!outcome.ok) {
      show("danger", outcome.message);
      return;
    }
    await afterChange();
    show("success", "Soal berhasil dihapus.");
  }

  async function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;

    const next = [...questions];
    [next[index], next[target]] = [next[target], next[index]];

    setBusy(true);
    const outcome = await runMutation(() =>
      quizService.reorderQuestions(
        courseId,
        quizId,
        next.map((q) => q.id),
      ),
    );
    setBusy(false);

    if (!outcome.ok) {
      show("danger", outcome.message);
      return;
    }
    await reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-bold text-[var(--text)]">Soal — {quizTitle}</h3>
          <p className="text-xs text-[var(--text-muted)]">
            {loading ? "Memuat…" : `${questions.length} soal tersimpan`}
          </p>
        </div>
        {!draft && (
          <Button size="sm" onClick={openCreate}>
            <PlusIcon size={14} /> Tambah Soal
          </Button>
        )}
      </div>

      {flash && <Alert type={flash.type} message={flash.message} onClose={clear} />}
      {error && <Alert type="danger" message={error.message} onClose={() => reload()} />}

      {/*
        Peringatan tanpa soal sama sekali. Server menolak pengerjaan kuis
        kosong dengan 409, jadi tanpa pesan ini admin baru tahu masalahnya
        dari keluhan pengguna — atau dari layar juri saat demo.
      */}
      {!loading && questions.length === 0 && !draft && (
        <Alert
          type="warning"
          message="Kuis ini belum punya soal, sehingga belum dapat dikerjakan siapa pun. Tambahkan minimal satu soal."
        />
      )}

      {/* ─── Daftar soal ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-xs font-bold flex-shrink-0">
                {idx + 1}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text)] mb-2">{q.question}</p>
                <div className="grid sm:grid-cols-2 gap-1.5">
                  {(q.options ?? []).map((option, i) => {
                    const isCorrect = i === q.correctIndex;
                    return (
                      <div
                        key={i}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-2 ${
                          isCorrect
                            ? "border-[#2ECC71]/40 bg-[var(--success-light)] text-[#1A6B40] font-semibold"
                            : "border-[var(--border)] text-[var(--text-muted)]"
                        }`}
                      >
                        <span className="font-bold">{String.fromCharCode(65 + i)}</span>
                        <span className="truncate">{option}</span>
                        {isCorrect && <span className="ml-auto">✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0 || busy}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-3)] disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Naikkan urutan"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(idx, 1)}
                  disabled={idx === questions.length - 1 || busy}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-3)] disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Turunkan urutan"
                >
                  ↓
                </button>
                <button
                  onClick={() => openEdit(q)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)]"
                  title="Edit soal"
                >
                  <EditIcon size={14} />
                </button>
                <button
                  onClick={() => setDeleteTarget(q)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--danger-light)] hover:text-[#E74C3C]"
                  title="Hapus soal"
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Form tambah / edit ──────────────────────────────────────── */}
      {draft && (
        <div className="rounded-xl border-2 border-[#4F8EF7]/40 bg-[var(--surface-2)] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-[var(--text)]">
              {editingId ? "Edit Soal" : "Soal Baru"}
            </h4>
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
              Jenis soal
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "multiple-choice", label: "Pilihan ganda" },
                { id: "camera-spell", label: "Peragakan di kamera" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, questionType: option.id }))}
                  className={`min-h-11 rounded-xl border-2 px-4 text-sm font-medium transition-colors ${
                    draft.questionType === option.id
                      ? "border-[#4F8EF7] bg-[var(--primary-light)] text-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[#4F8EF7]/40"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
              Pertanyaan
            </label>
            <textarea
              value={draft.question}
              onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))}
              rows={2}
              maxLength={1000}
              placeholder="Huruf apakah yang ditunjukkan gambar ini?"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7] resize-none"
            />
            {errors.question && (
              <p className="text-xs text-[#E74C3C] mt-1">{errors.question}</p>
            )}
          </div>

          {draft.questionType === "camera-spell" ? (
            <div>
              <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
                Kata yang harus dieja
              </label>
              <input
                value={draft.answerText}
                onChange={(e) => setDraft((d) => ({ ...d, answerText: e.target.value }))}
                maxLength={40}
                placeholder="PAGI"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm uppercase tracking-widest outline-none focus:border-[#4F8EF7]"
              />
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-subtle)]">
                Peserta memperagakan kata ini huruf demi huruf dengan abjad BISINDO.
                Model pengenal hanya menguasai A-Z, jadi angka dan tanda baca tidak
                dapat dipakai. Spasi dilewati otomatis, sehingga frasa seperti
                &ldquo;SELAMAT PAGI&rdquo; tetap bisa dikerjakan.
              </p>
              {errors.answerText && (
                <p className="text-xs text-[#E74C3C] mt-1">{errors.answerText}</p>
              )}
            </div>
          ) : (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-[var(--text)]">
                Pilihan jawaban
              </label>
              <span className="text-xs text-[var(--text-subtle)]">
                Klik lingkaran untuk menandai kunci jawaban
              </span>
            </div>

            <div className="space-y-2">
              {draft.options.map((option, i) => (
                <div key={i} className="flex items-center gap-2">
                  {/*
                    Radio, bukan checkbox: tepat satu jawaban benar. `name`
                    dibagi seluruh baris supaya browser sendiri yang menjamin
                    eksklusivitasnya, termasuk lewat papan ketik.
                  */}
                  <input
                    type="radio"
                    name="correct-option"
                    checked={draft.correctIndex === i}
                    onChange={() => {
                      setDraft((d) => ({ ...d, correctIndex: i }));
                      setWarnCorrectMoved(false);
                    }}
                    className="w-4 h-4 accent-[#2ECC71] flex-shrink-0"
                    aria-label={`Tandai pilihan ${String.fromCharCode(65 + i)} sebagai jawaban benar`}
                  />
                  <span className="text-xs font-bold text-[var(--text-muted)] w-4">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <input
                    value={option}
                    onChange={(e) => setOption(i, e.target.value)}
                    maxLength={200}
                    placeholder={`Pilihan ${String.fromCharCode(65 + i)}`}
                    className={`flex-1 rounded-xl border bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[#4F8EF7] ${
                      draft.correctIndex === i
                        ? "border-[#2ECC71]/50"
                        : "border-[var(--border)]"
                    }`}
                  />
                  <button
                    onClick={() => handleRemoveOption(i)}
                    disabled={draft.options.length <= MIN_OPTIONS}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--danger-light)] hover:text-[#E74C3C] disabled:opacity-30 disabled:cursor-not-allowed"
                    title={
                      draft.options.length <= MIN_OPTIONS
                        ? `Minimal ${MIN_OPTIONS} pilihan`
                        : "Hapus pilihan"
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {warnCorrectMoved && (
              <div className="mt-2">
                <Alert
                  type="warning"
                  message="Kunci jawaban ikut terhapus, jadi penanda dipindahkan ke pilihan A. Periksa apakah itu memang jawaban yang benar."
                  onClose={() => setWarnCorrectMoved(false)}
                />
              </div>
            )}

            {errors.options && <p className="text-xs text-[#E74C3C] mt-1">{errors.options}</p>}
            {errors.correctIndex && (
              <p className="text-xs text-[#E74C3C] mt-1">{errors.correctIndex}</p>
            )}

            {draft.options.length < MAX_OPTIONS && (
              <button
                onClick={addOption}
                className="mt-2 text-xs font-semibold text-[var(--primary)] hover:underline"
              >
                + Tambah pilihan ({draft.options.length}/{MAX_OPTIONS})
              </button>
            )}
          </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" fullWidth size="sm" onClick={closeDraft} disabled={saving}>
              Batal
            </Button>
            <Button fullWidth size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan…" : editingId ? "Simpan Soal" : "Tambah Soal"}
            </Button>
          </div>
        </div>
      )}

      {/* ─── Konfirmasi hapus ────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="rounded-xl border border-[#E74C3C]/30 bg-[var(--danger-light)] p-4">
          <p className="text-sm text-[#8B2519] mb-3">
            Hapus soal “{deleteTarget.question.slice(0, 80)}
            {deleteTarget.question.length > 80 ? "…" : ""}”?
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={busy}>
              Hapus Soal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
