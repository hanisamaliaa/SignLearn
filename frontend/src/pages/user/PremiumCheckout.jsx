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
    } catch (e) {
      setError(
        e?.message ||
          "Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi."
      );
      setCreating(false);
    }
  }

  if (subscriptionLoading) {
    return (
      <div className="premium-checkout-page space-y-5">
        <div className="flex items-center gap-3 text-[var(--text-muted)]">
          <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <span>Memeriksa paket...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-checkout-page space-y-5">
      <button
        onClick={() => navigate("/premium")}
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
      >
        ← Kembali
      </button>

      <div>
        <Badge variant="success">Checkout Aman</Badge>
        <h1>Ringkasan Pembelian</h1>
        <p>Selesaikan pembayaran untuk mengaktifkan Premium.</p>
      </div>

      {isSandbox && (
        <Badge variant="outline" size="md">
          Sandbox
        </Badge>
      )}

      {!paymentReady && (
        <Alert
          type="warning"
          message="Pembayaran sedang tidak tersedia. Kami sedang mengalami kendala pada layanan pembayaran. Silakan coba kembali beberapa saat lagi."
        />
      )}

      {error && <Alert type="danger" message={error} />}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <h2>Akun pembeli</h2>
          <div className="flex items-center gap-3 mt-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
              style={{ background: "var(--primary-solid)" }}
            >
              {currentUser?.name
                ? currentUser.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "U"}
            </div>
            <div>
              <p className="font-semibold text-[var(--text)]">
                {currentUser?.name}
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                {currentUser?.email}
              </p>
            </div>
          </div>
          <hr />
          <div className="space-y-2 text-sm text-[var(--text)]">
            <p>✓ Pembayaran satu kali</p>
            <p>✓ Tidak diperpanjang otomatis</p>
            <p>✓ Premium aktif setelah pembayaran berhasil</p>
          </div>
        </Card>

        <Card className="checkout-summary-card">
          <Badge variant="warning">Premium {plan?.durationDays ?? 30} Hari</Badge>
          <h2>SignLearn Premium</h2>

          <div className="checkout-total">
            <span>Total</span>
            <strong>{money.format(plan?.price ?? 29000)}</strong>
          </div>

          <Button
            fullWidth
            size="lg"
            disabled={!plan || creating || !paymentReady}
            onClick={pay}
          >
            {creating ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Menyiapkan pembayaran...
              </>
            ) : paymentReady ? (
              `Bayar ${money.format(plan?.price ?? 29000)}`
            ) : (
              "Coba Lagi"
            )}
          </Button>

          <div className="flex items-center justify-center gap-1.5 mt-3 text-[var(--text-subtle)] text-xs">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Pembayaran aman via Midtrans</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
