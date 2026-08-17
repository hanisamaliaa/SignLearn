import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Button, Badge, Input, Modal, Alert } from "../../components/ui/ui";
import { SearchIcon, EditIcon, TrashIcon, EyeIcon } from "../../components/ui/Icons";
import { adminService, userService } from "../../services";
import {
  useAdminResource,
  useFlash,
  runMutation,
  fieldErrors,
} from "../../hooks/useAdminResource";
import { useApp } from "../../context/app";
import { SignLearnAvatar } from "../../components/common/SignLearnAvatar";

/**
 * Manajemen pengguna — API Contract §7.3-7.6.
 *
 * ── Tiga hal yang berubah dari versi mock ─────────────────────────────
 *
 * 1. TIDAK ADA "Tambah Pengguna". Backend tidak punya `POST /users`; akun
 *    dibuat lewat pendaftaran mandiri di `/register`. Tombol yang memanggil
 *    endpoint tak ada hanya memindahkan kegagalan ke saat demo.
 *
 * 2. "Hapus" adalah PENONAKTIFAN, bukan penghapusan. `DELETE /users/:id`
 *    melakukan soft delete — status menjadi `inactive` dan barisnya tetap ada
 *    (§7.6). Teks modal lama berkata "dihapus permanen"; itu keliru, dan admin
 *    yang percaya kalimat itu akan salah menduga data pengguna sudah hilang.
 *
 * 3. Pencarian dan filter dikerjakan SERVER. Versi lama menyaring array di
 *    memori — yang hanya benar selama seluruh pengguna muat dalam satu
 *    halaman. Pada pengguna ke-21, pencarian diam-diam berhenti menemukan
 *    orang yang jelas-jelas terdaftar.
 */

const STATUS_FILTERS = [
  { id: "all", label: "Semua" },
  { id: "active", label: "Aktif" },
  { id: "inactive", label: "Nonaktif" },
  { id: "suspended", label: "Ditangguhkan" },
];

const PROFILE_LABEL = {
  general: "Pelajar Umum",
  parent: "Orang Tua",
  deaf: "Tunarungu",
};

const STATUS_LABEL = {
  active: "Aktif",
  inactive: "Nonaktif",
  suspended: "Ditangguhkan",
};

const PAGE_SIZE = 20;

export default function AdminUsers() {
  const { currentUser } = useApp();
  const { flash, show, clear } = useFlash();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  /**
   * Debounce 350 ms.
   *
   * Tanpa ini setiap ketikan menembak satu permintaan; mengetik "budi" berarti
   * empat query beruntun, dan yang terakhir belum tentu yang terakhir tiba.
   * (Balasan basi tetap dijaga `useAdminResource`, tetapi tidak ada gunanya
   * mengirim permintaan yang sudah pasti dibuang.)
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    // Validator menolak `q` sepanjang 1 karakter (§7.3), jadi jangan kirim.
    const params = { page, limit: PAGE_SIZE, sortBy: "createdAt", sortDir: "desc" };
    if (search.length >= 2) params.q = search;
    if (filterStatus !== "all") params.status = filterStatus;

    const [list, stats] = await Promise.all([
      userService.getUsers(params),
      adminService.getStats().catch(() => null),
    ]);
    return { list, stats };
  }, [page, search, filterStatus]);

  const { data, loading, error, reload } = useAdminResource(load, [
    page,
    search,
    filterStatus,
  ]);

  const users = data?.list?.items ?? [];
  const pagination = data?.list?.pagination ?? null;
  const stats = data?.stats ?? null;

  const summary = useMemo(() => {
    if (!stats) return null;
    return [
      { label: "Total Pengguna", value: stats.users, color: "var(--chart-blue)" },
      { label: "Aktif", value: stats.activeUsers, color: "var(--chart-green)" },
      {
        // `adminTotals` hanya menghitung status='active'; sisanya adalah
        // gabungan `inactive` dan `suspended`. Labelnya menyebut keduanya
        // supaya angkanya tidak dibaca sebagai "nonaktif" saja.
        label: "Nonaktif / Ditangguhkan",
        value: Math.max(0, stats.users - stats.activeUsers),
        color: "var(--chart-red)",
      },
    ];
  }, [stats]);

  function openEdit(user) {
    setEditUser(user);
    setFormErrors({});
    setForm({
      name: user.name ?? "",
      phone: user.phone ?? "",
      profile: user.profile ?? "general",
      role: user.role ?? "user",
      status: user.status ?? "active",
    });
  }

  function closeEdit() {
    setEditUser(null);
    setForm(null);
    setFormErrors({});
  }

  async function handleSave() {
    if (!editUser || !form) return;
    setSaving(true);
    setFormErrors({});

    /**
     * Hanya kirim yang BERUBAH.
     *
     * Validator §7.5 menolak body tanpa satu pun field yang dapat diperbarui,
     * dan mengirim seluruh objek apa adanya berarti setiap penyimpanan
     * menghitung sebagai perubahan peran/status — yang MENCABUT SELURUH SESI
     * pengguna itu (userService.updateByAdmin). Admin yang cuma membetulkan
     * ejaan nama akan diam-diam mengeluarkan orang itu dari aplikasi.
     */
    const patch = {};
    if (form.name.trim() !== (editUser.name ?? "")) patch.name = form.name.trim();
    if (form.phone !== (editUser.phone ?? "")) patch.phone = form.phone || null;
    if (form.profile !== editUser.profile) patch.profile = form.profile;
    if (form.role !== editUser.role) patch.role = form.role;
    if (form.status !== editUser.status) patch.status = form.status;

    if (Object.keys(patch).length === 0) {
      setSaving(false);
      closeEdit();
      show("info", "Tidak ada perubahan untuk disimpan.");
      return;
    }

    const outcome = await runMutation(() => userService.updateUser(editUser.id, patch));
    setSaving(false);

    if (!outcome.ok) {
      setFormErrors(fieldErrors(outcome.errors));
      show("danger", outcome.message);
      return;
    }

    closeEdit();
    await reload();
    show("success", "Data pengguna berhasil diperbarui.");
  }

  async function handleToggleStatus(user) {
    const next = user.status === "active" ? "inactive" : "active";
    const outcome = await runMutation(() =>
      userService.updateUser(user.id, { status: next }),
    );

    if (!outcome.ok) {
      show("danger", outcome.message);
      return;
    }
    await reload();
    show("success", `Pengguna kini ${STATUS_LABEL[next].toLowerCase()}.`);
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;

    const outcome = await runMutation(() =>
      userService.deactivateUser(deactivateTarget.id),
    );
    setDeactivateTarget(null);

    if (!outcome.ok) {
      show("danger", outcome.message);
      return;
    }
    await reload();
    show("success", "Pengguna berhasil dinonaktifkan.");
  }

  const isSelf = (user) => String(user.id) === String(currentUser?.id);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text)]">Manajemen Pengguna</h1>
          <p className="text-[var(--text-muted)] mt-0.5">
            {pagination ? `${pagination.total} pengguna cocok dengan filter` : "Memuat…"}
          </p>
        </div>
      </div>

      {flash && <Alert type={flash.type} message={flash.message} onClose={clear} />}
      {error && <Alert type="danger" message={error.message} onClose={() => reload()} />}

      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
            />
            <input
              type="text"
              placeholder="Cari nama atau email (minimal 2 karakter)…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] text-sm outline-none focus:border-[#4F8EF7] focus:ring-2 focus:ring-[#4F8EF7]/20"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFilterStatus(f.id);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filterStatus === f.id
                    ? "bg-[#4F8EF7] text-white"
                    : "bg-[var(--surface-3)] text-[var(--text-muted)] hover:bg-[#E2E8F0]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {summary.map((s) => (
            <div
              key={s.label}
              className="bg-[var(--surface)] rounded-2xl p-4 border border-[var(--border)] admin-kids-card text-center"
            >
              <p className="text-2xl font-extrabold" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                {["Pengguna", "Profil", "Peran", "Status", "Bergabung", "Aksi"].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[var(--border-light)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <SignLearnAvatar id={user.avatar} size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text)]">
                          {user.name}
                          {isSelf(user) && (
                            <span className="ml-2 text-xs font-normal text-[var(--text-subtle)]">
                              (Anda)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[var(--text-subtle)]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs text-[var(--text-muted)]">
                      {PROFILE_LABEL[user.profile] ?? user.profile}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={user.role === "admin" ? "primary" : "muted"}>
                      {user.role === "admin" ? "Admin" : "Pengguna"}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      variant={
                        user.status === "active"
                          ? "success"
                          : user.status === "suspended"
                            ? "danger"
                            : "muted"
                      }
                    >
                      {STATUS_LABEL[user.status] ?? user.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-xs text-[var(--text-muted)]">
                    {user.joinDate ?? "—"}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-colors"
                        title="Edit"
                      >
                        <EditIcon size={14} />
                      </button>

                      {/*
                        Aksi pada baris SENDIRI dimatikan di UI.
                        Server juga menolaknya (§7.5), tetapi tombol yang selalu
                        gagal adalah jebakan — apalagi di tengah demo.
                      */}
                      <button
                        onClick={() => handleToggleStatus(user)}
                        disabled={isSelf(user)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--warning-light)] hover:text-[#F4B400] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        title={
                          isSelf(user)
                            ? "Tidak dapat mengubah status akun sendiri"
                            : user.status === "active"
                              ? "Nonaktifkan"
                              : "Aktifkan"
                        }
                      >
                        <EyeIcon size={14} />
                      </button>

                      <button
                        onClick={() => setDeactivateTarget(user)}
                        disabled={isSelf(user)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--danger-light)] hover:text-[#E74C3C] transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        title={
                          isSelf(user)
                            ? "Tidak dapat menonaktifkan akun sendiri"
                            : "Nonaktifkan akun"
                        }
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && (
            <div className="text-center py-12 text-[var(--text-subtle)]">Memuat pengguna…</div>
          )}
          {!loading && users.length === 0 && (
            <div className="text-center py-12 text-[var(--text-subtle)]">
              <div className="text-4xl mb-3">👤</div>
              <p>Tidak ada pengguna ditemukan</p>
            </div>
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)]">
              Halaman {pagination.page} dari {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Selanjutnya →
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit modal */}
      <Modal open={!!editUser} onClose={closeEdit} title="Edit Pengguna">
        {form && (
          <div className="space-y-4">
            <Input
              label="Nama Lengkap"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Nama lengkap"
              error={formErrors.name}
            />

            {/*
              Email hanya dibaca. `validateAdminUpdateUser` MENOLAK field email
              terang-terangan (bukan mengabaikannya), jadi field yang dapat
              diketik di sini akan membuat setiap penyimpanan gagal 422.
            */}
            <div>
              <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">Email</label>
              <input
                value={editUser?.email ?? ""}
                readOnly
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm text-[var(--text-muted)] cursor-not-allowed"
              />
              <p className="text-xs text-[var(--text-subtle)] mt-1">
                Email tidak dapat diubah dari panel admin.
              </p>
            </div>

            <Input
              label="Telepon"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="08xxxxxxxxxx"
              error={formErrors.phone}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
                  Profil Belajar
                </label>
                <select
                  value={form.profile}
                  onChange={(e) => setForm((p) => ({ ...p, profile: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7]"
                >
                  <option value="general">Pelajar Umum</option>
                  <option value="parent">Orang Tua</option>
                  <option value="deaf">Tunarungu</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
                  Status
                </label>
                <select
                  value={form.status}
                  disabled={isSelf(editUser ?? {})}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7] disabled:bg-[var(--surface-2)] disabled:cursor-not-allowed"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                  <option value="suspended">Ditangguhkan</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">Peran</label>
              <select
                value={form.role}
                disabled={isSelf(editUser ?? {})}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7] disabled:bg-[var(--surface-2)] disabled:cursor-not-allowed"
              >
                <option value="user">Pengguna</option>
                <option value="admin">Admin</option>
              </select>
              <p className="text-xs text-[var(--text-subtle)] mt-1">
                {isSelf(editUser ?? {})
                  ? "Peran dan status akun sendiri tidak dapat diubah dari sini."
                  : "Mengubah peran atau status akan mengeluarkan pengguna dari seluruh sesinya."}
              </p>
              {formErrors.role && (
                <p className="text-xs text-[#E74C3C] mt-1">{formErrors.role}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" fullWidth onClick={closeEdit} disabled={saving}>
                Batal
              </Button>
              <Button fullWidth onClick={handleSave} disabled={saving}>
                {saving ? "Menyimpan…" : "Simpan Perubahan"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Deactivate modal */}
      <Modal open={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} size="sm">
        <div className="text-center">
          <div className="w-14 h-14 bg-[var(--danger-light)] rounded-full flex items-center justify-center mx-auto mb-4">
            <TrashIcon size={24} className="text-[#E74C3C]" />
          </div>
          <h3 className="font-bold text-[var(--text)] mb-2">Nonaktifkan Pengguna?</h3>
          <p className="text-sm text-[var(--text-muted)] mb-5">
            <strong>{deactivateTarget?.name}</strong> akan berstatus nonaktif dan langsung
            dikeluarkan dari seluruh sesinya. Data belajarnya tetap tersimpan dan akun dapat
            diaktifkan kembali kapan saja.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setDeactivateTarget(null)}>
              Batal
            </Button>
            <Button variant="danger" fullWidth onClick={handleDeactivate}>
              Nonaktifkan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
