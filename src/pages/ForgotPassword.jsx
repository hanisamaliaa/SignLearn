import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Alert } from "../components/ui/ui";
import { ArrowLeftIcon, CheckCircleIcon } from "../components/ui/Icons";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.includes("@")) {
      setError("Masukkan alamat email yang valid.");
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[var(--surface-2)] flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-in">
        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-6 transition-colors"
        >
          <ArrowLeftIcon size={16} />
          Kembali ke halaman masuk
        </button>

        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-[#4F8EF7] rounded-xl flex items-center justify-center">
            <span className="text-white font-bold">S</span>
          </div>
          <span className="text-xl font-bold text-[var(--text)]">SignLearn</span>
        </div>

        {!sent ? (
          <div className="bg-[var(--surface)] rounded-3xl p-8 shadow-sm border border-[var(--border)]">
            <div className="w-14 h-14 bg-[var(--primary-light)] rounded-2xl flex items-center justify-center mb-5 text-2xl">
              🔐
            </div>
            <h1 className="text-2xl font-extrabold text-[var(--text)] mb-2">
              Lupa Kata Sandi?
            </h1>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Masukkan alamat email yang terdaftar. Kami akan mengirimkan tautan
              untuk mengatur ulang kata sandi Anda.
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
                label="Alamat Email Terdaftar"
                type="email"
                placeholder="contoh@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
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
                    Mengirim...
                  </span>
                ) : (
                  "Kirim Tautan Reset"
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-[var(--text-muted)] mt-5">
              Ingat kata sandi Anda?{" "}
              <button
                onClick={() => navigate("/login")}
                className="text-[var(--primary)] font-medium hover:underline"
              >
                Masuk
              </button>
            </p>
          </div>
        ) : (
          <div className="bg-[var(--surface)] rounded-3xl p-8 shadow-sm border border-[var(--border)] text-center animate-scale-in">
            <div className="w-16 h-16 bg-[var(--success-light)] rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircleIcon size={32} className="text-[#2ECC71]" />
            </div>
            <h1 className="text-2xl font-extrabold text-[var(--text)] mb-3">
              Email Terkirim!
            </h1>
            <p className="text-sm text-[var(--text-muted)] mb-2">
              Kami telah mengirimkan tautan reset kata sandi ke:
            </p>
            <p className="font-semibold text-[var(--text)] mb-5">{email}</p>

            <div className="bg-[var(--surface-2)] rounded-xl p-4 mb-6 text-left text-sm text-[var(--text-muted)]">
              <p className="font-medium text-[var(--text)] mb-2">
                📌 Langkah selanjutnya:
              </p>
              <ol className="space-y-1 list-decimal list-inside">
                <li>Buka kotak masuk email Anda</li>
                <li>Klik tautan reset kata sandi</li>
                <li>Masukkan kata sandi baru Anda</li>
                <li>Masuk dengan kata sandi baru</li>
              </ol>
            </div>

            <Button
              variant="secondary"
              fullWidth
              onClick={() => setSent(false)}
            >
              Kirim Ulang Email
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onClick={() => navigate("/login")}
              className="mt-2"
            >
              Kembali ke Masuk
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
