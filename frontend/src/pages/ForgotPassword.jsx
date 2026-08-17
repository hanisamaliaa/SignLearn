import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as authService from "../services/authService";
import { Button, Input, Alert } from "../components/ui/ui";
import { ArrowLeftIcon, CheckCircleIcon } from "../components/ui/Icons";
import BrandLogo from "../components/common/BrandLogo";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");

  /**
   * Meminta tautan reset.
   *
   * Sebelumnya fungsi ini hanya menunggu 800ms lalu menyatakan "email
   * terkirim" — tanpa memanggil API sama sekali. Siapa pun yang lupa kata
   * sandinya akan menunggu email yang tidak pernah dikirim oleh siapa pun.
   *
   * Respons server SENGAJA sama untuk email terdaftar maupun tidak, supaya
   * halaman ini tidak dapat dipakai memetakan email mana yang punya akun.
   * Karena itu pesan sukses di bawah tidak pernah menjanjikan bahwa emailnya
   * memang ada.
   */
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.includes("@")) {
      setError("Masukkan alamat email yang valid.");
      return;
    }

    setLoading(true);
    try {
      const payload = await authService.requestPasswordReset(email.trim());
      // Di luar produksi server mengembalikan kodenya langsung, sehingga
      // alurnya dapat diselesaikan dan diuji tanpa kredensial SMTP.
      setDevCode(payload?.devCode ?? "");
      setSent(true);
    } catch (requestError) {
      setError(requestError?.message ?? "Permintaan gagal dikirim. Coba lagi sebentar, ya.");
    } finally {
      setLoading(false);
    }
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

        <BrandLogo className="forgot-password-brand" ariaLabel="SignLearn Kids, kembali ke beranda" />

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
                  "Kirim Kode Reset"
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
              Permintaan Terkirim
            </h1>
            {/* Tidak menyatakan emailnya pasti ada: server sengaja menjawab
                sama untuk email terdaftar maupun tidak, agar halaman ini tidak
                bisa dipakai memetakan akun siapa saja yang terdaftar. */}
            <p className="text-sm text-[var(--text-muted)] mb-2">
              Bila email ini terdaftar, kode reset kata sandi telah dikirim ke:
            </p>
            <p className="font-semibold text-[var(--text)] mb-5">{email}</p>

            {devCode && (
              <div className="mb-6 rounded-xl border border-[#F4B400]/40 bg-[var(--warning-light)] p-4 text-left">
                <p className="text-sm font-semibold text-[var(--text)]">
                  Mode pengembangan
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                  SMTP belum dikonfigurasi, jadi server menampilkan kodenya
                  langsung di sini. Di produksi bagian ini tidak pernah muncul.
                </p>
                <p className="my-3 text-center text-2xl font-extrabold tracking-[0.4em] text-[var(--primary)]">
                  {devCode}
                </p>
                <Link
                  to={`/reset-password?email=${encodeURIComponent(email.trim())}`}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Lanjut masukkan kode
                </Link>
              </div>
            )}

            <div className="bg-[var(--surface-2)] rounded-xl p-4 mb-6 text-left text-sm text-[var(--text-muted)]">
              <p className="font-medium text-[var(--text)] mb-2">
                📌 Langkah selanjutnya:
              </p>
              <ol className="space-y-1 list-decimal list-inside">
                <li>Buka kotak masuk email Anda</li>
                <li>Salin kode 6 angka dari email</li>
                <li>Masukkan kode itu beserta kata sandi baru</li>
                <li>Masuk dengan kata sandi baru</li>
              </ol>
            </div>

            <Button
              variant="secondary"
              fullWidth
              onClick={() => { setSent(false); setDevCode(""); }}
            >
              Kirim Ulang Permintaan
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
