// ─── Button ─────────────────────────────────────────────────────────────────
export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  children,
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
  const variants = {
    primary:
      "bg-[#4F8EF7] hover:bg-[#3A7DE0] active:bg-[#2F6BC4] text-white focus:ring-[#4F8EF7] shadow-sm",
    secondary:
      "bg-[var(--primary-light)] hover:bg-[#D4E9FF] active:bg-[#C0DFFF] text-[var(--primary)] focus:ring-[#4F8EF7]",
    ghost:
      "hover:bg-gray-100 active:bg-gray-200 text-[var(--text-muted)] focus:ring-gray-300",
    danger:
      "bg-[#E74C3C] hover:bg-[#C0392B] text-white focus:ring-[#E74C3C] shadow-sm",
    success:
      "bg-[#2ECC71] hover:bg-[#27AE60] text-white focus:ring-[#2ECC71] shadow-sm",
    outline:
      "border-2 border-[var(--border)] hover:border-[#4F8EF7] hover:text-[var(--primary)] text-[var(--text-muted)] bg-[var(--surface)]",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({
  children,
  className = "",
  onClick,
  hover,
  padding = "md",
}) {
  const pads = { none: "", sm: "p-4", md: "p-6", lg: "p-8" };
  return (
    <div
      className={`bg-[var(--surface)] rounded-2xl shadow-sm border border-[var(--border)] admin-kids-card ${pads[padding]} ${
        hover
          ? "hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          : ""
      } ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ─── Input ───────────────────────────────────────────────────────────────────
export function Input({
  label,
  error,
  icon,
  rightElement,
  className = "",
  id,
  ...props
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-[var(--text)]"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] outline-none transition-all duration-150 focus:border-[#4F8EF7] focus:ring-2 focus:ring-[#4F8EF7]/20 ${
            error ? "border-[#E74C3C] focus:ring-[#E74C3C]/20" : ""
          } ${icon ? "pl-10" : ""} ${rightElement ? "pr-10" : ""} ${className}`}
          {...props}
        />
        {rightElement && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {rightElement}
          </span>
        )}
      </div>
      {error && (
        <p className="text-xs text-[#E74C3C] flex items-center gap-1">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Select ──────────────────────────────────────────────────────────────────
export function Select({
  label,
  error,
  options,
  value,
  onChange,
  placeholder,
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-[var(--text)]">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={`w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[#4F8EF7] focus:ring-2 focus:ring-[#4F8EF7]/20 ${
          error ? "border-[#E74C3C]" : ""
        }`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-[#E74C3C]">{error}</p>}
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────
export function Badge({
  children,
  variant = "primary",
  size = "sm",
  className = "",
}) {
  const variants = {
    primary: "bg-[var(--primary-light)] text-[var(--primary)]",
    success: "bg-[var(--success-light)] text-[#2ECC71]",
    warning: "bg-[var(--warning-light)] text-[#E6A800]",
    danger: "bg-[var(--danger-light)] text-[#E74C3C]",
    muted: "bg-[var(--surface-3)] text-[var(--text-muted)]",
    outline:
      "border border-[var(--border)] text-[var(--text-muted)] bg-[var(--surface)]",
  };
  const sizes = { sm: "px-2.5 py-0.5 text-xs", md: "px-3 py-1 text-sm" };
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
export function Avatar({ initials, size = "md", color = "#4F8EF7", src }) {
  const sizes = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-xl",
  };
  if (src) {
    return (
      <img
        src={src}
        className={`${sizes[size]} rounded-full object-cover ring-2 ring-white`}
        alt={initials}
      />
    );
  }
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}
      style={{ background: color }}
    >
      {initials}
    </div>
  );
}

// ─── Progress Bar ────────────────────────────────────────────────────────────
export function ProgressBar({
  value,
  max = 100,
  color = "#4F8EF7",
  className = "",
  showLabel,
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex-1 h-2 bg-[var(--surface-3)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-[var(--text-muted)] w-8 text-right">
          {pct}%
        </span>
      )}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  icon,
  color = "#4F8EF7",
  trend,
  className = "",
}) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--text-muted)] mb-1">{label}</p>
          <p className="text-2xl font-bold text-[var(--text)]">{value}</p>
          {trend && (
            <p
              className={`text-xs mt-1 ${trend.value >= 0 ? "text-[#2ECC71]" : "text-[#E74C3C]"}`}
            >
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%{" "}
              {trend.label}
            </p>
          )}
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, color }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-[var(--surface-3)] rounded-2xl flex items-center justify-center text-[var(--text-subtle)] mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-[var(--text)] mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[var(--text-muted)] max-w-xs">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Toast / Alert ───────────────────────────────────────────────────────────
export function Alert({ type, message, onClose }) {
  const styles = {
    success: {
      bg: "bg-[var(--success-light)]",
      text: "text-[#1A6B40]",
      border: "border-[#2ECC71]/30",
      icon: "✓",
    },
    warning: {
      bg: "bg-[var(--warning-light)]",
      text: "text-[#7A5A00]",
      border: "border-[#F4B400]/30",
      icon: "⚠",
    },
    danger: {
      bg: "bg-[var(--danger-light)]",
      text: "text-[#8B2519]",
      border: "border-[#E74C3C]/30",
      icon: "✕",
    },
    info: {
      bg: "bg-[var(--primary-light)]",
      text: "text-[#1A4A8B]",
      border: "border-[#4F8EF7]/30",
      icon: "ℹ",
    },
  };
  const s = styles[type];
  return (
    <div
      className={`flex items-center gap-3 p-3.5 rounded-xl border ${s.bg} ${s.border} ${s.text} text-sm`}
    >
      <span className="font-bold">{s.icon}</span>
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="opacity-60 hover:opacity-100 transition-opacity"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = "md" }) {
  if (!open) return null;
  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${widths[size]} bg-[var(--surface)] rounded-2xl shadow-xl animate-scale-in`}
      >
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
            <h2 className="text-lg font-semibold text-[var(--text)]">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Table ───────────────────────────────────────────────────────────────────
export function Table({ columns, rows, onRowClick }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
                style={col.width ? { width: col.width } : {}}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-[var(--border-light)] last:border-0 ${
                onRowClick ? "cursor-pointer hover:bg-[var(--surface-2)]" : ""
              } transition-colors`}
              onClick={() => onRowClick?.(i)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-4 py-3.5 text-sm text-[var(--text)]"
                >
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Toggle ──────────────────────────────────────────────────────────────────
export function Toggle({ checked, onChange, label, ariaLabel }) {
  return (
    <label className="portal-toggle-wrap">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || label}
        onClick={() => onChange(!checked)}
        className={`portal-toggle ${checked ? "is-on" : "is-off"}`}
      >
        <span className="portal-toggle-thumb" />
      </button>
      {label && <span className="portal-toggle-label">{label}</span>}
    </label>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--text)]">{title}</h2>
        {subtitle && (
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 p-1 bg-[var(--surface-3)] rounded-xl">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
            active === tab.id
              ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                active === tab.id
                  ? "bg-[var(--primary-light)] text-[var(--primary)]"
                  : "bg-[var(--border)] text-[var(--text-muted)]"
              }`}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
