import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Badge, Button, Card } from "../../components/ui/ui";
import { subscriptionService } from "../../services";

const money = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateFmt = (v) =>
  v
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(v))
    : "—";

const statusVariant = (s) => {
  if (s === "paid") return "success";
  if (s === "pending") return "warning";
  if (s === "expired" || s === "cancelled") return "muted";
  return "danger";
};

const statusLabel = (s) => {
  if (s === "paid") return "Berhasil";
  if (s === "pending") return "Menunggu";
  if (s === "expired") return "Kedaluwarsa";
  if (s === "cancelled") return "Dibatalkan";
  if (s === "failed") return "Gagal";
  return s;
};

export default function Subscription() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      subscriptionService.getSubscription(),
      subscriptionService.getPaymentHistory(),
    ])
      .then(([s, h]) => {
        setData(s);
        setHistory(h.items ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-3 text-[var(--text-muted)]">
          <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <span>Memuat langganan...</span>
        </div>
      </Card>
    );
  }

  const days = data?.subscription?.endDate
    ? Math.max(
        0,
        Math.ceil(
          (new Date(data.subscription.endDate) - Date.now()) / 86400000
        )
      )
    : 0;
  const extensionPolicy = data?.extensionPolicy;
  const canExtend = Boolean(extensionPolicy?.canExtend);
  const maxDays = extensionPolicy?.maxAdvanceDays ?? 180;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-[var(--text)]">
        Langganan Saya
      </h1>

      {error && <Alert type="danger" message={error} />}

      <Card className="subscription-hero">
        <div>
          <Badge variant={data?.isPremium ? "warning" : "muted"}>
            {data?.isPremium ? "⭐ PREMIUM AKTIF" : "FREE"}
          </Badge>
          <h2>
            {data?.isPremium
              ? `${days} hari tersisa`
              : "Akun Free"}
          </h2>
          <p>
            {data?.isPremium
              ? `Aktif hingga ${dateFmt(data.subscription.endDate)}`
              : "Semua materi tetap gratis; quiz memerlukan Premium."}
          </p>
        </div>
        <Button
          onClick={() => navigate(data?.isPremium ? "/premium/checkout" : "/premium")}
          disabled={Boolean(data?.isPremium) && !canExtend}
        >
          {data?.isPremium
            ? canExtend
              ? "Tambah 30 Hari"
              : "Batas Masa Aktif Tercapai"
            : "Lihat Premium"}
        </Button>
      </Card>

      {data?.isPremium && (
        <Card className="subscription-policy-card">
          <div>
            <Badge variant={canExtend ? "success" : "warning"}>
              {canExtend ? "DAPAT DIPERPANJANG" : "BATAS 180 HARI"}
            </Badge>
            <h2>Perpanjangan fleksibel, tanpa tagihan otomatis</h2>
            <p>
              Setiap pembelian menambah 30 hari dari tanggal berakhir saat ini.
              Masa aktif dapat disimpan hingga maksimal {maxDays} hari ke depan.
            </p>
          </div>
          <div className="subscription-policy-meter" aria-label={`${Math.min(days, maxDays)} dari ${maxDays} hari masa aktif`}>
            <div className="subscription-policy-meter-copy">
              <span>Masa aktif tersimpan</span>
              <strong>{days} / {maxDays} hari</strong>
            </div>
            <div className="subscription-policy-track">
              <span style={{ width: `${Math.min(100, (days / maxDays) * 100)}%` }} />
            </div>
            {!canExtend && (
              <small>Kamu bisa menambah 30 hari lagi setelah sisa masa aktif menjadi 150 hari atau kurang.</small>
            )}
          </div>
        </Card>
      )}

      <Card padding="none">
        <div className="p-4">
          <h2 className="font-bold text-[var(--text)]">Riwayat Pembayaran</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-word-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Paket</th>
                <th>Jumlah</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {history.length ? (
                history.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-xs">{p.orderId}</td>
                    <td>{p.plan}</td>
                    <td>{money.format(p.amount)}</td>
                    <td>{p.provider === "mock" ? "SignLearn Checkout" : "Midtrans"}</td>
                    <td>
                      <Badge variant={statusVariant(p.status)}>
                        {statusLabel(p.status)}
                      </Badge>
                    </td>
                    <td>{dateFmt(p.paidAt ?? p.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">Belum ada pembayaran.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
