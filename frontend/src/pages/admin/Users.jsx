import { useState } from "react";
import {
  Card,
  Button,
  Badge,
  Input,
  Modal,
  Alert,
} from "../../components/ui/ui";
import { MOCK_USERS_LIST } from "../../data/mock";
import {
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  EyeIcon,
} from "../../components/ui/Icons";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  profile: "general",
  status: "active",
};
const TABLE_COLS = [
  "Pengguna",
  "Profil",
  "Status",
  "Kursus Selesai",
  "Terakhir Aktif",
  "Bergabung",
  "Aksi",
];

export default function AdminUsers() {
  const [users, setUsers] = useState(MOCK_USERS_LIST);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [alert, setAlert] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || u.status === filterStatus;
    return matchSearch && matchStatus;
  });

  function showAlert(type, msg) {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 3000);
  }

  function handleDelete(id) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setShowDeleteModal(null);
    showAlert("success", "Pengguna berhasil dihapus.");
  }

  function handleToggleStatus(id) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, status: u.status === "active" ? "inactive" : "active" }
          : u,
      ),
    );
    showAlert("success", "Status pengguna berhasil diperbarui.");
  }

  function handleSaveUser() {
    if (editUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editUser.id ? { ...u, ...form, status: form.status } : u,
        ),
      );
      showAlert("success", "Data pengguna berhasil diperbarui.");
    } else {
      const newUser = {
        id: `u${Date.now()}`,
        avatar: form.name.slice(0, 2).toUpperCase(),
        coursesCompleted: 0,
        lastActive: new Date().toISOString().split("T")[0],
        joinDate: new Date().toISOString().split("T")[0],
        name: form.name,
        email: form.email,
        phone: form.phone,
        profile: form.profile,
        status: form.status,
      };
      setUsers((prev) => [...prev, newUser]);
      showAlert("success", "Pengguna baru berhasil ditambahkan.");
    }
    setShowAddModal(false);
    setEditUser(null);
    setForm(EMPTY_FORM);
  }

  function openEdit(user) {
    setEditUser(user);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      profile: user.profile,
      status: user.status,
    });
    setShowAddModal(true);
  }

  function openAdd() {
    setEditUser(null);
    setForm(EMPTY_FORM);
    setShowAddModal(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text)]">
            Manajemen Pengguna
          </h1>
          <p className="text-[var(--text-muted)] mt-0.5">
            {users.length} pengguna terdaftar
          </p>
        </div>
        <Button onClick={openAdd}>
          <PlusIcon size={16} /> Tambah Pengguna
        </Button>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.msg}
          onClose={() => setAlert(null)}
        />
      )}

      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
            />
            <input
              type="text"
              placeholder="Cari nama atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] text-sm outline-none focus:border-[#4F8EF7] focus:ring-2 focus:ring-[#4F8EF7]/20"
            />
          </div>
          <div className="flex gap-2">
            {[
              { id: "all", label: "Semua" },
              { id: "active", label: "Aktif" },
              { id: "inactive", label: "Nonaktif" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
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

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Pengguna", value: users.length, color: "#4F8EF7" },
          {
            label: "Aktif",
            value: users.filter((u) => u.status === "active").length,
            color: "#2ECC71",
          },
          {
            label: "Nonaktif",
            value: users.filter((u) => u.status === "inactive").length,
            color: "#E74C3C",
          },
        ].map((s) => (
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

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                {TABLE_COLS.map((col) => (
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
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[var(--border-light)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#4F8EF7] rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                        {user.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text)]">
                          {user.name}
                        </p>
                        <p className="text-xs text-[var(--text-subtle)]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs text-[var(--text-muted)]">
                      {user.profile}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      variant={user.status === "active" ? "success" : "muted"}
                    >
                      {user.status === "active" ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--text)]">
                    {user.coursesCompleted}
                  </td>
                  <td className="px-4 py-4 text-xs text-[var(--text-muted)]">
                    {user.lastActive}
                  </td>
                  <td className="px-4 py-4 text-xs text-[var(--text-muted)]">
                    {user.joinDate}
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
                      <button
                        onClick={() => handleToggleStatus(user.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--warning-light)] hover:text-[#F4B400] transition-colors"
                        title={
                          user.status === "active" ? "Nonaktifkan" : "Aktifkan"
                        }
                      >
                        <EyeIcon size={14} />
                      </button>
                      <button
                        onClick={() => setShowDeleteModal(user.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--danger-light)] hover:text-[#E74C3C] transition-colors"
                        title="Hapus"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-[var(--text-subtle)]">
              <div className="text-4xl mb-3">👤</div>
              <p>Tidak ada pengguna ditemukan</p>
            </div>
          )}
        </div>
      </Card>

      {/* Add/Edit modal */}
      <Modal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditUser(null);
        }}
        title={editUser ? "Edit Pengguna" : "Tambah Pengguna Baru"}
      >
        <div className="space-y-4">
          <Input
            label="Nama Lengkap"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Nama lengkap"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="email@contoh.com"
          />
          <Input
            label="Telepon"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            placeholder="08xxxxxxxxxx"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--text)] mb-1.5 block">
                Profil Belajar
              </label>
              <select
                value={form.profile}
                onChange={(e) =>
                  setForm((p) => ({ ...p, profile: e.target.value }))
                }
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
                onChange={(e) =>
                  setForm((p) => ({ ...p, status: e.target.value }))
                }
                className="w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[#4F8EF7]"
              >
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setShowAddModal(false);
                setEditUser(null);
              }}
            >
              Batal
            </Button>
            <Button fullWidth onClick={handleSaveUser}>
              {editUser ? "Simpan Perubahan" : "Tambah Pengguna"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal
        open={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        size="sm"
      >
        <div className="text-center">
          <div className="w-14 h-14 bg-[var(--danger-light)] rounded-full flex items-center justify-center mx-auto mb-4">
            <TrashIcon size={24} className="text-[#E74C3C]" />
          </div>
          <h3 className="font-bold text-[var(--text)] mb-2">Hapus Pengguna?</h3>
          <p className="text-sm text-[var(--text-muted)] mb-5">
            Tindakan ini tidak dapat dibatalkan. Data pengguna akan dihapus
            permanen.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowDeleteModal(null)}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={() => handleDelete(showDeleteModal)}
            >
              Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
