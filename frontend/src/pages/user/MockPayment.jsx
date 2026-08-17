import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Badge, Button, Card } from "../../components/ui/ui";
import { subscriptionService } from "../../services";

const money = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function MockPayment() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!orderId) {
      setError("Order ID tidak ditemukan.");
      setLoading(false);
      return;
    }
    try {
      const result = await subscriptionService.getPaymentStatus(orderId);
      if (result.payment?.provider !== "mock") {
        setError("Transaksi ini bukan checkout simulasi.");
        return;
      }
      setPayment(result.payment);
    } catch (failure) {
      setError(failure.message || "Transaksi tidak dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  async function finish(action) {
    if (!orderId || submitting) return;
    setSubmitting(action);
    setError("");
    try {
      await subscriptionService.confirmMockPayment(orderId, action);
      navigate(`/premium/payment?order_id=${encodeURIComponent(orderId)}`, {
        replace: true,
      });
    } catch (failure) {
      setError(failure.message || "Simulasi belum dapat diproses.");
      setSubmitting("");
    }
  }

  if (loading) {
    return (
      <div className="payment-result-wrap">
        <Card className="payment-result-card">
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--primary)] border-t-transparent" />
            <p className="text-[var(--text-muted)]">Memuat simulasi checkout...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="payment-result-wrap">
      <Card className="payment-result-card">
        <div className="text-5xl" aria-hidden="true">🧪</div>
        <Badge variant="warning">MODE DEMO</Badge>
        <h1>Simulasi Pembayaran</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Tidak ada kartu, rekening, atau uang nyata yang digunakan pada halaman ini.
        </p>

        {payment && (
          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left">
            <p className="text-xs text-[var(--text-muted)]">Order ID</p>
            <p className="break-all font-mono text-sm font-bold text-[var(--text)]">{payment.orderId}</p>
            <p className="mt-3 text-xs text-[var(--text-muted)]">Paket</p>
            <p className="font-bold text-[var(--text)]">{payment.plan}</p>
            <p className="mt-3 text-xs text-[var(--text-muted)]">Nilai simulasi</p>
            <p className="text-xl font-extrabold text-[var(--text)]">{money.format(payment.amount)}</p>
          </div>
        )}

        {error && <Alert type="danger" message={error} />}

        {payment?.status === "pending" ? (
          <div className="payment-result-actions">
            <Button onClick={() => finish("complete")} disabled={Boolean(submitting)}>
              {submitting === "complete" ? "Mengaktifkan..." : "Simulasikan Berhasil"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => finish("cancel")}
              disabled={Boolean(submitting)}
            >
              {submitting === "cancel" ? "Membatalkan..." : "Batalkan Simulasi"}
            </Button>
          </div>
        ) : payment ? (
          <Button
            onClick={() =>
              navigate(`/premium/payment?order_id=${encodeURIComponent(orderId)}`, {
                replace: true,
              })
            }
          >
            Lihat Status Transaksi
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => navigate("/premium/checkout")}>
            Kembali ke Checkout
          </Button>
        )}
      </Card>
    </div>
  );
}
