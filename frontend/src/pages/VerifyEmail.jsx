import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AuthBrandPanel, AuthCard, AuthField, AuthStatus, AuthSubmitButton, authEntrance } from "../components/auth/AuthUI";
import { CheckCircleIcon, LockIcon, MailIcon } from "../components/ui/Icons";
import { useApp } from "../context/app";
import { useReducedMotion } from "../hooks/useLandingMotion";
import * as authService from "../services/authService";

const BENEFITS = [
  { label: "Melindungi identitas akun", icon: LockIcon },
  { label: "Memastikan email dapat diakses", icon: MailIcon },
  { label: "Progres tersimpan dengan aman", icon: CheckCircleIcon },
];

export default function VerifyEmail() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { verifyEmail } = useApp();
  const reducedMotion = useReducedMotion();
  const codeRef = useRef(null);
  const [email, setEmail] = useState(state?.email || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(
    state?.email ? `Kode verifikasi telah dikirim ke ${state.email}.` : "",
  );
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(() => {
    const seconds = Number(state?.resendCooldownSeconds);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  });

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function submit(event) {
    event.preventDefault();
    if (loading) return;
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Masukkan alamat email yang valid.");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError("Kode verifikasi harus terdiri dari 6 angka.");
      codeRef.current?.focus();
      return;
    }

    setLoading(true);
    setError("");
    const result = await verifyEmail(normalizedEmail, code);
    if (!result.success) {
      setError(result.message || "Kode belum dapat diverifikasi.");
      setLoading(false);
    }
  }

  async function resend() {
    if (resending || cooldown > 0) return;
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Masukkan alamat email yang valid sebelum meminta kode baru.");
      return;
    }

    setResending(true);
    setError("");
    try {
      const result = await authService.resendEmailVerification(normalizedEmail);
      setCooldown(Number(result?.resendCooldownSeconds) || 60);
      setNotice("Jika akun masih menunggu verifikasi, kode baru telah dikirim.");
    } catch (failure) {
      setError(failure.message || "Kode baru belum dapat dikirim.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="login-page">
      <AuthBrandPanel
        id="verify-email-welcome-title"
        eyebrow="Satu langkah lagi"
        title="Verifikasi Emailmu"
        description="Masukkan kode enam angka dari email agar akun SignLearn siap digunakan."
        benefits={BENEFITS}
      />

      <section className="login-form-panel" aria-labelledby="verify-email-title">
        <AuthCard>
          <motion.header className="login-form-header" {...authEntrance(reducedMotion, 0.08)}>
            <p className="login-eyebrow">Aktivasi akun</p>
            <h2 id="verify-email-title">Masukkan Kode Verifikasi</h2>
            <p>Kode berlaku singkat dan hanya dapat dipakai sekali.</p>
          </motion.header>

          <AuthStatus error={error} onDismiss={() => setError("")} />
          {notice && (
            <div
              className="mt-4 rounded-xl border border-[#a7d9be] bg-[#edf9f2] px-4 py-3 text-sm font-semibold text-[#246b45]"
              role="status"
            >
              {notice}
            </div>
          )}

          <form className="login-form" onSubmit={submit} noValidate>
            <motion.div {...authEntrance(reducedMotion, 0.16)}>
              <AuthField
                id="verify-email-address"
                label="Alamat Email"
                icon={MailIcon}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="contoh@email.com"
              />
            </motion.div>
            <motion.div {...authEntrance(reducedMotion, 0.23)}>
              <AuthField
                inputRef={codeRef}
                id="verify-email-code"
                label="Kode 6 Angka"
                icon={LockIcon}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                placeholder="000000"
              />
            </motion.div>
            <motion.div {...authEntrance(reducedMotion, 0.3)}>
              <AuthSubmitButton type="submit" loading={loading} loadingLabel="Memverifikasi...">
                Verifikasi dan Masuk
              </AuthSubmitButton>
            </motion.div>
          </form>

          <motion.p className="login-register-link" {...authEntrance(reducedMotion, 0.37)}>
            Belum menerima kode?{" "}
            <button type="button" onClick={resend} disabled={resending || cooldown > 0}>
              {resending
                ? "Mengirim..."
                : cooldown > 0
                  ? `Kirim ulang dalam ${cooldown} dtk`
                  : "Kirim ulang"}
            </button>
          </motion.p>
          <motion.p className="login-register-link" {...authEntrance(reducedMotion, 0.44)}>
            Sudah terverifikasi?{" "}
            <button type="button" onClick={() => navigate("/login")}>Masuk di sini</button>
          </motion.p>
        </AuthCard>
      </section>
    </main>
  );
}
