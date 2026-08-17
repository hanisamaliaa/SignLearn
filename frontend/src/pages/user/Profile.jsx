import { useRef, useState } from "react";
import { useApp } from "../../context/app";
import { Card, Button, Input, Alert, AnimatedCounter } from "../../components/ui/ui";
import {
  CameraIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  LockIcon,
  UserIcon,
} from "../../components/ui/Icons";
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

function ProfileRow({ icon, title, description, onClick, active, disabled, trailing }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={active}
      className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-150 ${
        active
          ? "border-[#2e86bf] bg-[#f5fbff] shadow-sm"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[#b8d7e9] hover:bg-[#fbfdff]"
      } ${disabled ? "cursor-default opacity-75" : "cursor-pointer"}`}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
          active ? "bg-[#e4f4fc] text-[#2e86bf]" : "bg-[#f4f7fa] text-[#61758f]"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-[var(--text)]">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </span>
      </span>
      {trailing || <ChevronRightIcon size={19} className="shrink-0 text-[var(--text-subtle)]" />}
    </button>
  );
}

export default function Profile() {
  const { currentUser, updateProfile, uploadProfileAvatar, logout, stats } = useApp();
  const fileInputRef = useRef(null);
  const persistedAvatar = currentUser?.avatar ?? currentUser?.profile?.avatar;
  const persistedPhoto =
    typeof persistedAvatar === "string" && /^https:\/\//i.test(persistedAvatar)
      ? persistedAvatar
      : null;

  const [name, setName] = useState(currentUser?.name || "");
  const [email] = useState(currentUser?.email || "");
  const [phone, setPhone] = useState(currentUser?.phone ?? currentUser?.profile?.phone ?? "");
  const [profile, setProfile] = useState(currentUser?.profileType || "general");
  const [avatar, setAvatar] = useState(
    persistedPhoto ? "luna" : resolveAvatarId(persistedAvatar),
  );
  const [profilePhoto, setProfilePhoto] = useState(persistedPhoto);

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const [openSection, setOpenSection] = useState("");
  const [saved, setSaved] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
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

    const outcome = await updateProfile({
      name: name.trim(),
      phone: phone.trim() || null,
      ...(profilePhoto ? {} : { avatar }),
      profileType: profile,
    });

    if (!outcome?.success) {
      setSaving(false);
      setSaveError(outcome?.message || "Gagal menyimpan perubahan.");
      return;
    }

    setSaving(false);
    flash("Perubahan berhasil disimpan! Informasi Anda telah diperbarui.");
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPhotoError("");
    try {
      validateImageFile(file);
    } catch (error) {
      setPhotoError(error.message);
      return;
    }

    setUploadingPhoto(true);
    try {
      const outcome = await uploadProfileAvatar(file);
      if (!outcome?.success) {
        setPhotoError(outcome?.message || "Foto belum dapat diunggah.");
        return;
      }
      const uploadedUrl = outcome.user?.avatar;
      if (typeof uploadedUrl !== "string" || !/^https:\/\//i.test(uploadedUrl)) {
        setPhotoError("Provider media tidak mengembalikan URL foto yang valid.");
        return;
      }
      setProfilePhoto(uploadedUrl);
      flash("Foto profil berhasil diperbarui.");
    } catch (error) {
      setPhotoError(error.message || "Foto belum dapat diunggah.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleRemovePhoto() {
    setPhotoError("");
    setUploadingPhoto(true);
    const outcome = await updateProfile({ avatar });
    setUploadingPhoto(false);
    if (!outcome?.success) {
      setPhotoError(outcome?.message || "Foto belum dapat dihapus.");
      return;
    }
    setProfilePhoto(null);
    flash("Foto profil dihapus. Avatar menjadi pilihan profil kamu.");
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

  const profileIncomplete = !phone.trim();
  const activeAvatar = resolveAvatarId(avatar);

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <p className="mb-1 text-sm font-bold text-[#2e86bf]">AKUN SAYA</p>
        <h1 className="text-2xl font-extrabold text-[var(--text)]">Profil Saya</h1>
        <p className="mt-1 text-[var(--text-muted)]">
          Kelola informasi dan pengaturan akun kamu
        </p>
      </header>

      {saved && <Alert type="success" message={saved} onClose={() => setSaved("")} />}
      {saveError && (
        <Alert type="danger" message={saveError} onClose={() => setSaveError("")} />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ProfileRow
            icon={<UserIcon size={22} />}
            title="Informasi Pribadi"
            description="Nama lengkap, alamat email, dan informasi akun"
            active={openSection === "personal"}
            onClick={() => setOpenSection((value) => (value === "personal" ? "" : "personal"))}
          />

          {openSection === "personal" && (
            <Card className="border-[#d4e0e7]">
              <form onSubmit={handleSave} className="space-y-5">
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
                    <p id="email-readonly-note" className="mt-1 text-xs text-[var(--text-subtle)]">
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
                        <div className="mb-1 text-xl" aria-hidden="true">{item.emoji}</div>
                        <p className={`text-xs font-bold ${profile === item.id ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}`}>
                          {item.label}
                        </p>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-subtle)]">
                    Profil belajar bukan peran sistem — hanya membantu personalisasi pengalaman belajar kamu.
                  </p>
                </div>

                <div className="flex justify-end border-t border-[var(--border-light)] pt-4">
                  <Button type="submit" disabled={saving} size="lg">
                    {saving ? "Menyimpan..." : <><CheckCircleIcon size={16} /> Simpan Perubahan</>}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <ProfileRow
            icon={<LockIcon size={22} />}
            title="Ubah Kata Sandi"
            description="Perbarui kata sandi untuk menjaga keamanan akun kamu"
            active={openSection === "password"}
            onClick={() => setOpenSection((value) => (value === "password" ? "" : "password"))}
          />

          {openSection === "password" && (
            <Card className="border-[#d4e0e7]">
              {passError && (
                <div className="mb-4">
                  <Alert type="danger" message={passError} onClose={() => setPassError("")} />
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
          )}

          <ProfileRow
            icon={<CameraIcon size={22} />}
            title="Foto Profil"
            description={profilePhoto ? "Foto profil kamu sudah digunakan" : "Upload foto profil kamu"}
            active={openSection === "photo"}
            onClick={() => setOpenSection((value) => (value === "photo" ? "" : "photo"))}
          />

          {openSection === "photo" && (
            <Card className="border-[#d4e0e7]">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex justify-center sm:justify-start">
                  <SignLearnAvatar
                    id={activeAvatar}
                    photo={profilePhoto}
                    size="xl"
                    className="border-4 border-white shadow-md"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-extrabold text-[var(--text)]">Foto Profil</h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Upload foto profil untuk digunakan di halaman SignLearn Kids.
                  </p>
                  {photoError && <p className="mt-2 text-xs font-semibold text-[var(--danger)]">{photoError}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={uploadingPhoto}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingPhoto ? "Memproses..." : "Upload Foto"}
                    </Button>
                    {profilePhoto && (
                      <Button type="button" variant="outline" size="sm" disabled={uploadingPhoto} onClick={handleRemovePhoto}>
                        Hapus Foto
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={IMAGE_UPLOAD_ACCEPT}
                    className="sr-only"
                    onChange={handlePhotoChange}
                  />
                </div>
              </div>
            </Card>
          )}

          <ProfileRow
            icon={<span className="text-xl" aria-hidden="true">🎨</span>}
            title="Avatar (Opsional)"
            description={profilePhoto ? "Hapus foto profil jika ingin menggunakan avatar" : "Pilih avatar jika kamu tidak ingin menggunakan foto"}
            active={openSection === "avatar"}
            disabled={Boolean(profilePhoto)}
            onClick={() => {
              if (!profilePhoto) {
                setOpenSection((value) => (value === "avatar" ? "" : "avatar"));
              }
            }}
          />

          {openSection === "avatar" && !profilePhoto && (
            <Card className="border-[#d4e0e7]">
              <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Pilih avatar profil">
                {SIGNLEARN_AVATARS.map((item) => {
                  const selected = avatar === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setAvatar(item.id)}
                      className={`min-h-32 rounded-2xl border-2 p-3 text-center transition-all focus-visible:outline-4 ${
                        selected
                          ? "border-[#2e86bf] bg-[#eef8fd] shadow-sm"
                          : "border-[var(--border)] bg-[var(--surface)] hover:border-[#9cc8e2]"
                      }`}
                    >
                      <SignLearnAvatar id={item.id} size="lg" className="mx-auto" />
                      <span className="mt-2 block text-sm font-extrabold text-[var(--text)]">{item.name}</span>
                      <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{item.role}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 flex justify-end border-t border-[var(--border-light)] pt-4">
                <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="border-[#cfe0f0] bg-gradient-to-b from-[#eef7ff] to-[var(--surface)] text-center">
            <div className="flex justify-center">
              <SignLearnAvatar
                id={activeAvatar}
                photo={profilePhoto}
                size="xl"
                className="border-4 border-white shadow-md"
              />
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-[var(--text)]">{currentUser?.name}</h2>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">{currentUser?.email}</p>
            <span className="mt-3 inline-flex rounded-full bg-[#e5f1ff] px-3 py-1 text-xs font-bold text-[#2e86bf]">
              {PROFILE_OPTIONS.find((item) => item.id === profile)?.label || "Pelajar Umum"}
            </span>

            <div className="mt-6 grid grid-cols-2 border-t border-[#dce8f2] pt-5 text-left">
              <div className="pr-4">
                <p className="text-xs text-[var(--text-muted)]">Kursus Aktif</p>
                <p className="mt-1 text-xl font-extrabold text-[var(--text)]">{stats?.coursesStarted ?? 0}</p>
              </div>
              <div className="border-l border-[#dce8f2] pl-4">
                <p className="text-xs text-[var(--text-muted)]">Streak Belajar</p>
                <p className="mt-1 text-xl font-extrabold text-[var(--text)]">{stats?.streakDays ?? 0} hari</p>
              </div>
            </div>
          </Card>

          {profileIncomplete && (
            <Card className="border-[#f2dfae] bg-[#fffaf0]">
              <div className="flex gap-3">
                <span className="text-xl" aria-hidden="true">⚠️</span>
                <div>
                  <h3 className="text-sm font-extrabold text-[var(--text)]">Profil belum lengkap</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                    Tambahkan nomor telepon kamu agar profil lebih aman dan lengkap.
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpenSection("personal")}
                    className="mt-3 text-sm font-extrabold text-[#2e86bf] hover:underline"
                  >
                    Lengkapi Sekarang
                  </button>
                </div>
              </div>
            </Card>
          )}

          <Card className="border-[#d4e0e7]">
            <h3 className="mb-4 text-sm font-extrabold text-[var(--text)]">Informasi Akun</h3>
            <div className="space-y-3">
              {accountInfo.map((info) => (
                <div key={info.label} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-[var(--text-muted)]">{info.label}</span>
                  <span className="font-bold text-[var(--text)]">{info.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {learningStats && (
            <Card className="border-[#d4e0e7]">
              <h3 className="mb-4 text-sm font-extrabold text-[var(--text)]">Statistik Belajar</h3>
              <div className="space-y-3">
                {learningStats.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between gap-4 text-sm">
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
      </div>
    </div>
  );
}
