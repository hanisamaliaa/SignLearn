import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/app";
import {
  ChartIcon,
  CheckIcon,
  LockIcon,
  MailIcon,
  PlayIcon,
  VideoIcon,
} from "../components/ui/Icons";
import {
  AuthBrandPanel,
  AuthCard,
  AuthField,
  AuthStatus,
  AuthSubmitButton,
  PasswordToggle,
  authEntrance,
} from "../components/auth/AuthUI";
import { useReducedMotion } from "../hooks/useLandingMotion";

const BENEFITS = [
  { label: "Belajar Sambil Bermain", icon: PlayIcon },
  { label: "Video Gerakan BISINDO", icon: VideoIcon },
  { label: "Pantau Progresmu", icon: ChartIcon },
];

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const [email, setEmail] = useState(() => localStorage.getItem("signlearn.rememberedEmail") || "");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(() => Boolean(localStorage.getItem("signlearn.rememberedEmail")));
  const [fieldErrors, setFieldErrors] = useState({});
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next = {};
    const normalizedEmail = email.trim();
    if (!normalizedEmail) next.email = "Alamat email belum diisi.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) next.email = "Format email belum sesuai.";
    if (!password) next.password = "Kata sandi belum diisi.";
    setFieldErrors(next);
    if (next.email) emailRef.current?.focus();
    else if (next.password) passwordRef.current?.focus();
    return Object.keys(next).length === 0;
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setAuthError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await login(email.trim(), password, remember);
      if (!result.success) {
        if (result.code === "EMAIL_NOT_VERIFIED") {
          navigate("/verify-email", { state: { email: email.trim() } });
          return;
        }
        if (result.code === "ACCOUNT_SUSPENDED") {
          setAuthError("Akun ini sedang tidak aktif. Hubungi administrator untuk bantuan.");
          setLoading(false);
          return;
        }
        setAuthError("Email atau kata sandi belum cocok. Coba lagi, ya.");
        setLoading(false);
        return;
      }
      if (remember) localStorage.setItem("signlearn.rememberedEmail", email.trim());
      else localStorage.removeItem("signlearn.rememberedEmail");
    } catch {
      setAuthError("Kami belum bisa menghubungkan akunmu. Coba lagi sebentar, ya.");
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <AuthBrandPanel id="login-welcome-title" eyebrow="Ruang belajar yang aman dan seru" title="Selamat Datang Kembali!" description="Mari lanjutkan petualangan belajar BISINDO bersama SignLearn Kids." benefits={BENEFITS} />

      <section className="login-form-panel" aria-labelledby="login-title">
        <AuthCard>
          <motion.header className="login-form-header" {...authEntrance(reducedMotion, 0.08)}>
            <p className="login-eyebrow">Senang melihatmu lagi</p>
            <h2 id="login-title">Masuk</h2>
            <p>Siap lanjut belajar BISINDO hari ini?</p>
          </motion.header>

          <AuthStatus error={authError} onDismiss={() => setAuthError("")} />

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <motion.div {...authEntrance(reducedMotion, 0.16)}>
              <AuthField inputRef={emailRef} id="login-email" label="Alamat Email" icon={MailIcon} type="email" inputMode="email" placeholder="contoh@email.com" value={email} onChange={(event) => { setEmail(event.target.value); if (fieldErrors.email) setFieldErrors((current) => ({ ...current, email: "" })); }} autoComplete="email" error={fieldErrors.email} />
            </motion.div>
            <motion.div {...authEntrance(reducedMotion, 0.23)}>
              <div className="login-password-label"><label htmlFor="login-password">Kata Sandi</label><button type="button" onClick={() => navigate("/forgot-password")}>Lupa Sandi?</button></div>
              <AuthField inputRef={passwordRef} id="login-password" label={null} icon={LockIcon} type={showPass ? "text" : "password"} placeholder="Masukkan kata sandi" value={password} onChange={(event) => { setPassword(event.target.value); if (fieldErrors.password) setFieldErrors((current) => ({ ...current, password: "" })); }} autoComplete="current-password" error={fieldErrors.password} rightElement={<PasswordToggle visible={showPass} onToggle={() => setShowPass((visible) => !visible)} />} />
            </motion.div>
            <motion.label className="login-remember" {...authEntrance(reducedMotion, 0.3)}><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span className="login-checkbox" aria-hidden="true"><CheckIcon size={14} /></span><span>Ingat saya</span></motion.label>
            <motion.div {...authEntrance(reducedMotion, 0.37)}>
              <AuthSubmitButton type="submit" loading={loading} loadingLabel="Sedang masuk...">Masuk</AuthSubmitButton>
            </motion.div>
          </form>

          <motion.p className="login-register-link" {...authEntrance(reducedMotion, 0.44)}>Belum punya akun? <button type="button" onClick={() => navigate("/register")}>Daftar di sini</button></motion.p>
          <motion.p className="login-security-note" {...authEntrance(reducedMotion, 0.48)}><LockIcon size={14} /> Masuk dengan aman ke ruang belajarmu.</motion.p>
        </AuthCard>
      </section>
    </main>
  );
}
