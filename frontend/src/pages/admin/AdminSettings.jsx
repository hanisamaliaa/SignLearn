import { useState } from "react";
import {
  Card,
  Toggle,
  Input,
  Select,
} from "../../components/ui/ui";
import {
  ShieldIcon,
  GlobeIcon,
  EyeIcon,
} from "../../components/ui/Icons";
import { useTheme } from "../../context/ThemeContext";

const GENERAL_OPTIONS = [{ value: "id", label: "Bahasa Indonesia" }];

export default function AdminSettings() {
  const [general, setGeneral] = useState({
    appName: "SignLearn",
    language: "id",
  });
  const {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    minFontSize,
    maxFontSize,
    highContrast,
    reducedMotion,
    setHighContrast,
    setReducedMotion,
  } = useTheme();


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--text)]">
          Pengaturan Sistem
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Kelola konfigurasi platform SignLearn
        </p>
      </div>


      {/* General */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-[var(--primary-light)] rounded-xl flex items-center justify-center text-[var(--primary)]">
              <GlobeIcon size={18} />
            </div>
            <div>
              <h2 className="font-bold text-[var(--text)]">Pengaturan Umum</h2>
              <p className="text-xs text-[var(--text-subtle)]">
                Konfigurasi dasar platform
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Nama Aplikasi"
              value={general.appName}
              onChange={(e) =>
                setGeneral((p) => ({ ...p, appName: e.target.value }))
              }
            />
            <Select
              label="Bahasa Default"
              value={general.language}
              onChange={(v) => setGeneral((p) => ({ ...p, language: v }))}
              options={GENERAL_OPTIONS}
            />

          </div>
        </Card>

      {/* Appearance */}
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-[var(--primary-light)] rounded-xl flex items-center justify-center text-[var(--primary)]">
            <EyeIcon size={18} />
          </div>
          <div>
            <h2 className="font-bold text-[var(--text)]">Tampilan</h2>
            <p className="text-xs text-[var(--text-subtle)]">
              Atur tampilan dan aksesibilitas agar dashboard lebih nyaman digunakan.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label
              id="admin-theme-label"
              className="text-sm font-medium text-[var(--text)] mb-3 block"
            >
              Mode tampilan
            </label>
            <div
              className="grid grid-cols-2 gap-3 max-w-md"
              role="radiogroup"
              aria-labelledby="admin-theme-label"
            >
              {[
                { id: "light", label: "Terang", icon: "☀️" },
                { id: "dark", label: "Gelap", icon: "🌙" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={theme === option.id}
                  onClick={() => setTheme(option.id)}
                  className={`rounded-xl border-2 p-3 text-center transition-all ${
                    theme === option.id
                      ? "border-[#4F8EF7] bg-[var(--primary-light)]"
                      : "border-[var(--border)] hover:border-[#4F8EF7]/40"
                  }`}
                >
                  <div className="text-xl mb-1">{option.icon}</div>
                  <p className={`text-xs font-medium ${
                    theme === option.id
                      ? "text-[var(--primary)]"
                      : "text-[var(--text-muted)]"
                  }`}>
                    {option.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-font-size"
              className="text-sm font-medium text-[var(--text)] mb-2 block"
            >
              Ukuran teks: {fontSize}px
            </label>
            <div className="flex items-center gap-3 max-w-md">
              <span className="text-xs text-[var(--text-subtle)]">Kecil</span>
              <input
                id="admin-font-size"
                type="range"
                min={minFontSize}
                max={maxFontSize}
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="flex-1 accent-[#4F8EF7]"
              />
              <span className="text-xs text-[var(--text-subtle)]">Besar</span>
            </div>
          </div>

          <div className="border-t border-[var(--border-light)] pt-5 mt-1 max-w-2xl">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-[var(--text)]">Aksesibilitas</h3>
              <p className="text-xs leading-5 text-[var(--text-subtle)] mt-1">
                Perubahan langsung diterapkan dan tersimpan otomatis.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-light)] p-3">
                <div>
                  <p className="text-sm font-bold text-[var(--text)]">Kontras tinggi</p>
                  <p className="text-xs leading-5 text-[var(--text-subtle)]">
                    Membuat teks dan batas elemen lebih mudah dibedakan.
                  </p>
                </div>
                <Toggle
                  checked={highContrast}
                  onChange={setHighContrast}
                  ariaLabel="Kontras tinggi"
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-light)] p-3">
                <div>
                  <p className="text-sm font-bold text-[var(--text)]">Kurangi animasi</p>
                  <p className="text-xs leading-5 text-[var(--text-subtle)]">
                    Mengurangi gerakan dan transisi agar lebih nyaman.
                  </p>
                </div>
                <Toggle
                  checked={reducedMotion}
                  onChange={setReducedMotion}
                  ariaLabel="Kurangi animasi"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-2 text-[var(--text-subtle)]">
        <ShieldIcon size={14} />
        <span className="text-xs">Preferensi tampilan dan aksesibilitas tersimpan otomatis di perangkat ini.</span>
      </div>
    </div>
  );
}
