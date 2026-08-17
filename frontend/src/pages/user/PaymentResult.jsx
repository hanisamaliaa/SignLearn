import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Badge, Button, Card } from "../../components/ui/ui";
import { useApp } from "../../context/app";
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

const views = {
  paid: {
    icon: "🎉",
    title: "Premium Aktif!",
    subtitle: "Pembayaran berhasil diverifikasi.",
    description:
      "Akunmu sekarang memiliki akses ke SignLearn Premium.",
    variant: "success",
    features: [
      "Quiz setelah setiap pelajaran",
      "Adaptive Quiz",
      "Riwayat quiz",
      "Progress detail",
      "Rekomendasi belajar",
    ],
  },
  pending: {
    icon: "⏳",
    title: "Menunggu Pembayaran",
    subtitle: "Pembayaranmu belum selesai.",
    description:
      "Selesaikan pembayaran sesuai metode yang kamu pilih.",
    variant: "warning",
  },
  failed: {
    icon: "⚠️",
    title: "Pembayaran Belum Berhasil",
    subtitle: "Pembayaran tidak dapat diselesaikan.",
    description:
      "Kamu bisa mencoba kembali tanpa kehilangan data akunmu.",
    variant: "danger",
  },
  expired: {
    icon: "⌛",
    title: "Pembayaran Kedaluwarsa",
    subtitle: "Waktu pembayaran telah berakhir.",
    description:
      "Silakan buat transaksi baru untuk melanjutkan.",
    variant: "muted",
  },
  cancelled: {
    icon: "↩️",
    title: "Pembayaran Dibatalkan",
    subtitle: "Premium belum diaktifkan.",
    description: "Kamu bisa memulai transaksi baru kapan saja.",
    variant: "muted",
  },
};

export default function PaymentResult() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const { refreshSubscription } = useApp();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const check = useCallback(
    async (isRetry = false) => {
      if (!orderId) {
        setError("Order ID tidak ditemukan.");
        setLoading(false);
        return;
      }
      if (isRetry) setVerifying(true);
      else setLoading(true);

      try {
        const result = await subscriptionService.getPaymentStatus(orderId);
        setData(result);
        if (result.payment.status === "paid") {
          await refreshSubscription();
        }
      } catch (e) {
        setError(e?.message || "Status tidak dapat diperiksa.");
      } finally {
        setLoading(false);
        setVerifying(false);
      }
    },
    [orderId, refreshSubscription]
  );

  useEffect(() => {
    check();
  }, [check]);

  if (loading) {
    return (
      <div className="payment-result-wrap">
        <Card className="payment-result-card">
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-8 h-8 border-[3px] border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-[var(--text-muted)]">Memverifikasi pembayaran...</p>
          </div>
        </Card>
      </div>
    );
  }

  const status = data?.payment?.status ?? "failed";
  const view = views[status] ?? views.failed;
  const payment = data?.payment;
  const isMock = payment?.provider === "mock";

  return (
    <div className="payment-result-wrap">
      <Card className="payment-result-card">
        <div>{view.icon}</div>
        <Badge variant={view.variant}>{isMock ? `DEMO • ${status}` : status}</Badge>
        <h1>{view.title}</h1>
        <p>{isMock && status === "paid" ? "Simulasi berhasil diproses." : view.subtitle}</p>
        <p className="text-sm text-[var(--text-muted)]">
          {isMock
            ? "Mode demo tidak menagih uang nyata. Akses Premium diaktifkan untuk kebutuhan demonstrasi."
            : view.description}
        </p>

        {status === "paid" && view.features && (
          <div className="mt-4 text-left">
            <p className="text-sm font-semibold text-[var(--text)] mb-2">
              Sekarang kamu bisa mengakses:
            </p>
            <ul className="space-y-1.5 text-sm text-[var(--text)]">
              {view.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            {data?.subscription?.endDate && (
              <p className="text-xs text-[var(--text-muted)] mt-3">
                Aktif sampai {dateFmt(data.subscription.endDate)}
              </p>
            )}
          </div>
        )}

        {payment && (
          <div className="mt-3 text-xs text-[var(--text-subtle)]">
            <p>Order: {payment.orderId}</p>
            {payment.amount && <p>{money.format(payment.amount)}</p>}
          </div>
        )}

        {error && (
          <div className="mt-3">
            <Alert type="danger" message={error} />
          </div>
        )}

        <div className="payment-result-actions">
          {status === "pending" && (
            <Button onClick={() => check(true)} disabled={verifying}>
              {verifying ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memeriksa...
                </>
              ) : (
                "Cek Status Pembayaran"
              )}
            </Button>
          )}
          {status === "paid" ? (
            <Button onClick={() => navigate("/courses")}>Mulai Belajar</Button>
          ) : status === "expired" ? (
            <Button onClick={() => navigate("/premium/checkout")}>
              Buat Pembayaran Baru
            </Button>
          ) : (
            <Button onClick={() => navigate("/premium/checkout")}>
              Coba Lagi
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => navigate("/dashboard")}
          >
            Kembali ke Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}
