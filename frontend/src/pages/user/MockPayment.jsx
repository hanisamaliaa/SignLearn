import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Badge, Button, Card } from "../../components/ui/ui";
import { subscriptionService } from "../../services";

const money = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function PaymentConfirmation() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!orderId) {
      setError("Nomor pesanan tidak ditemukan.");
      setLoading(false);
      return;
    }
    try {
      const result = await subscriptionService.getPaymentStatus(orderId);
      if (result.payment?.provider !== "mock") {
        setError("Transaksi ini menggunakan layanan pembayaran yang berbeda.");
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
      await subscriptionService.confirmPayment(orderId, action);
      navigate(`/premium/payment?order_id=${encodeURIComponent(orderId)}`, {
        replace: true,
      });
    } catch (failure) {
      setError(failure.message || "Konfirmasi pembayaran belum dapat diproses.");
      setSubmitting("");
    }
  }

  if (loading) {
    return (
      <div className="payment-result-wrap">
        <Card className="payment-result-card">
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--primary)] border-t-transparent" />
            <p className="text-[var(--text-muted)]">Memuat detail pembayaran...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="payment-result-wrap">
      <Card className="payment-result-card payment-confirmation-card">
        <div className="payment-confirmation-icon" aria-hidden="true">✓</div>
        <Badge variant="success">Pembayaran Aman</Badge>
        <h1>Konfirmasi Pembayaran</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Pastikan detail pesanan berikut sudah benar sebelum melanjutkan.
        </p>

        {payment && (
          <div className="payment-order-details">
            <div>
              <span>Nomor Pesanan</span>
              <strong className="break-all font-mono">{payment.orderId}</strong>
            </div>
            <div>
              <span>Paket</span>
              <strong>{payment.plan}</strong>
            </div>
            <div>
              <span>Metode</span>
              <strong>SignLearn Checkout</strong>
            </div>
            <div className="payment-order-total">
              <span>Total Pembayaran</span>
              <strong>{money.format(payment.amount)}</strong>
            </div>
          </div>
        )}

        {error && <Alert type="danger" message={error} />}

        {payment?.status === "pending" ? (
          <>
            <div className="payment-result-actions">
              <Button onClick={() => finish("complete")} disabled={Boolean(submitting)}>
                {submitting === "complete" ? "Memproses..." : "Bayar & Aktifkan Premium"}
              </Button>
              <Button variant="secondary" onClick={() => finish("cancel")} disabled={Boolean(submitting)}>
                {submitting === "cancel" ? "Membatalkan..." : "Batalkan Pesanan"}
              </Button>
            </div>
            <p className="payment-confirmation-note">
              Premium akan aktif segera setelah pembayaran berhasil dikonfirmasi.
            </p>
          </>
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
