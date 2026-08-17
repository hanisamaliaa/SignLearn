# Kode reset password lewat email

Tanggal: 2026-08-17

## Masalah

`authService.js` memuat `TODO(BE): kirim email berisi tautan reset`. Token
reset dibuat dan disimpan dengan benar, tetapi tidak pernah sampai ke
penggunanya: di produksi endpoint mengembalikan `null`, sehingga siapa pun yang
lupa kata sandinya tidak punya jalan masuk kembali.

## Keputusan

1. **Kode 6 digit, bukan tautan.** Diketik langsung dari layar HP tanpa
   berpindah aplikasi, dan tetap bisa dipakai kalau email dibuka di perangkat
   lain.
2. **SMTP umum lewat Nodemailer.** Satu adapter untuk Gmail, Zoho, Brevo,
   Mailtrap, atau SMTP kampus; berpindah vendor cukup mengganti `.env`.
3. **Masa berlaku dipendekkan 30 → 15 menit** dan percobaan dibatasi 5 kali.

## Celah yang ditutup

`findValidByHash(hash(token))` mencari hanya berdasarkan hash, tanpa tahu
pemiliknya. Untuk token acak 32 byte itu aman. Untuk kode 6 digit — 10⁶
kemungkinan — penyerang dapat menebak membabi buta tanpa menargetkan siapa pun,
dan satu tebakan yang cocok membuka reset milik pengguna mana saja yang sedang
aktif. Peluangnya membesar seiring jumlah pengguna yang sedang mereset.

Karena itu:

- `token_hash` menyimpan SHA-256 dari `userId:kode`, sehingga kode yang sama
  untuk pengguna berbeda menghasilkan hash berbeda.
- Pencarian selalu `WHERE user_id = $1 AND token_hash = $2`, jadi permintaan
  reset wajib menyertakan email.
- Kolom baru `attempts SMALLINT NOT NULL DEFAULT 0` membakar kode setelah lima
  tebakan salah.

Tanpa ketiganya, 1 juta kemungkinan dapat dihabiskan mesin dalam hitungan
menit.

## Pengirim email

`backend/src/services/mailer.js` — satu tanggung jawab: mengirim. Ia tidak
mengetahui apa pun tentang reset password selain menerima kode yang sudah jadi.

```
SMTP_HOST terisi  -> kirim lewat Nodemailer
SMTP_HOST kosong  -> mode log: cetak ke konsol, tidak melempar galat
```

Mode log membuat `npm run dev` berjalan di mesin mana pun tanpa kredensial, dan
menjaga pengujian tidak pernah menyentuh jaringan.

**Kegagalan pengiriman tidak menggagalkan permintaan.** Respons tetap identik
apa pun hasilnya, karena membedakan berhasil dan gagal akan membocorkan email
mana yang memiliki akun. Galat dicatat di log server.

Konsekuensinya diakui: bila SMTP mati, pengguna menunggu email yang tidak
datang dan hanya log yang mengetahuinya.

## Pembatasan laju

`forgotPasswordLimiter` membatasi 3 permintaan per jam per IP. Ditambah
pembatas **per-email**, mengikuti pola `loginEmailLimiter` yang sudah ada:
tanpa itu penyerang dengan banyak IP dapat membanjiri satu kotak masuk.

## Alur

```
/forgot-password   isi email -> "Bila terdaftar, kode telah dikirim"
                               (di luar produksi kode tampil di layar)
       |
/reset-password    email + kode 6 digit + kata sandi baru
       |
   kata sandi diganti, SELURUH sesi dicabut, kode ditandai terpakai
```

Kode kedaluwarsa, sudah terpakai, dan habis percobaan menjawab dengan pesan
yang sama. Membedakannya memberi tahu penyerang bahwa kodenya pernah benar.

## Pengujian

- Pembangkit kode: selalu enam digit termasuk nol di depan, memakai
  `crypto.randomInt`, bukan `Math.random`.
- Pengikatan hash: kode sama dengan pengguna berbeda menghasilkan hash berbeda.
- Validator: menolak kode lima digit, huruf, spasi, dan kosong.
- Mailer mode log tidak melempar galat dan tidak menyentuh jaringan.
- Alur utuh: kirim -> lima kode salah -> kode hangus -> minta ulang -> kode
  benar -> kata sandi lama ditolak, kata sandi baru diterima.

## Di luar cakupan

Verifikasi email saat pendaftaran, notifikasi email lain, dan template HTML
berdesain. Email dikirim sebagai teks biasa disertai HTML sederhana; klien
email sangat beragam, dan teks yang pasti terbaca lebih berguna daripada tata
letak yang mungkin rusak.
