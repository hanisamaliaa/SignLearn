import { useState } from "react";
import {
  Card,
  Button,
  Toggle,
  Alert,
  Input,
  Select,
} from "../../components/ui/ui";
import {
  ShieldIcon,
  GlobeIcon,
  BellIcon,
  DatabaseIcon,
  LockIcon,
} from "../../components/ui/Icons";

const GENERAL_OPTIONS = [
  { value: "id", label: "Bahasa Indonesia" },
  { value: "en", label: "English" },
];

export default function AdminSettings() {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [general, setGeneral] = useState({
    appName: "SignLearn",
    language: "id",
    maintenanceMode: false,
    registrationOpen: true,
  });
  const [security, setSecurity] = useState({
    twoFactorRequired: false,
    loginAlerts: true,
    passwordPolicy: "medium",
  });
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
  });

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

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

      {saved && (
        <Alert
          type="success"
          message="Pengaturan berhasil disimpan!"
          onClose={() => setSaved(false)}
        />
      )}

      <div className="grid lg:grid-cols-2 gap-6">
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
          <div className="space-y-4">
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
            <div className="border-t border-[var(--border-light)] pt-4 space-y-3">
              <Toggle
                checked={general.maintenanceMode}
                onChange={(v) =>
                  setGeneral((p) => ({ ...p, maintenanceMode: v }))
                }
                label="Mode Pemeliharaan"
              />
              <Toggle
                checked={general.registrationOpen}
                onChange={(v) =>
                  setGeneral((p) => ({ ...p, registrationOpen: v }))
                }
                label="Buka Pendaftaran"
              />
            </div>
          </div>
        </Card>

        {/* Security */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-[var(--danger-light)] rounded-xl flex items-center justify-center text-[#E74C3C]">
              <LockIcon size={18} />
            </div>
            <div>
              <h2 className="font-bold text-[var(--text)]">Keamanan</h2>
              <p className="text-xs text-[var(--text-subtle)]">Kebijakan keamanan akun</p>
            </div>
          </div>
          <div className="space-y-4">
            <Select
              label="Kebijakan Kata Sandi"
              value={security.passwordPolicy}
              onChange={(v) =>
                setSecurity((p) => ({ ...p, passwordPolicy: v }))
              }
              options={[
                { value: "low", label: "Rendah (min. 6 karakter)" },
                { value: "medium", label: "Sedang (min. 8 karakter)" },
                { value: "high", label: "Tinggi (min. 12 karakter)" },
              ]}
            />
            <div className="border-t border-[var(--border-light)] pt-4 space-y-3">
              <Toggle
                checked={security.twoFactorRequired}
                onChange={(v) =>
                  setSecurity((p) => ({ ...p, twoFactorRequired: v }))
                }
                label="Wajibkan Autentikasi 2 Faktor"
              />
              <Toggle
                checked={security.loginAlerts}
                onChange={(v) => setSecurity((p) => ({ ...p, loginAlerts: v }))}
                label="Peringatan Login Baru"
              />
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-[var(--warning-light)] rounded-xl flex items-center justify-center text-[#F4B400]">
              <BellIcon size={18} />
            </div>
            <div>
              <h2 className="font-bold text-[var(--text)]">Notifikasi</h2>
              <p className="text-xs text-[var(--text-subtle)]">
                Saluran notifikasi sistem
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <Toggle
              checked={notifications.email}
              onChange={(v) => setNotifications((p) => ({ ...p, email: v }))}
              label="Notifikasi Email"
            />
            <Toggle
              checked={notifications.sms}
              onChange={(v) => setNotifications((p) => ({ ...p, sms: v }))}
              label="Notifikasi SMS"
            />
            <Toggle
              checked={notifications.push}
              onChange={(v) => setNotifications((p) => ({ ...p, push: v }))}
              label="Notifikasi Push"
            />
          </div>
        </Card>

        {/* Data */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-[var(--success-light)] rounded-xl flex items-center justify-center text-[#2ECC71]">
              <DatabaseIcon size={18} />
            </div>
            <div>
              <h2 className="font-bold text-[var(--text)]">Data & Keamanan</h2>
              <p className="text-xs text-[var(--text-subtle)]">
                Manajemen data dan privasi
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-xl">
              <div>
                <p className="text-sm font-medium text-[var(--text)]">
                  Cadangkan Data
                </p>
                <p className="text-xs text-[var(--text-subtle)]">Terakhir: 2 jam lalu</p>
              </div>
              <Button variant="secondary" size="sm">
                Cadangkan
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-xl">
              <div>
                <p className="text-sm font-medium text-[var(--text)]">
                  Hapus Data Pengguna
                </p>
                <p className="text-xs text-[var(--text-subtle)]">
                  Hapus data setelah 30 hari nonaktif
                </p>
              </div>
              <Button variant="danger" size="sm">
                Hapus
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[var(--text-subtle)]">
          <ShieldIcon size={14} />
          <span className="text-xs">
            Semua perubahan dicatat di log aktivitas
          </span>
        </div>
        <Button size="lg" onClick={handleSave} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </Button>
      </div>
    </div>
  );
}
