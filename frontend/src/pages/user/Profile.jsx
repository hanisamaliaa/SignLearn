import { useEffect, useState } from "react";
import { useApp } from "../../context/app";
import { Card, Button, Input, Alert, AnimatedCounter, FloatingShapes } from "../../components/ui/ui";
import { CheckCircleIcon } from "../../components/ui/Icons";
import {
  SignLearnAvatar,
  SIGNLEARN_AVATARS,
  resolveAvatarId,
} from "../../components/common/SignLearnAvatar";
import * as authService from "../../services/authService";
import { normalizeError } from "../../services/api";
import {
  IMAGE_UPLOAD_ACCEPT,
  validateImageFile,
} from "../../features/media/imageUpload";

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
  const { currentUser, updateProfile, uploadProfileAvatar, logout, stats } = useApp();

  const [name, setName] = useState(currentUser?.name || "");
  const [email] = useState(currentUser?.email || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [profile, setProfile] = useState(currentUser?.profileType || "general");
  const [avatar, setAvatar] = useState(resolveAvatarId(currentUser?.avatar));
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const [saved, setSaved] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [passError, setPassError] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  useEffect(
    () => () => {
      if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    },
    [avatarPreview],
  );

  function flash(message) {
    setSaved(message);
    window.setTimeout(() => setSaved(""), 3500);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");

    const outcome = await updateProfile({
      name: name.trim(),
      phone: phone.trim() || null,
      avatar,
      profileType: profile,
    });

    if (!outcome?.success) {
      setSaving(false);
      setSaveError(outcome?.message || "Gagal menyimpan perubahan.");
      return;
    }

    if (avatarFile) {
      const upload = await uploadProfileAvatar(avatarFile);
      if (!upload?.success) {
        setSaving(false);
        setSaveError(
          `Informasi profil tersimpan, tetapi foto gagal diunggah: ${upload?.message || "Coba lagi."}`,
        );
        return;
      }
      setAvatar(resolveAvatarId(upload.user?.avatar));
      setAvatarFile(null);
      setAvatarPreview("");
    }

    setSaving(false);
    flash("Perubahan berhasil disimpan! Informasi Anda telah diperbarui.");
  }

  function handleAvatarFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      validateImageFile(file);
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setSaveError("");
    } catch (error) {
      setAvatarFile(null);
      setSaveError(error.message);
    } finally {
      event.target.value = "";
    }
  }

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

      window.setTimeout(() => logout(), 1500);
    } catch (error) {
      const failure = normalizeError(error);
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

  const learningStats = stats
    ? [
        { label: "Kursus Dimulai", value: stats.coursesStarted ?? 0 },
        {
          label: "Pelajaran Selesai",
          value: `${stats.lessonsCompleted ?? 0} / ${stats.totalLessons ?? 0}`,
        },
        { label: "Kuis Lulus", value: stats.quizzesPassed ?? 0 },
        { label: "Progres Keseluruhan", value: stats.overallPercent ?? 0, suffix: "%" },
        { label: "Streak", value: stats.streakDays ?? 0, suffix: " hari" },
      ]
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <FloatingShapes count={3} />

      <header>
        <p className="mb-1 text-sm font-bold text-[#2e86bf]">AKUN SAYA</p>
        <h1 className="text-2xl font-extrabold text-[var(--text)]">
          Profil Saya
        </h1>
        <p className="mt-1 text-[var(--text-muted)]">
          Kelola informasi dan pengaturan akun kamu
        </p>
      </header>

      {saved && <Alert type="success" message={saved} onClose={() => setSaved("")} />}
      {saveError && (
        <Alert type="danger" message={saveError} onClose={() => setSaveError("")} />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-4">
          <Card interactive className="overflow-hidden border-[#d4e0e7] text-center profile-avatar-card">
            <div className="rounded-2xl bg-[#fff8df] p-5">
              <SignLearnAvatar id={avatarPreview || avatar} size="xl" className="mx-auto" />
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
                      {stat.suffix !== undefined ? (
                        <><AnimatedCounter value={stat.value} />{stat.suffix}</>
                      ) : typeof stat.value === "number" ? (
                        <AnimatedCounter value={stat.value} />
                      ) : (
                        stat.value
                      )}
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
                <label className="mb-4 block rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--text)]">
                  <span className="mb-2 block font-bold">Unggah foto sendiri</span>
                  <input
                    type="file"
                    accept={IMAGE_UPLOAD_ACCEPT}
                    onChange={handleAvatarFile}
                    className="block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[#2e86bf] file:px-3 file:py-2 file:font-bold file:text-white"
                  />
                  <span className="mt-2 block text-xs text-[var(--text-subtle)]">
                    JPEG, PNG, atau WebP maksimal 5 MB. Foto disimpan di Cloudinary.
                  </span>
                </label>
                <div
                  className="grid grid-cols-3 gap-3"
                  role="radiogroup"
                  aria-label="Pilih avatar profil"
                >
                  {SIGNLEARN_AVATARS.map((item) => {
                    const selected = !avatarFile && avatar === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => {
                          setAvatar(item.id);
                          setAvatarFile(null);
                          setAvatarPreview("");
                        }}
                        className={`profile-avatar-option min-h-36 rounded-2xl border-2 p-3 text-center transition-all focus-visible:outline-4 ${
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
                      className={`profile-type-btn min-h-20 rounded-xl border-2 p-3 text-center transition-all ${
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
                  pengalaman belajar kamu.
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
                Setelah kata sandi berganti, kamu akan diminta masuk kembali.
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
