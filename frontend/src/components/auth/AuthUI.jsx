import { motion } from "framer-motion";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  EyeIcon,
  EyeOffIcon,
  HandSignIcon,
} from "../ui/Icons";
import BrandLogo from "../common/BrandLogo";
import { usePointerMotion } from "../../hooks/usePointerMotion";
import { useReducedMotion } from "../../hooks/useLandingMotion";
import mascotImage from "../../assets/characters/signlearn-login-mascot.webp";

const premiumEase = [0.22, 1, 0.36, 1];

export function authEntrance(reducedMotion, delay, distance = 12) {
  return {
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, y: distance },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reducedMotion ? 0.18 : 0.38,
      delay: reducedMotion ? 0 : delay * 0.65,
      ease: premiumEase,
    },
  };
}

export function AuthBrandPanel({ id, eyebrow, title, description, benefits, celebratory = false }) {
  const reducedMotion = useReducedMotion();

  return (
    <section className={`login-brand-panel auth-brand-panel ${celebratory ? "is-celebratory" : ""}`} aria-labelledby={id}>
      <div className="login-brand-decor" aria-hidden="true"><i /><i /><i /><HandSignIcon size={190} /></div>
      <motion.div className="login-brand-top" {...authEntrance(reducedMotion, 0.04)}><BrandLogo className="auth-brand-logo" ariaLabel="SignLearn Kids, kembali ke beranda" /></motion.div>
      <div className="login-brand-content">
        <motion.div
          className="login-mascot-frame"
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reducedMotion ? 0.18 : 0.66, delay: reducedMotion ? 0 : 0.1, ease: premiumEase }}
        >
          <span className="login-mascot-glow" aria-hidden="true" />
          <img src={mascotImage} alt="Finn, maskot burung biru SignLearn Kids, melambaikan tangan" width="1254" height="1254" decoding="async" />
          {celebratory && <span className="auth-mascot-badge" aria-hidden="true">Mulai!</span>}
        </motion.div>
        <motion.div className="login-welcome-copy" {...authEntrance(reducedMotion, 0.22)}>
          <p className="login-eyebrow">{eyebrow}</p>
          <h1 id={id}>{title}</h1>
          <p>{description}</p>
        </motion.div>
        <motion.ul className="login-benefits" aria-label="Manfaat SignLearn Kids" {...authEntrance(reducedMotion, 0.3)}>
          {benefits.map(({ label, icon: Icon }) => <li key={label}><span aria-hidden="true"><Icon size={18} /></span>{label}</li>)}
        </motion.ul>
      </div>
    </section>
  );
}

export function AuthCard({ children, className = "" }) {
  const reducedMotion = useReducedMotion();
  const pointerMotion = usePointerMotion();

  return (
    <motion.div
      ref={pointerMotion.ref}
      className={`login-form-card ${className}`}
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
      transition={{ duration: reducedMotion ? 0.18 : 0.32, ease: premiumEase }}
      {...pointerMotion.pointerProps}
    >
      <span className="login-card-spotlight" aria-hidden="true" />
      {children}
    </motion.div>
  );
}

export function AuthField({ id, label, error, icon: Icon, rightElement, inputRef, describedBy, ...props }) {
  const errorId = `${id}-error`;
  const descriptionIds = [describedBy, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`login-field ${error ? "has-error" : ""}`}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className="login-input-wrap">
        <span className="login-input-icon" aria-hidden="true"><Icon size={19} /></span>
        <input ref={inputRef} id={id} aria-invalid={Boolean(error)} aria-describedby={descriptionIds} {...props} />
        {rightElement}
      </div>
      {error && <p id={errorId} className="login-field-error"><AlertCircleIcon size={14} aria-hidden="true" /> {error}</p>}
    </div>
  );
}

export function PasswordToggle({ visible, onToggle, label = "kata sandi" }) {
  return (
    <button
      type="button"
      className="login-password-toggle"
      onClick={onToggle}
      aria-label={visible ? `Sembunyikan ${label}` : `Tampilkan ${label}`}
      aria-pressed={visible}
    >
      {visible ? <EyeOffIcon size={19} /> : <EyeIcon size={19} />}
    </button>
  );
}

export function AuthStatus({ error, onDismiss }) {
  return (
    <div className="login-auth-status" aria-live="polite">
      {error && <div className="login-auth-error" role="alert"><AlertCircleIcon size={19} /><span>{error}</span><button type="button" onClick={onDismiss} aria-label="Tutup pesan kesalahan">×</button></div>}
    </div>
  );
}

export function AuthSubmitButton({ loading, loadingLabel, children, className = "login-submit", disabled = false, ...props }) {
  const pointerMotion = usePointerMotion({ maxShift: 3 });

  return (
    <button ref={pointerMotion.ref} className={className} disabled={loading || disabled} aria-busy={loading} {...pointerMotion.pointerProps} {...props}>
      {loading ? <><span className="login-spinner" aria-hidden="true" /> {loadingLabel}</> : <>{children} <ArrowRightIcon size={18} /></>}
    </button>
  );
}
