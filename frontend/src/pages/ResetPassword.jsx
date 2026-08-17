import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input, Alert } from "../components/ui/ui";
import { ArrowLeftIcon, CheckCircleIcon, LockIcon, MailIcon } from "../components/ui/Icons";
import BrandLogo from "../components/common/BrandLogo";
import * as authService from "../services/authService";

/**
 * Menyetel kata sandi baru dengan kode dari email.
 *
 * Halaman ini sebelumnya TIDAK ADA. `/forgot-password` menjanjikan langkah
 * lanjutan yang tidak menuju ke mana pun, sehingga alur lupa kata sandi
 * mustahil diselesaikan meski backend-nya sudah lengkap.
 *
 * Email ikut dikirim bersama kode karena server mencarinya per pengguna: kode
 * enam digit yang dicari lewat hash-nya sendiri akan cocok dengan reset milik
 * siapa saja yang sedang aktif.
 *
 * Syarat kata sandi dicerminkan dari `passwordPolicy.js` seperti pada halaman
 * pendaftaran: menampilkannya sambil mengetik jauh lebih baik daripada
 * menolak setelah tombol ditekan. Server tetap pemutus terakhir.
 */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // Email boleh datang dari tautan agar tidak perlu diketik ulang, tetapi
  // tetap dapat disunting: pengguna bisa membuka halaman ini dari perangkat
  // lain, tanpa membawa apa pun di URL.
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const checks = useMemo(() => [
    { id: "length", label: "Minimal 8 karakter", ok: password.length >= 8 },
    { id: "upper", label: "Ada huruf kapital (A-Z)", ok: /[A-Z]/.test(password) },
    { id: "lower", label: "Ada huruf kecil (a-z)", ok: /[a-z]/.test(password) },
    { id: "digit", label: "Ada angka (0-9)", ok: /[0-9]/.test(password) },
    { id: "symbol", label: "Ada simbol (! @ # $ %)", ok: /[^A-Za-z0-9]/.test(password) },
  ], [password]);

  const meetsPolicy = checks.every((c) => c.ok);
  const matches = Boolean(confirmPassword) && password === confirmPassword;

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    setError("");
    if (!email.trim()) {
      setError("Masukkan email yang kamu pakai saat meminta kode.");
      return;
    }
    if (!/^[0-9]{6}$/.test(code.trim())) {
      setError("Kode reset terdiri dari 6 angka.");
      return;
    }
    if (!meetsPolicy) {
      setError("Kata sandi belum memenuhi seluruh syarat di bawah.");
      return;
    }
    if (!matches) {
      setError("Konfirmasi kata sandi belum sama.");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(email.trim(), code.trim(), password);
      setPassword("");
      setConfirmPassword("");
      setDone(true);
    } catch (resetError) {
      setError(
        resetError?.errors?.[0]?.message ??
          resetError?.message ??
          "Kata sandi gagal diubah. Coba minta kode baru.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-2)] p-6">
      <div className="w-full max-w-md animate-fade-in">
        <button
          onClick={() => navigate("/login")}
          className="mb-6 flex min-h-11 items-center gap-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        >
          <ArrowLeftIcon size={16} />
          Kembali ke halaman masuk
        </button>

        <BrandLogo className="forgot-password-brand" ariaLabel="SignLearn Kids, kembali ke beranda" />

        {done ? (
          <div className="animate-scale-in rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success-light)]">
              <CheckCircleIcon size={32} className="text-[#2ECC71]" />
            </div>
            <h1 className="mb-3 text-2xl font-extrabold text-[var(--text)]">
              Kata Sandi Diperbarui
            </h1>
            <p className="mb-6 text-sm leading-relaxed text-[var(--text-muted)]">
              Seluruh sesi lama telah dikeluarkan demi keamanan. Masuk kembali
              dengan kata sandi barumu.
            </p>
            <Button fullWidth onClick={() => navigate("/login")}>
              Masuk sekarang
            </Button>
          </div>
        ) : (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
            <h1 className="mb-2 text-2xl font-extrabold text-[var(--text)]">
              Atur Kata Sandi Baru
            </h1>
            <p className="mb-6 text-sm text-[var(--text-muted)]">
              Masukkan kode 6 angka dari emailmu, lalu pilih kata sandi yang
              belum pernah kamu pakai di tempat lain.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <Alert type="danger" message={error} onClose={() => setError("")} />}

              <Input
                id="reset-email"
                label="Email"
                type="email"
                icon={MailIcon}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="contoh@email.com"
              />

              <Input
                id="reset-code"
                label="Kode dari email"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ""))}
                autoComplete="one-time-code"
                placeholder="6 angka"
              />

              <Input
                id="reset-password"
                label="Kata sandi baru"
                type="password"
                icon={LockIcon}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Kata sandi baru"
              />

              <ul className="space-y-1">
                {checks.map((check) => (
                    <li
                      key={check.id}
                      className={`flex items-center gap-2 text-xs ${
                        check.ok ? "text-[#2ECC71]" : "text-[var(--text-subtle)]"
                      }`}
                    >
                      <span aria-hidden="true">{check.ok ? "✓" : "○"}</span>
                      {check.label}
                    </li>
                  ))}
              </ul>

              <Input
                id="reset-confirm"
                label="Ulangi kata sandi baru"
                  type="password"
                  icon={LockIcon}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                placeholder="Ulangi kata sandi"
                error={confirmPassword && !matches ? "Konfirmasi belum sama." : undefined}
              />

              <Button type="submit" fullWidth disabled={loading}>
                {loading ? "Menyimpan…" : "Simpan kata sandi baru"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
