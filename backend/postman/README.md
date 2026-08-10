# Postman — SignLearn API

Koleksi resmi untuk **API Contract v1.2.0**. Mencakup **54 dari 54 rute** yang benar-benar terdaftar di `src/routes/`.

| Berkas | Isi |
|---|---|
| `SignLearn-API.postman_collection.json` | 63 request, 11 folder, skema Postman v2.1.0 |
| `SignLearn-Local.postman_environment.json` | Konfigurasi lokal. **Rahasia bertipe `secret`.** |

---

## Impor

1. Postman → **Import** → seret kedua berkas.
2. Pilih environment **SignLearn — Local** di pojok kanan atas.
3. Isi `adminPassword` dengan kata sandi yang dicetak `npm run seed`.

Backend harus berjalan (`npm run dev`) dan database sudah di-seed (`npm run seed`).

---

## Menjalankan seluruh koleksi

Urutan folder `00` → `09` disengaja: setiap folder menyiapkan variabel untuk folder berikutnya.

| Folder | Menghasilkan |
|---|---|
| `01 · Auth` | `accessToken`, `adminToken`, `userId`, `adminId` |
| `03 · Courses` | `courseId` |
| `04 · Lessons` | `lessonId` |
| `05 · Quizzes` | `quizId`, `questionId` |

Menjalankan satu request di tengah tanpa pendahulunya akan gagal karena variabelnya kosong. Itu perilaku yang diharapkan.

### Lewat Newman (CI)

```bash
npx newman@6 run postman/SignLearn-API.postman_collection.json -e postman/SignLearn-Local.postman_environment.json --env-var "adminPassword=RAHASIA"
```

Hasil terverifikasi pada PostgreSQL 16 sungguhan:

```
requests    53      failed 0
assertions  238     failed 0
```

> Jalankan server dengan **`NODE_ENV=test`**. Rate limiter register membatasi 3 pendaftaran per jam per IP; koleksi ini membuat lebih dari itu dan akan berhenti di tengah dengan `429` — kegagalan yang terlihat seperti bug padahal justru bukti limiternya bekerja.

---

## Operasi destruktif — `runDestructive`

Sepuluh request **mengubah atau menghapus data yang dipakai request lain**: hapus kursus, hapus pelajaran, hapus kuis, hapus pertanyaan, nonaktifkan pengguna, reset & ganti kata sandi, logout, logout semua perangkat.

Semuanya **dilewati secara bawaan** lewat gerbang di skrip pre-request:

```js
if (String(pm.variables.get('runDestructive')).toLowerCase() !== 'true') {
    pm.execution.skipRequest();
}
```

Tanpa gerbang ini, `Delete course` di akhir folder `03` menghapus `{{courseId}}`, lalu folder `04`-`06` gagal dengan `404` — dan koleksi merusak dirinya sendiri di tengah jalan.

### Menguji yang destruktif

Setel `runDestructive` ke `true`, lalu jalankan request itu **satu per satu**, bukan sebagai satu lintasan penuh.

Menjalankan **seluruh** koleksi dengan `runDestructive=true` akan menghasilkan 11 kegagalan, dan itu bukan bug: `Delete course` memang menghapus fixture yang masih dibutuhkan folder sesudahnya. Urutan itu tidak dapat sekaligus menguji penghapusan **dan** mempertahankan datanya.

---

## Yang diuji otomatis

**238 assertion** berjalan pada run bawaan. Sebagian melekat di tiap request; sisanya berlaku menyeluruh lewat skrip di level koleksi:

- Envelope sukses §2.2 pada seluruh `2xx`
- Envelope error §2.3 pada seluruh `4xx`/`5xx` — termasuk `code` yang stabil
- **Stack trace tidak bocor** pada error klien
- **`passwordHash` tidak pernah muncul** di respons mana pun
- Waktu respons di bawah 2000 ms

Folder `09 · Skenario Error` menguji jalur negatif: `401 TOKEN_MISSING`, `401 TOKEN_INVALID`, `403 FORBIDDEN`, `404 NOT_FOUND`, `422` per field, dan `sortBy` di luar allowlist. **Folder itu wajib hijau** — penjaga yang bocor jauh lebih berbahaya daripada fitur yang belum ada.

---

## Autentikasi

Bearer di level koleksi memakai `{{accessToken}}`. Request khusus admin menimpanya dengan `{{adminToken}}`; request publik memakai `noauth`.

**Refresh token tidak dapat disalin secara manual — memang tidak bisa, dan itu justru intinya.** Ia berupa cookie **HttpOnly** `slr_rt` yang Postman kelola sendiri di cookie jar, dibatasi ke path `/api/v1/auth` sehingga tidak ikut terkirim pada request biasa seperti `GET /courses`.

### Kenapa `Login sebagai Admin` diletakkan setelah request sesi user

Cookie jar hanya menyimpan **login terakhir**. Ketika admin login lebih dulu, `POST /auth/refresh` menukar cookie ADMIN dan menimpa `{{accessToken}}` dengan token admin — seluruh request "sebagai user" sesudahnya diam-diam berjalan sebagai admin, dan test yang seharusnya membuktikan pengguna biasa tidak dapat menaikkan perannya justru lolos karena alasan yang salah.

---

## Catatan untuk yang menyunting skrip

**Jangan mendeklarasikan `const data`.** Sandbox Postman sudah memiliki `data` bawaan (menyimpan baris data iterasi), sehingga `const data = ...` melempar `SyntaxError: Identifier 'data' has already been declared` — dan skripnya berhenti diam-diam sebelum sempat menyimpan token.

Koleksi ini memakai `payload`:

```js
const payload = pm.response.json().data;
```

Identifier bawaan lain yang harus dihindari: `environment`, `globals`, `iteration`, `request`, `response`, `tests`.

---

## Belum ada di koleksi

Endpoint berikut ada di kontrak tetapi **belum diimplementasikan**, jadi tidak dimasukkan: `/dictionary/**`, `POST /translate`, `/practice/**`, `POST /admin/media`, `GET /admin/ai/jobs/:jobId`.

`/admin/ai/subtitles` dan `/admin/ai/quiz` sudah punya rute dan **diuji membalas `501 NOT_IMPLEMENTED`** — bukan `200` palsu yang membuat frontend mengira pekerjaannya berhasil.
