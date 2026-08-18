import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Badge, Button, Card } from "../../components/ui/ui";
import { useApp } from "../../context/app";
import { subscriptionService } from "../../services";

const money = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function PremiumCheckout() {
  const navigate = useNavigate();
  const { currentUser, subscriptionState, subscriptionLoading } = useApp();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const plan = subscriptionState?.plans?.[0];
  const paymentReady = Boolean(subscriptionState?.paymentConfigured);
  const isSandbox = subscriptionState?.paymentEnvironment === "sandbox";

  async function pay() {
    if (!plan || !paymentReady || creating) return;
    setCreating(true);
    setError("");
    try {
      const result = await subscriptionService.checkout(plan.id);
      window.location.assign(result.checkout.redirectUrl);
    } catch (failure) {
      setError(
        failure?.message ||
          "Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.",
      );
      setCreating(false);
    }
  }

  if (subscriptionLoading) {
    return (
      <div className="premium-checkout-page space-y-5">
        <div className="flex items-center gap-3 text-[var(--text-muted)]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          <span>Memeriksa paket...</span>
        </div>
      </div>
    );
  }

  const initials = currentUser?.name
    ? currentUser.name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="premium-checkout-page space-y-5">
      <button
        type="button"
        onClick={() => navigate("/premium")}
        className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
      >
        ← Kembali
      </button>

      <div className="checkout-heading">
        <Badge variant="success">Checkout Aman</Badge>
        <h1>Selesaikan Pembayaran</h1>
        <p>Periksa detail pesanan sebelum mengaktifkan SignLearn Premium.</p>
      </div>

      <ol className="checkout-steps" aria-label="Tahapan checkout">
        <li className="is-complete"><span>1</span><strong>Pilih Paket</strong></li>
        <li className="is-active"><span>2</span><strong>Pembayaran</strong></li>
        <li><span>3</span><strong>Selesai</strong></li>
      </ol>

      {isSandbox && <Badge variant="outline" size="md">Sandbox</Badge>}

      {!paymentReady && (
        <Alert
          type="warning"
          message="Pembayaran sedang tidak tersedia. Silakan coba kembali beberapa saat lagi."
        />
      )}

      {error && <Alert type="danger" message={error} />}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <div className="checkout-section-heading">
            <span className="checkout-section-number">1</span>
            <div>
              <h2>Informasi akun</h2>
              <p>Akses Premium akan diterapkan ke akun berikut.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary-solid)] text-sm font-semibold text-white">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-[var(--text)]">{currentUser?.name}</p>
              <p className="text-sm text-[var(--text-muted)]">{currentUser?.email}</p>
            </div>
          </div>

          <hr />

          <div className="checkout-section-heading">
            <span className="checkout-section-number">2</span>
            <div>
              <h2>Metode pembayaran</h2>
              <p>Pilih layanan checkout untuk menyelesaikan pesanan.</p>
            </div>
          </div>
          <div className="checkout-payment-option is-selected" aria-label="Metode pembayaran terpilih">
            <span className="checkout-payment-mark" aria-hidden="true">SL</span>
            <div>
              <strong>SignLearn Checkout</strong>
              <small>Konfirmasi cepat dan akses langsung aktif</small>
            </div>
            <span className="checkout-option-check" aria-hidden="true">✓</span>
          </div>

          <div className="checkout-assurances">
            <span>✓ Pembayaran satu kali</span>
            <span>✓ Tanpa perpanjangan otomatis</span>
            <span>✓ Aktivasi Premium langsung</span>
          </div>
        </Card>

        <Card className="checkout-summary-card">
          <Badge variant="warning">Premium {plan?.durationDays ?? 30} Hari</Badge>
          <h2>Ringkasan Pesanan</h2>

          <div className="checkout-line-item">
            <div>
              <strong>SignLearn Premium</strong>
              <span>Akses selama {plan?.durationDays ?? 30} hari</span>
            </div>
            <strong>{money.format(plan?.price ?? 29000)}</strong>
          </div>

          <div className="checkout-total">
            <span>Total Pembayaran</span>
            <strong>{money.format(plan?.price ?? 29000)}</strong>
          </div>

          <Button fullWidth size="lg" disabled={!plan || creating || !paymentReady} onClick={pay}>
            {creating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Menyiapkan pembayaran...
              </>
            ) : paymentReady ? (
              "Lanjutkan Pembayaran"
            ) : (
              "Pembayaran Tidak Tersedia"
            )}
          </Button>

          <div className="checkout-secure-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Pesanan diproses melalui checkout SignLearn</span>
          </div>
          <p className="checkout-terms">
            Dengan melanjutkan, Anda menyetujui pembelian paket dan ketentuan layanan SignLearn.
          </p>
        </Card>
      </div>
    </div>
  );
}
