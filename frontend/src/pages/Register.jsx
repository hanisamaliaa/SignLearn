import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/app";
import { Button, Input, Alert } from "../components/ui/ui";
import { CheckIcon, EyeIcon, EyeOffIcon } from "../components/ui/Icons";

const PROFILES = [
  {
    id: "parent",
    title: "Orang Tua dengan Anak Tunarungu",
    desc: "Saya ingin belajar BISINDO untuk berkomunikasi dengan anak saya.",
    emoji: "👨‍👩‍👧",
  },
  {
    id: "deaf",
    title: "Penyandang Tunarungu/Gangguan Pendengaran",
    desc: "Saya ingin meningkatkan kemampuan komunikasi BISINDO saya.",
    emoji: "🤟",
  },
  {
    id: "general",
    title: "Pelajar Umum",
    desc: "Saya ingin belajar BISINDO untuk keperluan sosial atau profesional.",
    emoji: "📚",
  },
];

const BENEFITS = [
  "Akses ke seluruh kursus gratis",
  "Video berkualitas tinggi",
  "Kuis interaktif di setiap pelajaran",
  "Pantau progres belajar Anda",
];

export default function Register() {
  const { register } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [profile, setProfile] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleStep1(e) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Nama lengkap wajib diisi.");
      return;
    }
    if (!email.includes("@")) {
      setError("Format email tidak valid.");
      return;
    }
    if (password.length < 6) {
      setError("Kata sandi minimal 6 karakter.");
      return;
    }
    if (password !== confirmPass) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setStep(2);
  }

  async function handleSubmit() {
    if (!profile) {
      setError("Pilih profil belajar Anda.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));

    const ok = await register({ name, email, password, profile });
    if (!ok) {
      setError("Email sudah terdaftar. Silakan gunakan email lain.");
      setLoading(false);
      return;
    }
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--surface-2)] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center animate-scale-in">
          <div className="w-20 h-20 bg-[var(--success-light)] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckIcon size={36} className="text-[#2ECC71]" />
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--text)] mb-3">
            Pendaftaran Berhasil! 🎉
          </h1>
          <p className="text-[var(--text-muted)] mb-6">
            Akun Anda telah berhasil dibuat. Selamat datang di SignLearn!
          </p>
          <div className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--border)] mb-6 text-left">
            <p className="text-sm text-[var(--text-muted)]">
              Kami telah mengirimkan tautan verifikasi ke{" "}
              <strong className="text-[var(--text)]">{email}</strong>. Periksa
              kotak masuk Anda untuk menyelesaikan pendaftaran.
            </p>
          </div>
          <Button fullWidth onClick={() => navigate("/login")}>
            Lanjut ke Halaman Masuk
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-2)] flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#4F8EF7] to-[#6C63FF] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 30%, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative text-center text-white">
          <div className="text-7xl mb-6">🌟</div>
          <h2 className="text-3xl font-extrabold mb-4">
            Bergabunglah dengan SignLearn
          </h2>
          <p className="text-white/80 text-lg max-w-sm leading-relaxed">
            Mulai perjalanan belajar BISINDO Anda hari ini dan jadilah bagian
            dari komunitas inklusif kami.
          </p>
          <div className="mt-10 space-y-3">
            {BENEFITS.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 bg-[var(--surface)]/10 px-4 py-2.5 rounded-xl"
              >
                <CheckIcon size={16} />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md py-8 animate-fade-in">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 bg-[#4F8EF7] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <span className="text-xl font-bold text-[var(--text)]">
              SignLearn
            </span>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-3 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    step >= s
                      ? "bg-[#4F8EF7] text-white"
                      : "bg-[var(--surface-3)] text-[var(--text-subtle)]"
                  }`}
                >
                  {step > s ? <CheckIcon size={14} /> : s}
                </div>
                <span
                  className={`text-sm font-medium ${step >= s ? "text-[var(--text)]" : "text-[var(--text-subtle)]"}`}
                >
                  {s === 1 ? "Informasi Akun" : "Profil Belajar"}
                </span>
                {s < 2 && (
                  <div
                    className={`flex-1 h-0.5 w-8 ${step > s ? "bg-[#4F8EF7]" : "bg-[#E2E8F0]"}`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="bg-[var(--surface)] rounded-3xl p-8 shadow-sm border border-[var(--border)]">
            {step === 1 ? (
              <>
                <h1 className="text-2xl font-extrabold text-[var(--text)] mb-1">
                  Buat Akun Baru
                </h1>
                <p className="text-sm text-[var(--text-muted)] mb-6">
                  Sudah punya akun?{" "}
                  <button
                    onClick={() => navigate("/login")}
                    className="text-[var(--primary)] font-medium hover:underline"
                  >
                    Masuk di sini
                  </button>
                </p>

                {error && (
                  <div className="mb-4">
                    <Alert
                      type="danger"
                      message={error}
                      onClose={() => setError("")}
                    />
                  </div>
                )}

                <form onSubmit={handleStep1} className="space-y-4">
                  <Input
                    label="Nama Lengkap"
                    placeholder="Masukkan nama lengkap"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <Input
                    label="Alamat Email"
                    type="email"
                    placeholder="contoh@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    label="Kata Sandi"
                    type={showPass ? "text" : "password"}
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="text-[var(--text-subtle)]"
                      >
                        {showPass ? (
                          <EyeOffIcon size={16} />
                        ) : (
                          <EyeIcon size={16} />
                        )}
                      </button>
                    }
                  />
                  <Input
                    label="Konfirmasi Kata Sandi"
                    type="password"
                    placeholder="Ulangi kata sandi"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                  />
                  <Button type="submit" fullWidth size="lg">
                    Lanjut ke Profil Belajar
                  </Button>
                </form>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-extrabold text-[var(--text)] mb-1">
                  Pilih Profil Belajar
                </h1>
                <p className="text-sm text-[var(--text-muted)] mb-6">
                  Profil ini membantu kami menyesuaikan pengalaman belajar Anda.
                  Ini bukan peran sistem.
                </p>

                {error && (
                  <div className="mb-4">
                    <Alert
                      type="danger"
                      message={error}
                      onClose={() => setError("")}
                    />
                  </div>
                )}

                <div className="space-y-3 mb-6">
                  {PROFILES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setProfile(p.id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-150 ${
                        profile === p.id
                          ? "border-[#4F8EF7] bg-[var(--primary-light)]"
                          : "border-[var(--border)] hover:border-[#4F8EF7]/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{p.emoji}</span>
                        <div className="flex-1">
                          <p
                            className={`font-semibold text-sm ${
                              profile === p.id
                                ? "text-[var(--primary)]"
                                : "text-[var(--text)]"
                            }`}
                          >
                            {p.title}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            {p.desc}
                          </p>
                        </div>
                        {profile === p.id && (
                          <div className="w-5 h-5 bg-[#4F8EF7] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckIcon size={12} className="text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep(1);
                      setError("");
                    }}
                    className="flex-1"
                  >
                    Kembali
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? "Mendaftar..." : "Buat Akun"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
