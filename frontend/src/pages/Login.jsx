import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/app";
import { Button, Input, Alert } from "../components/ui/ui";
import { EyeIcon, EyeOffIcon } from "../components/ui/Icons";

const STATS = [
  { value: "2.4K+", label: "Pelajar" },
  { value: "38", label: "Pelajaran" },
  { value: "8", label: "Kursus" },
];

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));

    const result = await login(email, password);
    if (!result.success) setError(result.message);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[var(--surface-2)] flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#4F8EF7] to-[#3A7DE0] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 30%, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative text-center text-white">
          <div className="text-7xl mb-6">🤟</div>
          <h2 className="text-3xl font-extrabold mb-4">
            Selamat Datang Kembali!
          </h2>
          <p className="text-white/80 text-lg max-w-sm leading-relaxed">
            Lanjutkan perjalanan belajar BISINDO Anda. Setiap pelajaran adalah
            langkah menuju komunikasi yang lebih inklusif.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="bg-[var(--surface)]/10 rounded-2xl p-4"
              >
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-white/70 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-9 h-9 bg-[#4F8EF7] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <span className="text-xl font-bold text-[var(--text)]">
              SignLearn
            </span>
          </div>

          <div className="bg-[var(--surface)] rounded-3xl p-8 shadow-sm border border-[var(--border)]">
            <h1 className="text-2xl font-extrabold text-[var(--text)] mb-1">
              Masuk ke Akun Anda
            </h1>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Belum punya akun?{" "}
              <button
                onClick={() => navigate("/register")}
                className="text-[var(--primary)] font-medium hover:underline"
              >
                Daftar di sini
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Alamat Email"
                type="email"
                placeholder="contoh@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <Input
                label="Kata Sandi"
                type={showPass ? "text" : "password"}
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="text-[var(--text-subtle)] hover:text-[var(--text-muted)]"
                  >
                    {showPass ? (
                      <EyeOffIcon size={16} />
                    ) : (
                      <EyeIcon size={16} />
                    )}
                  </button>
                }
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-sm text-[var(--primary)] hover:underline font-medium"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <Button type="submit" fullWidth size="lg" disabled={loading}>
                {loading ? (
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
                    Memuat...
                  </span>
                ) : (
                  "Masuk"
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
              <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
                🔑 Akun Demo
              </p>
              <div className="space-y-1 text-xs text-[var(--text-muted)]">
                <p>
                  <span className="font-medium">Pengguna:</span>{" "}
                  budi@example.com / password
                </p>
                <p>
                  <span className="font-medium">Admin:</span> admin@signlearn.id
                  / admin123
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-[var(--text-subtle)] mt-6">
            Dengan masuk, Anda menyetujui{" "}
            <span className="text-[var(--primary)] cursor-pointer hover:underline">
              Syarat Layanan
            </span>{" "}
            dan{" "}
            <span className="text-[var(--primary)] cursor-pointer hover:underline">
              Kebijakan Privasi
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
