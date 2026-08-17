import nodemailer from "nodemailer";
import { env } from "../config/env.js";

/**
 * Pengiriman email.
 *
 * Satu tanggung jawab: mengirim. Modul ini tidak mengetahui apa pun tentang
 * reset password selain menerima kode yang sudah jadi, sehingga pemanggilnya
 * dapat diuji tanpa SMTP dan modul ini dapat diuji tanpa basis data.
 *
 * ── Mode log ──────────────────────────────────────────────────────────
 *
 * Tanpa `SMTP_HOST`, email dicetak ke konsol alih-alih dikirim. Ini bukan
 * kemewahan: tanpa mode itu, `npm run dev` di mesin yang belum punya
 * kredensial akan gagal pada alur yang tidak sedang dikerjakan, dan pengujian
 * akan menyentuh jaringan.
 */

let transport = null;

/**
 * Transport dibuat sekali dan dipakai ulang.
 *
 * Membuatnya per email berarti membangun koneksi TLS baru setiap kali —
 * lambat, dan sebagian penyedia membatasi jumlah koneksi baru per menit.
 */
function getTransport() {
  if (!env.mail.enabled) return null;
  if (transport) return transport;

  transport = nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.secure,
    auth: env.mail.user ? { user: env.mail.user, pass: env.mail.pass } : undefined,
  });
  return transport;
}

/** Hanya untuk pengujian: memaksa transport dibangun ulang. */
export function resetTransportForTests() {
  transport = null;
}

/**
 * Mengirim satu email.
 *
 * @returns {Promise<{delivered: boolean, reason?: string}>} Tidak pernah
 *   melempar. Pemanggil di jalur autentikasi harus membalas hal yang sama
 *   entah email terkirim atau tidak; melempar galat akan memaksa mereka
 *   menangani kegagalan dengan cara yang membocorkan email mana yang
 *   terdaftar.
 */
export async function sendMail({ to, subject, text, html }) {
  const mailer = getTransport();

  if (!mailer) {
    // Sengaja mencetak isinya: inilah yang membuat alur reset dapat
    // diselesaikan saat pengembangan tanpa kredensial apa pun.
    console.info(
      `[mail] SMTP belum dikonfigurasi — email TIDAK dikirim.\n` +
      `       kepada : ${to}\n` +
      `       subjek : ${subject}\n` +
      `${text.split("\n").map((line) => `       | ${line}`).join("\n")}`,
    );
    return { delivered: false, reason: "smtp_not_configured" };
  }

  try {
    await mailer.sendMail({ from: env.mail.from, to, subject, text, html });
    return { delivered: true };
  } catch (error) {
    // Dicatat, bukan dilempar. Kalau SMTP mati, pengguna menunggu email yang
    // tidak datang dan hanya log ini yang mengetahuinya — jadi log ini perlu
    // dipantau di produksi.
    console.error(`[mail] gagal mengirim ke ${to}: ${error.message}`);
    return { delivered: false, reason: error.message };
  }
}

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);

/**
 * Email berisi kode reset kata sandi.
 *
 * Dikirim sebagai teks biasa DISERTAI HTML sederhana. Klien email sangat
 * beragam dan sebagian menolak memuat gaya; teks yang pasti terbaca lebih
 * berguna daripada tata letak yang mungkin rusak.
 */
export function sendPasswordResetCode({ to, name, code, expiresMinutes }) {
  const greeting = name ? `Halo ${name},` : "Halo,";
  const spaced = String(code).split("").join(" ");

  const text = [
    greeting,
    "",
    "Ini kode untuk mengatur ulang kata sandi SignLearn kamu:",
    "",
    `    ${spaced}`,
    "",
    `Kode berlaku ${expiresMinutes} menit dan hanya bisa dipakai sekali.`,
    "",
    "Kalau kamu tidak meminta ini, abaikan saja email ini — kata sandimu",
    "tidak berubah selama kode di atas tidak dipakai.",
    "",
    "Jangan bagikan kode ini kepada siapa pun, termasuk yang mengaku dari",
    "SignLearn. Kami tidak pernah menanyakannya.",
    "",
    "— SignLearn",
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1A2332">
      <p style="margin:0 0 16px">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 20px">Ini kode untuk mengatur ulang kata sandi SignLearn kamu:</p>
      <p style="margin:0 0 20px;font-size:32px;font-weight:800;letter-spacing:10px;text-align:center;padding:16px;background:#EAF3FF;border-radius:12px;color:#2F6FE4">
        ${escapeHtml(code)}
      </p>
      <p style="margin:0 0 16px">Kode berlaku <strong>${escapeHtml(expiresMinutes)} menit</strong> dan hanya bisa dipakai sekali.</p>
      <p style="margin:0 0 16px;color:#5A6B82;font-size:14px">
        Kalau kamu tidak meminta ini, abaikan saja email ini — kata sandimu tidak
        berubah selama kode di atas tidak dipakai.
      </p>
      <p style="margin:0;color:#5A6B82;font-size:14px">
        Jangan bagikan kode ini kepada siapa pun, termasuk yang mengaku dari
        SignLearn. Kami tidak pernah menanyakannya.
      </p>
    </div>
  `.trim();

  return sendMail({
    to,
    subject: `Kode reset kata sandi SignLearn: ${code}`,
    text,
    html,
  });
}
