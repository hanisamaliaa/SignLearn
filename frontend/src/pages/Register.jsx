import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/app";
import {
  ArrowLeftIcon,
  BookIcon,
  CheckCircleIcon,
  CheckIcon,
  HandSignIcon,
  LockIcon,
  MailIcon,
  UserIcon,
  UsersIcon,
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
  { label: "Belajar Sambil Bermain", icon: BookIcon },
  { label: "Kenali Gerakan BISINDO", icon: HandSignIcon },
  { label: "Simpan Progres Belajar", icon: CheckCircleIcon },
];

const PROFILES = [
  {
    id: "parent",
    title: "Orang Tua dan Pendamping",
    description: "Saya ingin mendampingi anak belajar dan berkomunikasi dengan BISINDO.",
    icon: UsersIcon,
  },
  {
    id: "deaf",
    title: "Teman Tuli",
    description: "Saya ingin mengembangkan kemampuan komunikasi BISINDO.",
    icon: HandSignIcon,
  },
  {
    id: "general",
    title: "Pelajar Umum",
    description: "Saya ingin belajar BISINDO untuk komunikasi yang lebih inklusif.",
    icon: BookIcon,
  },
];

const premiumEase = [0.22, 1, 0.36, 1];

export default function Register() {
  const { register } = useApp();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profile, setProfile] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordMeetsRequirement = password.length >= 6;
  const passwordsMatch = Boolean(confirmPassword) && password === confirmPassword;

  function clearFieldError(field) {
    if (fieldErrors[field]) setFieldErrors((current) => ({ ...current, [field]: "" }));
  }

  function validateDetails() {
    const errors = {};
    const normalizedEmail = email.trim();
    if (!name.trim()) errors.name = "Nama belum diisi.";
    if (!normalizedEmail) errors.email = "Alamat email belum diisi.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) errors.email = "Format email belum sesuai.";
    if (!password) errors.password = "Kata sandi belum diisi.";
    else if (!passwordMeetsRequirement) errors.password = "Kata sandi minimal 6 karakter.";
    if (!confirmPassword) errors.confirmPassword = "Konfirmasi kata sandi belum diisi.";
    else if (!passwordsMatch) errors.confirmPassword = "Konfirmasi kata sandi belum sama.";
    setFieldErrors(errors);

    if (errors.name) nameRef.current?.focus();
    else if (errors.email) emailRef.current?.focus();
    else if (errors.password) passwordRef.current?.focus();
    else if (errors.confirmPassword) confirmRef.current?.focus();
    return Object.keys(errors).length === 0;
  }

  function handleDetailsSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setAuthError("");
    setConfirmTouched(true);
    if (!validateDetails()) return;
    setDirection(1);
    setStep(2);
  }

  async function handleRegister(event) {
    event.preventDefault();
    if (loading) return;
    if (!profile) {
      setAuthError("Pilih profil belajar yang paling sesuai, ya.");
      return;
    }

    setAuthError("");
    setLoading(true);
    try {
      const ok = await register({ name: name.trim(), email: email.trim(), password, profile });
      if (!ok) {
        setAuthError("Email ini sudah digunakan. Coba gunakan email lain, ya.");
        setLoading(false);
        return;
      }
      setSuccess(true);
      setLoading(false);
    } catch {
      setAuthError("Akun belum berhasil dibuat. Coba lagi sebentar, ya.");
      setLoading(false);
    }
  }

  function returnToDetails() {
    setDirection(-1);
    setStep(1);
    setAuthError("");
  }

  const stepMotion = {
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? 14 : -14 },
    animate: { opacity: 1, x: 0 },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? -10 : 10 },
    transition: { duration: reducedMotion ? 0.16 : 0.28, ease: premiumEase },
  };

  return (
    <main className="login-page auth-register-page">
      <AuthBrandPanel
        id="register-welcome-title"
        eyebrow="Petualangan baru dimulai"
        title="Yuk, Mulai Petualanganmu!"
        description="Buat akun dan mulai belajar BISINDO dengan cara yang seru bersama SignLearn Kids."
        benefits={BENEFITS}
        celebratory
      />

      <section className="login-form-panel auth-register-form-panel" aria-labelledby={success ? "register-success-title" : "register-title"}>
        <AuthCard className={`auth-register-card ${success ? "is-success" : ""}`}>
          {success ? (
            <motion.div className="auth-register-success" initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reducedMotion ? 0.18 : 0.38, ease: premiumEase }} aria-live="polite">
              <motion.span className="auth-success-icon" initial={reducedMotion ? false : { scale: 0.75 }} animate={{ scale: 1 }} transition={{ duration: 0.3, ease: premiumEase }} aria-hidden="true"><CheckIcon size={34} /></motion.span>
              <p className="login-eyebrow">Selamat datang!</p>
              <h2 id="register-success-title">Akun berhasil dibuat!</h2>
              <p>Akun untuk <strong>{name.trim()}</strong> sudah siap. Sekarang kamu bisa masuk dan mulai belajar BISINDO.</p>
              <AuthSubmitButton type="button" loading={false} onClick={() => navigate("/login")}>Lanjut ke Halaman Masuk</AuthSubmitButton>
            </motion.div>
          ) : (
            <>
              <header className="login-form-header auth-register-header">
                <p className="login-eyebrow">Langkah {step} dari 2</p>
                <h2 id="register-title">{step === 1 ? "Daftar" : "Pilih Profil Belajar"}</h2>
                <p>{step === 1 ? "Mulai petualangan belajarmu bersama SignLearn Kids." : "Bantu kami menyesuaikan pengalaman belajarmu."}</p>
                <div className="auth-step-progress" aria-label={`Langkah ${step} dari 2`}><span style={{ width: `${step * 50}%` }} /></div>
              </header>

              <AuthStatus error={authError} onDismiss={() => setAuthError("")} />

              <AnimatePresence mode="wait" initial={false}>
                {step === 1 ? (
                  <motion.form key="details" className="login-form auth-register-form" onSubmit={handleDetailsSubmit} noValidate {...stepMotion}>
                    <motion.div {...authEntrance(reducedMotion, 0.08)}>
                      <AuthField inputRef={nameRef} id="register-name" label="Nama Lengkap" icon={UserIcon} type="text" placeholder="Nama kamu" value={name} onChange={(event) => { setName(event.target.value); clearFieldError("name"); }} autoComplete="name" error={fieldErrors.name} />
                    </motion.div>
                    <motion.div {...authEntrance(reducedMotion, 0.15)}>
                      <AuthField inputRef={emailRef} id="register-email" label="Alamat Email" icon={MailIcon} type="email" inputMode="email" placeholder="contoh@email.com" value={email} onChange={(event) => { setEmail(event.target.value); clearFieldError("email"); }} autoComplete="email" error={fieldErrors.email} />
                    </motion.div>
                    <motion.div {...authEntrance(reducedMotion, 0.22)}>
                      <AuthField inputRef={passwordRef} id="register-password" label="Kata Sandi" icon={LockIcon} type={showPassword ? "text" : "password"} placeholder="Masukkan kata sandi" value={password} onChange={(event) => { setPassword(event.target.value); clearFieldError("password"); clearFieldError("confirmPassword"); }} autoComplete="new-password" error={fieldErrors.password} describedBy="register-password-requirement" rightElement={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((visible) => !visible)} />} />
                      <p id="register-password-requirement" className={`auth-password-feedback ${passwordMeetsRequirement ? "is-valid" : ""}`}><span aria-hidden="true">{passwordMeetsRequirement ? <CheckIcon size={13} /> : "○"}</span> Minimal 6 karakter</p>
                    </motion.div>
                    <motion.div {...authEntrance(reducedMotion, 0.29)}>
                      <AuthField inputRef={confirmRef} id="register-confirm-password" label="Konfirmasi Kata Sandi" icon={LockIcon} type={showConfirmPassword ? "text" : "password"} placeholder="Masukkan kembali kata sandi" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); if (event.target.value) setConfirmTouched(true); clearFieldError("confirmPassword"); }} onBlur={() => setConfirmTouched(true)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} autoComplete="new-password" error={fieldErrors.confirmPassword} describedBy={confirmTouched && confirmPassword ? "register-password-match" : undefined} rightElement={<PasswordToggle visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((visible) => !visible)} label="konfirmasi kata sandi" />} />
                      {confirmTouched && confirmPassword && <p id="register-password-match" className={`auth-password-feedback ${passwordsMatch ? "is-valid" : "is-mismatch"}`} aria-live="polite"><span aria-hidden="true">{passwordsMatch ? <CheckIcon size={13} /> : "○"}</span> {passwordsMatch ? "Kata sandi cocok" : "Konfirmasi belum sama"}</p>}
                    </motion.div>
                    <motion.div {...authEntrance(reducedMotion, 0.36)}>
                      <AuthSubmitButton type="submit" loading={false}>Lanjutkan</AuthSubmitButton>
                    </motion.div>
                  </motion.form>
                ) : (
                  <motion.form key="profile" className="auth-profile-form" onSubmit={handleRegister} {...stepMotion}>
                    <div className="auth-profile-options" role="group" aria-label="Pilih profil belajar">
                      {PROFILES.map(({ id, title, description, icon: Icon }, index) => (
                        <motion.button
                          key={id}
                          type="button"
                          className={`auth-profile-option ${profile === id ? "is-selected" : ""}`}
                          onClick={() => { setProfile(id); setAuthError(""); }}
                          aria-pressed={profile === id}
                          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: reducedMotion ? 0.14 : 0.28, delay: reducedMotion ? 0 : index * 0.06, ease: premiumEase }}
                        >
                          <span className="auth-profile-icon" aria-hidden="true"><Icon size={22} /></span>
                          <span><strong>{title}</strong><small>{description}</small></span>
                          <span className="auth-profile-check" aria-hidden="true">{profile === id && <CheckIcon size={14} />}</span>
                        </motion.button>
                      ))}
                    </div>
                    <div className="auth-register-actions">
                      <button type="button" className="auth-secondary-button" onClick={returnToDetails}><ArrowLeftIcon size={17} /> Kembali</button>
                      <AuthSubmitButton type="submit" loading={loading} loadingLabel="Sedang membuat akun...">Buat Akun</AuthSubmitButton>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              <motion.p className="login-register-link auth-login-link" {...authEntrance(reducedMotion, 0.44)}>Sudah punya akun? <button type="button" onClick={() => navigate("/login")}>Masuk di sini</button></motion.p>
              <p className="login-security-note"><LockIcon size={14} /> Kata sandimu diproses dengan aman.</p>
            </>
          )}
        </AuthCard>
      </section>
    </main>
  );
}
