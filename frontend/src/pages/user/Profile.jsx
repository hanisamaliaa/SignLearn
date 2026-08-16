import { useState } from "react";
import { useApp } from "../../context/app";
import { Card, Button, Input, Alert } from "../../components/ui/ui";
import { CheckCircleIcon } from "../../components/ui/Icons";
import {
  SignLearnAvatar,
  SIGNLEARN_AVATARS,
  resolveAvatarId,
} from "../../components/common/SignLearnAvatar";
import * as authService from "../../services/authService";
import { normalizeError } from "../../services/api";

/**
 * ── Cacat yang diperbaiki di halaman ini ──────────────────────────────
 *
 * 1. NILAI AWAL DIBACA DARI JALUR YANG TIDAK ADA.
 *    Form mengambil `currentUser.profile.phone` dan `currentUser.profile.avatar`.
 *    Pada API, `user.profile` adalah STRING enum ("general" | "parent" | "deaf"),
 *    bukan objek — peninggalan bentuk data era localStorage. Membaca `.phone`
 *    dari sebuah string menghasilkan `undefined` tanpa melempar error, jadi
 *    form selalu terbuka kosong. Menyimpan lalu mengirim balik kekosongan itu,
 *    sehingga nomor telepon terhapus diam-diam dan avatar tertimpa nilai
 *    bawaan — persis gejala "perubahan profil tidak tersimpan".
 *
 * 2. PENYIMPANAN TIDAK PERNAH DITUNGGU.
 *    `updateProfile(...)` dipanggil tanpa `await`, lalu spanduk "berhasil
 *    disimpan" ditampilkan tanpa syarat. Kegagalan server terlihat persis
 *    seperti keberhasilan.
 *
 * 3. UBAH KATA SANDI TIDAK MEMANGGIL APA PUN.
 *    Handler-nya hanya menunggu 700 ms lalu mengosongkan input dan mengaku
 *    berhasil. `authService.changePassword` sudah tersedia sejak awal dan kini
 *    benar-benar dipakai.
 *
 * 4. STATISTIK DIHITUNG DARI DATA YANG TERPOTONG.
 *    Rata-rata kuis sempat dihitung dari `quizHistory`, yang merupakan
 *    `dashboard.recentQuizzes` — dibatasi LIMIT 5 di repository. Rata-rata atas
 *    lima pengerjaan terakhir yang dilabeli "Rata-rata Kuis" akan berbeda dari
 *    angka yang sama di halaman lain, tanpa ada yang tahu kenapa. Seluruh
 *    statistik di sini kini berasal dari `stats`, yang dihitung server atas
 *    seluruh riwayat.
 */

const PROFILE_OPTIONS = [
  { id: "parent", label: "Orang Tua", emoji: "👨‍👩‍👧" },
  { id: "deaf", label: "Tunarungu", emoji: "🤟" },
  { id: "general", label: "Pelajar Umum", emoji: "📚" },
];

const ROLE_LABELS = { admin: "Admin", user: "Pengguna" };
const STATUS_LABELS = {
  active: "Aktif",
  inactive: "Nonaktif",
  suspended: "Ditangguhkan",
};

/**
 * "2026-08-12" → "12 Agustus 2026".
 *
 * `timeZone: "UTC"` wajib: `joinDate` adalah DATE polos, dan tanpa penguncian
 * zona waktu ia diparsing sebagai tengah malam UTC lalu digeser mundur satu
 * hari bagi siapa pun yang berada di zona negatif.
 */
function formatJoinDate(value) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function Profile() {
  const { currentUser, updateProfile, logout, stats } = useApp();

  const [name, setName] = useState(currentUser?.name || "");
  const [email] = useState(currentUser?.email || "");
  // `currentUser.phone` dan `.avatar` adalah kolom tingkat atas pada DTO user,
  // BUKAN properti di dalam `currentUser.profile` (yang berupa string enum).
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [profile, setProfile] = useState(currentUser?.profileType || "general");
  const [avatar, setAvatar] = useState(resolveAvatarId(currentUser?.avatar));

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const [saved, setSaved] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [passError, setPassError] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  function flash(message) {
    setSaved(message);
    window.setTimeout(() => setSaved(""), 3500);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");

    // `email` sengaja TIDAK dikirim: server mengabaikannya diam-diam (§7.2),
    // dan mengirimkannya hanya menyamarkan bahwa ia memang tidak dapat diubah.
    const outcome = await updateProfile({
      name: name.trim(),
      phone: phone.trim() || null,
      avatar,
      profileType: profile,
    });

    setSaving(false);

    if (!outcome?.success) {
      setSaveError(outcome?.message || "Gagal menyimpan perubahan.");
      return;
    }
    flash("Perubahan berhasil disimpan! Informasi Anda telah diperbarui.");
  }

  /**
   * Mengubah kata sandi — benar-benar memanggil `POST /auth/change-password`.
   *
   * ── Dua hal yang mudah salah di sini ──────────────────────────────
   *
   * 1. Endpoint ini membalas `data: null` pada keberhasilan. Memeriksa
   *    `result.success` akan melempar TypeError pada `null`, dan bila blok
   *    try hanya punya `finally` tanpa `catch`, pengguna tidak melihat apa pun.
   *    Keberhasilan ditandai TIDAK ADANYA lemparan, bukan isi payload.
   *
   * 2. Server MENGAKHIRI SESI setelah kata sandi berganti (`clearRefreshCookie`,
   *    pesannya pun berbunyi "Silakan masuk kembali"). Membiarkan pengguna di
   *    halaman ini berarti ia memegang sesi mati yang gagal pada aksi
   *    berikutnya, dengan galat yang tidak berhubungan. Karena itu ia langsung
   *    dikeluarkan dan diminta masuk lagi.
   *
   * Pemeriksaan lokal di bawah hanya menyaring kesalahan yang paling sering
   * terjadi. Kebijakan penuh (8 karakter, huruf besar/kecil, angka, simbol,
   * bukan deret, bukan kata sandi umum, tidak memuat identitas) tetap
   * ditegakkan server, dan pesannya ditampilkan apa adanya ketika ditolak.
   */
  async function handleChangePassword(e) {
    e.preventDefault();
    setPassError("");

    if (!currentPass) {
      setPassError("Masukkan kata sandi saat ini.");
      return;
    }
    if (newPass !== confirmPass) {
      setPassError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    if (newPass === currentPass) {
      setPassError("Kata sandi baru harus berbeda dari kata sandi saat ini.");
      return;
    }

    setChangingPass(true);
    try {
      await authService.changePassword(currentPass, newPass);

      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
      flash("Kata sandi berhasil diubah. Silakan masuk kembali.");

      // Jeda singkat supaya pesan di atas sempat terbaca sebelum berpindah.
      window.setTimeout(() => logout(), 1500);
    } catch (error) {
      const failure = normalizeError(error);
      // Validator mengembalikan daftar per-field; gabungkan supaya pengguna
      // melihat SELURUH aturan yang belum terpenuhi sekaligus.
      const detail = (failure.errors ?? []).map((x) => x.message).join(" ");
      setPassError(detail || failure.message || "Gagal memperbarui kata sandi.");
      setChangingPass(false);
    }
  }

  const accountInfo = [
    { label: "Peran", value: ROLE_LABELS[currentUser?.role] ?? "Pengguna" },
    { label: "Bergabung", value: formatJoinDate(currentUser?.joinDate) },
    { label: "Status", value: STATUS_LABELS[currentUser?.status] ?? "—" },
  ];

  // Seluruhnya dari `stats` (ringkasan progres milik pengguna ini, dihitung
  // server). Bila belum dimuat, kartunya disembunyikan — angka nol akan
  // terbaca sebagai "sudah diukur, hasilnya kosong", padahal artinya
  // "belum diukur".
  const learningStats = stats
    ? [
        { label: "Kursus Dimulai", value: String(stats.coursesStarted ?? 0) },
        {
          label: "Pelajaran Selesai",
          value: `${stats.lessonsCompleted ?? 0} / ${stats.totalLessons ?? 0}`,
        },
        { label: "Kuis Lulus", value: String(stats.quizzesPassed ?? 0) },
        { label: "Progres Keseluruhan", value: `${stats.overallPercent ?? 0}%` },
        { label: "Streak", value: `${stats.streakDays ?? 0} hari` },
      ]
    : null;

  return (
    <div className="space-y-6">
      <header>
        <p className="mb-1 text-sm font-bold text-[#2e86bf]">AKUN SAYA</p>
        <h1 className="text-2xl font-extrabold text-[var(--text)]">
          Profil Saya
        </h1>
        <p className="mt-1 text-[var(--text-muted)]">
          Kelola informasi dan pengaturan akun Anda
        </p>
      </header>

      {saved && <Alert type="success" message={saved} onClose={() => setSaved("")} />}
      {saveError && (
        <Alert type="danger" message={saveError} onClose={() => setSaveError("")} />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-4">
          <Card interactive className="overflow-hidden border-[#d4e0e7] text-center">
            <div className="rounded-2xl bg-[#fff8df] p-5">
              <SignLearnAvatar id={avatar} size="xl" className="mx-auto" />
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-[var(--text)]">
              {currentUser?.name}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              {currentUser?.email}
            </p>
          </Card>

          <Card interactive className="border-[#d4e0e7]">
            <h3 className="mb-4 text-sm font-extrabold text-[var(--text)]">
              Informasi Akun
            </h3>
            <div className="space-y-3">
              {accountInfo.map((info) => (
                <div
                  key={info.label}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <span className="text-[var(--text-muted)]">{info.label}</span>
                  <span className="font-bold text-[var(--text)]">{info.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {learningStats && (
            <Card interactive className="border-[#d4e0e7]">
              <h3 className="mb-4 text-sm font-extrabold text-[var(--text)]">
                Statistik Belajar
              </h3>
              <div className="space-y-3">
                {learningStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <span className="text-[var(--text-muted)]">{stat.label}</span>
                    <span className="font-extrabold text-[var(--primary)]">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5 lg:col-span-2">
          <Card interactive className="border-[#d4e0e7]">
            <div className="mb-6">
              <h2 className="text-lg font-extrabold text-[var(--text)]">
                Informasi Pribadi
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Pilih avatar yang paling kamu suka, lalu lengkapi informasi akun.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <fieldset>
                <legend className="mb-3 text-sm font-bold text-[var(--text)]">
                  Avatar SignLearn
                </legend>
                <div
                  className="grid grid-cols-3 gap-3"
                  role="radiogroup"
                  aria-label="Pilih avatar profil"
                >
                  {SIGNLEARN_AVATARS.map((item) => {
                    const selected = avatar === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setAvatar(item.id)}
                        className={`min-h-36 rounded-2xl border-2 p-3 text-center transition-all focus-visible:outline-4 ${
                          selected
                            ? "border-[#2e86bf] bg-[#eef8fd] shadow-sm"
                            : "border-[var(--border)] bg-[var(--surface)] hover:border-[#9cc8e2]"
                        }`}
                      >
                        <SignLearnAvatar id={item.id} size="lg" className="mx-auto" />
                        <span className="mt-2 block text-sm font-extrabold text-[var(--text)]">
                          {item.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                          {item.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Nama Lengkap"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap Anda"
                />
                <div>
                  {/*
                    Email hanya dibaca. Server MENGABAIKANNYA diam-diam pada
                    PUT /users/profile (§7.2), jadi kolom yang bisa diketik akan
                    memberi kesan alamatnya berubah padahal tidak sama sekali.
                  */}
                  <Input
                    label="Alamat Email"
                    type="email"
                    value={email}
                    readOnly
                    aria-describedby="email-readonly-note"
                    className="cursor-not-allowed bg-[var(--surface-2)] text-[var(--text-muted)]"
                  />
                  <p
                    id="email-readonly-note"
                    className="mt-1 text-xs text-[var(--text-subtle)]"
                  >
                    Email tidak dapat diubah dari halaman ini.
                  </p>
                </div>
              </div>

              <Input
                label="Nomor Telepon"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
              />

              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text)]">
                  Profil Belajar
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {PROFILE_OPTIONS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setProfile(item.id)}
                      aria-pressed={profile === item.id}
                      className={`min-h-20 rounded-xl border-2 p-3 text-center transition-all ${
                        profile === item.id
                          ? "border-[#2e86bf] bg-[var(--primary-light)]"
                          : "border-[var(--border)] hover:border-[#9cc8e2]"
                      }`}
                    >
                      <div className="mb-1 text-xl" aria-hidden="true">
                        {item.emoji}
                      </div>
                      <p
                        className={`text-xs font-bold ${
                          profile === item.id
                            ? "text-[var(--primary)]"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        {item.label}
                      </p>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[var(--text-subtle)]">
                  Profil belajar bukan peran sistem — hanya membantu personalisasi
                  pengalaman belajar Anda.
                </p>
              </div>

              <div className="flex justify-end border-t border-[var(--border-light)] pt-4">
                <Button type="submit" disabled={saving} size="lg">
                  {saving ? (
                    "Menyimpan..."
                  ) : (
                    <>
                      <CheckCircleIcon size={16} /> Simpan Perubahan
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>

          <Card interactive className="border-[#d4e0e7]">
            <h2 className="mb-5 text-lg font-extrabold text-[var(--text)]">
              Ubah Kata Sandi
            </h2>
            {passError && (
              <div className="mb-4">
                <Alert
                  type="danger"
                  message={passError}
                  onClose={() => setPassError("")}
                />
              </div>
            )}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <Input
                label="Kata Sandi Saat Ini"
                type="password"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                placeholder="Masukkan kata sandi saat ini"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Kata Sandi Baru"
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="8+ karakter, huruf besar/kecil, angka, simbol"
                />
                <Input
                  label="Konfirmasi Kata Sandi Baru"
                  type="password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                />
              </div>
              <p className="text-xs text-[var(--text-subtle)]">
                Setelah kata sandi berganti, Anda akan diminta masuk kembali.
              </p>
              <div className="flex justify-end">
                <Button type="submit" variant="outline" disabled={changingPass}>
                  {changingPass ? "Memperbarui…" : "Perbarui Kata Sandi"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
