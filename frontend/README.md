# SignLearn Frontend

Single-page application React untuk halaman publik, pembelajaran BISINDO, administrasi konten, dan antarmuka kamera realtime.

[Kembali ke dokumentasi utama](../README.md)

## Gambaran umum

Frontend menggunakan REST API SignLearn sebagai sumber data akun, kursus, kuis, progres, laporan, dan bank kata. Untuk kamera-ke-teks, browser mengirim frame langsung ke layanan AI; backend aplikasi tidak dilewati oleh jalur inferensi tersebut.

## Teknologi

| Teknologi | Penggunaan |
| --- | --- |
| React 19 | Komponen dan context aplikasi |
| React Router 7 | Routing publik dan role-protected routes |
| Vite 8 | Development server, proxy AI, dan production build |
| Tailwind CSS 4 | Utility styling melalui plugin Vite |
| Axios | REST API client dan interceptor autentikasi |
| Framer Motion | Animasi antarmuka dengan dukungan reduced motion |
| oxlint | Static lint |
| Node test runner | Unit test tanpa test runner tambahan |

## Struktur direktori

```text
frontend/
├── public/             # Asset browser statis
├── scripts/            # Script maintenance frontend
├── src/
│   ├── assets/         # Logo, avatar, dan karakter
│   ├── components/     # UI, layout, autentikasi, landing, dan admin
│   ├── config/         # Navigasi dan konfigurasi aksesibilitas
│   ├── constants/      # Konstanta aplikasi, termasuk nilai minimum kuis
│   ├── context/        # Auth/data, settings, theme, dan accessibility
│   ├── data/           # Konten mock untuk presentasi UI
│   ├── features/       # Pipeline stabilisasi pengenalan BISINDO
│   ├── hooks/          # Hook data, navigasi, motion, dan kamera
│   ├── pages/          # Halaman publik, pengguna, dan administrator
│   ├── routes/         # Definisi route dan pembatasan peran
│   ├── services/       # Backend API dan AI service clients
│   ├── styles/         # Stylesheet global dan responsive states
│   └── utils/          # Storage dan helper validasi
├── .env.example
├── package.json
└── vite.config.js
```

## Halaman dan route

### Publik

| Route | Halaman |
| --- | --- |
| `/` | Landing page, text-to-BISINDO, dan camera-to-text |
| `/login` | Login |
| `/register` | Registrasi akun `user` |
| `/forgot-password` | Permintaan reset kata sandi |
| `/parent-guide` | Panduan orang tua |
| `/about-bisindo` | Informasi BISINDO |
| `/privacy-policy` | Kebijakan privasi |

### Pembelajar (`user`)

| Route | Halaman |
| --- | --- |
| `/dashboard` | Ringkasan pembelajaran |
| `/courses` | Daftar kursus |
| `/course-detail` | Detail kursus dan status pelajaran |
| `/lesson` | Konten pelajaran |
| `/dictionary` | Kamus alfabet A-Z dan bank kata terkelompok |
| `/translator` | Teks/suara ke ejaan BISINDO dan kamera BISINDO ke teks |
| `/quiz` | Kuis fullscreen |
| `/quiz-result` | Hasil kuis |
| `/progress` | Progres, nilai, dan pencapaian |
| `/profile` | Profil dan perubahan kata sandi |
| `/settings` | Preferensi pengguna dan tampilan |

### Administrator (`admin`)

| Route | Halaman |
| --- | --- |
| `/admin/dashboard` | Statistik dan aktivitas |
| `/admin/users` | Administrasi pengguna |
| `/admin/courses` | CRUD kursus |
| `/admin/lessons` | CRUD serta urutan pelajaran |
| `/admin/quizzes` | CRUD kuis dan pertanyaan |
| `/admin/translations` | CRUD dan preview bank kata |
| `/admin/reports` | Laporan progres dan hasil kuis |
| `/admin/settings` | Pengaturan portal admin |

`ProtectedRoute` menunggu pemulihan sesi sebelum merender halaman privat. `RoleBasedLayout` mencegah `user` membuka portal admin dan sebaliknya. Route yang tidak dikenal mengarahkan pengguna ke landing page atau dashboard yang sesuai dengan sesi aktif.

## Komponen dan layout

- `PortalLayout`, `PortalHeader`, dan `PortalSidebar` membentuk shell portal pengguna/admin.
- `AccessibilityMenu` menyediakan dialog preferensi aksesibilitas yang digunakan dari halaman publik maupun portal.
- `BisindoTranslator` menyediakan tab teks/suara-ke-ejaan-BISINDO dan kamera-ke-teks.
- `Dictionary` menampilkan 26 kartu HD dari lembar BISINDO yang disetujui proyek serta kata aktif dari API, dikelompokkan per kategori.
- `CameraPracticePanel` menampilkan permission state, pratinjau kamera, status deteksi, dan hasil stabil.
- `ProtectedRoute` dan `RoleBasedLayout` menangani auth/role guard.
- `components/ui/ui.jsx` berisi primitive UI seperti dialog, toggle, toast, badge, dan tombol.

## State management

Frontend tidak memakai Redux atau store eksternal. State dibagi melalui React Context:

| Context | Tanggung jawab |
| --- | --- |
| `AppProvider` | Sesi, pengguna, kursus, progres, kuis, dan jembatan service ke UI |
| `AccessibilityProvider` | Ukuran teks, kontras, motion, subtitle, focus mode, dan tema |
| `ThemeProvider` | Facade kompatibilitas tema/font untuk halaman portal |
| `SettingsProvider` | State UI untuk notifikasi, privasi, keamanan, dan bahasa |

Data akun, konten, progres, dan profil berasal dari backend. Preferensi pada
`SettingsProvider` saat ini hanya diperbarui pada objek pengguna di memori dan
belum memiliki endpoint persistensi; nilainya kembali ke default setelah sesi
dimuat ulang. Preferensi aksesibilitas dan email yang dipilih pada opsi “ingat
saya” disimpan di `localStorage`; access token tidak disimpan di sana.

## Autentikasi

1. `authService` mengirim login atau registrasi ke backend.
2. Access token disimpan dalam variabel module di memori.
3. Axios memasang `Authorization: Bearer <token>` pada request berikutnya.
4. Refresh token dikelola browser sebagai cookie `HttpOnly` karena API client memakai `withCredentials: true`.
5. Saat menerima `TOKEN_EXPIRED` atau `TOKEN_MISSING`, interceptor menjalankan satu refresh request bersama (single-flight), memperbarui token, lalu mencoba request sekali lagi.
6. Token invalid atau refresh gagal mengakhiri sesi frontend.

Pemulihan sesi saat reload juga memakai single-flight agar React Strict Mode tidak mengirim dua rotasi refresh token bersamaan.

## Integrasi API

### Backend aplikasi

Base URL dibaca dari `VITE_API_BASE_URL` dengan nilai contoh `http://localhost:4788/api/v1`. Service dipisahkan berdasarkan domain:

- `authService` — autentikasi dan sesi;
- `userService` — profil dan administrasi pengguna;
- `courseService`, `lessonService`, `quizService` — konten belajar;
- `progressService` — progres dan dashboard pengguna;
- `adminService` — statistik, aktivitas, hasil kuis, dan laporan;
- `translationService` — bank kata BISINDO.

Respons sukses dibuka dari envelope backend sehingga page menerima nilai `data`, bukan objek Axios lengkap. Error jaringan, timeout, dan error API dinormalisasi menjadi `{ status, code, message, errors? }`.

### Layanan AI

`bisindoRecognitionService` mengirim `Blob` JPEG langsung ke:

```text
${VITE_BISINDO_AI_URL || "/bisindo-ai"}/predict
```

Saat development, proxy Vite mengubah `/bisindo-ai/predict` menjadi `http://127.0.0.1:8000/api/v1/predict`. Untuk production, isi `VITE_BISINDO_AI_URL` dengan base URL publik yang berakhir pada prefix API yang sesuai.

## Pipeline kamera BISINDO

`useBisindoRecognition`:

1. membaca frame aktif dari elemen `<video>`;
2. membatasi lebar frame ke 640 piksel;
3. membuat JPEG dengan quality `0.72`;
4. mencegah request inferensi yang saling tumpang tindih;
5. mengirim frame secara periodik sesuai konfigurasi;
6. membatalkan request dan interval saat komponen dilepas.

`PredictionStabilizer` kemudian menerapkan:

- exponential moving average pada probabilitas;
- rolling prediction window dan voting minimum;
- threshold confidence serta margin top-1/top-2;
- jalur penerimaan cepat untuk prediksi yang sangat kuat;
- stable duration;
- duplicate-release lock agar satu pose tidak menulis huruf berulang;
- batas panjang output.

Frame mentah tidak pernah langsung ditambahkan ke teks hasil. Spasi, penghapusan karakter terakhir, dan clear dipicu secara eksplisit oleh kontrol UI.

## Aksesibilitas

Implementasi aksesibilitas mencakup:

- tema terang dan gelap;
- ukuran teks `normal`, `large`, dan `extra-large` dengan aturan reflow;
- mode kontras tinggi;
- preferensi reduced motion serta penghormatan terhadap `prefers-reduced-motion`;
- toggle subtitle yang mengatur track caption/subtitle pada elemen video;
- focus mode yang menyembunyikan dekorasi dan bagian sekunder;
- focus ring `:focus-visible` dan target kontrol minimum pada area utama;
- dialog dengan `role="dialog"`, `aria-modal`, Escape close, focus trap, dan focus restoration;
- tab translator yang mendukung tombol panah;
- label, status live, progressbar, error per-field, dan state `aria-*` pada kontrol penting;
- layout responsif untuk landing page, portal, dialog, tabel, dan navigasi seluler.

Preferensi aksesibilitas disanitasi sebelum diterapkan dan disimpan di `localStorage` dengan satu model state untuk route publik maupun portal.

Implementasi tersebut merupakan upaya engineering berorientasi WCAG 2.2 AA, bukan klaim sertifikasi formal. Lihat [`TESTING_REPORT.md`](../TESTING_REPORT.md).

## Environment variables

| Variabel | Fungsi | Nilai contoh |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Base URL REST API, termasuk `/api/v1` | `http://localhost:4788/api/v1` |
| `VITE_API_TIMEOUT_MS` | Timeout request backend dalam milidetik | `10000` |
| `VITE_API_MOCK_MODE` | Mengaktifkan fixture mock eksplisit | `false` |
| `VITE_BISINDO_AI_URL` | Base URL AI; kosong memakai proxy Vite | kosong |
| `VITE_BISINDO_DEBUG` | Telemetry dan top-three prediction | `false` |

Variabel `VITE_BISINDO_*` lain mengatur interval capture, confidence, margin, voting, smoothing, stable/release duration, duplicate cooldown, dan panjang output. Gunakan [`frontend/.env.example`](.env.example) sebagai sumber nilai lengkap; hindari mengubah beberapa threshold tanpa menguji kombinasi keseluruhan.

Vite juga membaca `PORT` dari environment proses untuk development/preview. Jika tidak ada, port frontend adalah `4789`.

## Instalasi

Dari root repository:

```bash
npm --prefix frontend install
cp frontend/.env.example frontend/.env.local
```

## Development server

```bash
npm run dev:frontend
```

Atau dari direktori `frontend/`:

```bash
npm run dev
```

Development server menggunakan `http://localhost:4789` dan `strictPort: true`.

## Build dan preview

```bash
npm run build:frontend
npm --prefix frontend run preview
```

Output produksi ditulis ke `frontend/dist/`.

## Lint dan test

```bash
npm run lint:frontend
npm --prefix frontend test
```

Unit test frontend mencakup:

- sanitasi/reset preferensi aksesibilitas;
- konfigurasi navigasi landing;
- EMA, majority voting, threshold, dan release lock pada prediksi BISINDO;
- operasi buffer terjemahan.
- pemisahan kata/ejaan A-Z, pencarian kamus, dan pengelompokan kategori.

`npm run assets:bisindo` memotong ulang canvas yang telah disetujui dan hash-nya
dikunci, menghasilkan 26 WebP lossless 1024×1024 beserta manifest verifikasi.
Rincian atribusi tersimpan bersama aset.

Pengujian kamera fisik, matrix browser/device, dan audit aksesibilitas formal tetap membutuhkan QA manual.

## Troubleshooting

### REST API selalu gagal

- Pastikan `VITE_API_BASE_URL` memuat `/api/v1`.
- Pastikan backend berjalan pada port yang sama.
- Pada deployment production, periksa `CORS_ORIGINS` backend.
- Pastikan `VITE_API_MOCK_MODE=false` bila tidak menyediakan fixture mock.
- Restart Vite setelah mengubah file environment.

### AI membalas 404

Saat development, kosongkan `VITE_BISINDO_AI_URL` agar request memakai proxy. Jika memakai URL eksplisit, arahkan ke base yang membuat `/predict` menjadi endpoint `/api/v1/predict` pada layanan AI.

### Kamera ditolak atau kosong

- Berikan permission kamera pada browser.
- Gunakan `localhost` atau HTTPS.
- Pastikan tidak ada aplikasi lain yang mengunci kamera.
- Buka `http://localhost:8000/api/health` untuk memeriksa model AI.

### Vite menolak start karena port digunakan

Port tidak berpindah otomatis. Hentikan proses pada `4789`, atau ubah `PORT`;
untuk production, sesuaikan juga `CORS_ORIGINS` backend.

### Sesi hilang setelah backend restart

Jika `JWT_ACCESS_SECRET` tidak diatur pada development, backend membuat secret acak sementara setiap start. Isi secret stabil minimal 32 karakter di `backend/.env`.

## Dokumentasi terkait

- [Dokumentasi utama](../README.md)
- [Backend](../backend/README.md)
- [AI](../ai/README.md)
- [Testing report](../TESTING_REPORT.md)
