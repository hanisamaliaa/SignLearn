import { useState } from "react";
import { useApp } from "../../context/app";
import { Card, Button, Input, Alert } from "../../components/ui/ui";
import { CheckCircleIcon } from "../../components/ui/Icons";
import { changePassword } from "../../services/authService";
import {
  SignLearnAvatar,
  SIGNLEARN_AVATARS,
  resolveAvatarId,
} from "../../components/common/SignLearnAvatar";

const PROFILE_OPTIONS = [
  { id: "parent", label: "Orang Tua", emoji: "👨‍👩‍👧" },
  { id: "deaf", label: "Tunarungu", emoji: "🤟" },
  { id: "general", label: "Pelajar Umum", emoji: "📚" },
];

export default function Profile() {
  const { currentUser, updateProfile, courses, quizHistory, stats } = useApp();

  const activeCourses = (courses ?? []).filter(
    (course) => !course.isLocked && (course.completedLessons ?? 0) < (course.totalLessons ?? 0),
  ).length;
  const completedLessons = (courses ?? []).reduce(
    (total, course) => total + (course.completedLessons ?? 0),
    0,
  );
  const averageQuiz = (quizHistory ?? []).length
    ? Math.round((quizHistory ?? []).reduce((total, quiz) => total + (quiz.score ?? 0), 0) / quizHistory.length)
    : 0;
  const joinedDate = currentUser?.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  const accountInfo = [
    { label: "Peran", value: "Pengguna" },
    { label: "Bergabung", value: joinedDate },
    { label: "Status", value: currentUser?.status === "inactive" ? "Tidak aktif" : "Aktif" },
  ];

  const statsItems = [
    { label: "Kursus Aktif", value: String(activeCourses) },
    { label: "Pelajaran Selesai", value: String(completedLessons) },
    { label: "Rata-rata Kuis", value: `${averageQuiz}%` },
    { label: "Streak Terpanjang", value: `${stats?.streakDays ?? 0} hari` },
  ];

  const [name, setName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [phone, setPhone] = useState(currentUser?.profile?.phone || "");
  const [profile, setProfile] = useState(
    currentUser?.profileType || "general",
  );
  const [avatar, setAvatar] = useState(
    resolveAvatarId(currentUser?.profile?.avatar),
  );
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passError, setPassError] = useState("");
  const [saveError, setSaveError] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");

    const result = await updateProfile({
      name,
      email,
      profileType: profile,
      profile: {
        phone,
        avatar,
      },
    });

    if (result.success) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } else {
      setSaveError(result.message || "Perubahan profil gagal disimpan.");
    }

    setSaving(false);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPassError("");

    if (!currentPass) {
      setPassError("Masukkan kata sandi saat ini.");
      return;
    }
    if (newPass.length < 6) {
      setPassError("Kata sandi baru minimal 6 karakter.");
      return;
    }
    if (newPass !== confirmPass) {
      setPassError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setSaving(true);
    try {
      const result = await changePassword(currentPass, newPass);
      if (!result.success) {
        setPassError(result.message || "Kata sandi gagal diubah.");
        return;
      }

      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

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

      {saved && (
        <Alert
          type="success"
          message="Perubahan berhasil disimpan! Informasi Anda telah diperbarui."
          onClose={() => setSaved(false)}
        />
      )}
      {saveError && (
        <Alert
          type="danger"
          message={saveError}
          onClose={() => setSaveError("")}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-4">
          <Card className="overflow-hidden border-[#d4e0e7] text-center">
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

          <Card className="border-[#d4e0e7]">
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
                  <span className="font-bold text-[var(--text)]">
                    {info.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-[#d4e0e7]">
            <h3 className="mb-4 text-sm font-extrabold text-[var(--text)]">
              Statistik Belajar
            </h3>
            <div className="space-y-3">
              {statsItems.map((stat) => (
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
        </div>

        {/* Right column */}
        <div className="space-y-5 lg:col-span-2">
          <Card className="border-[#d4e0e7]">
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
                  <Input
                    label="Alamat Email"
                    type="email"
                    value={email}
                    readOnly
                    aria-describedby="email-readonly-note"
                    placeholder="email@contoh.com"
                  />
                  <p id="email-readonly-note" className="mt-1 text-xs text-[var(--text-subtle)]">
                    Email akun dikelola dari sisi keamanan akun.
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
                  Profil belajar bukan peran sistem — hanya membantu personalisasi pengalaman belajar Anda.
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

          <Card className="border-[#d4e0e7]">
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
                  placeholder="Minimal 6 karakter"
                />
                <Input
                  label="Konfirmasi Kata Sandi Baru"
                  type="password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="outline" disabled={saving}>
                  Perbarui Kata Sandi
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
