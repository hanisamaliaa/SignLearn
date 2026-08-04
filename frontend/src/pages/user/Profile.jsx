import { useState } from "react";
import { useApp } from "../../context/app";
import { Card, Button, Input, Alert } from "../../components/ui/ui";
import { CameraIcon, CheckCircleIcon } from "../../components/ui/Icons";

const PROFILE_LABELS = {
  parent: "Orang Tua dengan Anak Tunarungu",
  deaf: "Penyandang Tunarungu/Gangguan Pendengaran",
  general: "Pelajar Umum",
};

const PROFILE_OPTIONS = [
  { id: "parent", label: "Orang Tua", emoji: "👨‍👩‍👧" },
  { id: "deaf", label: "Tunarungu", emoji: "🤟" },
  { id: "general", label: "Pelajar Umum", emoji: "📚" },
];

const ACCOUNT_INFO = [
  { label: "Peran", value: "Pengguna" },
  { label: "Bergabung", value: "2025-01-15" },
  { label: "Status", value: "Aktif" },
];

const STATS = [
  { label: "Kursus Aktif", value: "3" },
  { label: "Pelajaran Selesai", value: "6" },
  { label: "Rata-rata Kuis", value: "82%" },
  { label: "Streak Terpanjang", value: "7 hari" },
];

export default function Profile() {
  const { currentUser, updateProfile } = useApp();

  const [name, setName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [phone, setPhone] = useState(currentUser?.profile?.phone || "");
  const [profile, setProfile] = useState(currentUser?.profileType || "general");
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passError, setPassError] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));

    // Persist the edited profile into context + localStorage so it survives
    // logout/refresh and login again.
    updateProfile({
      name,
      email,
      profileType: profile,
      profile: {
        phone,
        avatar: name.slice(0, 2).toUpperCase(),
      },
    });

    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
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
    await new Promise((r) => setTimeout(r, 700));
    setCurrentPass("");
    setNewPass("");
    setConfirmPass("");
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--text)]">
          Profil Saya
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Kelola informasi dan pengaturan akun Anda
        </p>
      </div>

      {saved && (
        <Alert
          type="success"
          message="Perubahan berhasil disimpan! Informasi Anda telah diperbarui."
          onClose={() => setSaved(false)}
        />
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          <Card className="text-center">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 bg-gradient-to-br from-[#4F8EF7] to-[#6C63FF] rounded-full flex items-center justify-center text-white text-3xl font-extrabold mx-auto">
                {currentUser?.profile?.avatar ||
                  currentUser?.name?.slice(0, 2).toUpperCase() ||
                  "U"}
              </div>
              <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-[var(--surface)] border-2 border-[var(--border)] rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors shadow-sm">
                <CameraIcon size={14} />
              </button>
            </div>
            <h2 className="font-bold text-[var(--text)] text-lg">
              {currentUser?.name}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              {currentUser?.email}
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 bg-[var(--primary-light)] text-[var(--primary)] px-3 py-1 rounded-full text-xs font-medium">
              {PROFILE_LABELS[currentUser?.profileType || "general"]}
            </div>
          </Card>

          <Card>
            <h3 className="font-bold text-[var(--text)] mb-4 text-sm">
              Informasi Akun
            </h3>
            <div className="space-y-3">
              {ACCOUNT_INFO.map((info) => (
                <div
                  key={info.label}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-[var(--text-muted)]">{info.label}</span>
                  <span className="font-medium text-[var(--text)]">
                    {info.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-bold text-[var(--text)] mb-4 text-sm">
              Statistik Belajar
            </h3>
            <div className="space-y-3">
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-[var(--text-muted)]">{s.label}</span>
                  <span className="font-bold text-[var(--primary)]">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <h2 className="text-lg font-bold text-[var(--text)] mb-5">
              Informasi Pribadi
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Nama Lengkap"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap Anda"
                />
                <Input
                  label="Alamat Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@contoh.com"
                />
              </div>
              <Input
                label="Nomor Telepon"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text)]">
                  Profil Belajar
                </label>
                <div className="grid sm:grid-cols-3 gap-3">
                  {PROFILE_OPTIONS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProfile(p.id)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        profile === p.id
                          ? "border-[#4F8EF7] bg-[var(--primary-light)]"
                          : "border-[var(--border)] hover:border-[#4F8EF7]/40"
                      }`}
                    >
                      <div className="text-xl mb-1">{p.emoji}</div>
                      <p
                        className={`text-xs font-medium ${
                          profile === p.id
                            ? "text-[var(--primary)]"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        {p.label}
                      </p>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-subtle)]">
                  Profil belajar bukan peran sistem — hanya membantu
                  personalisasi pengalaman belajar Anda.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Menyimpan...
                    </span>
                  ) : (
                    <>
                      <CheckCircleIcon size={16} /> Simpan Perubahan
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-[var(--text)] mb-5">
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
              <div className="grid sm:grid-cols-2 gap-4">
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
