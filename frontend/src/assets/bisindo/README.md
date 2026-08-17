# Aset alfabet BISINDO dari canvas yang disetujui proyek

Folder ini memuat 26 kartu WebP lossless berukuran 1024×1024 untuk huruf A–Z.
Kamus dan penerjemah memakai satu pemetaan yang sama melalui
`src/features/bisindo/alphabetImages.js`.

## Sumber dan lisensi

Sumber produksinya adalah `scripts/assets/bisindo-canvas-approved-source.png`,
hasil edit built-in imagegen dari gambar referensi pemilik proyek dan telah
disetujui di canvas. Hash sumber dikunci agar perubahan gambar tidak dapat lolos
diam-diam saat aset dibangun ulang.

Rincian frame sumber dan perubahan ada di [ATTRIBUTION.md](ATTRIBUTION.md).

## Regenerasi

Regenerasi potongan produksi:

~~~bash
npm run assets:bisindo
~~~

Setelah persetujuan, pipeline hanya mengisolasi gambar tangan dari label,
memotong, memberi padding putih, dan memperbesar dengan Lanczos. Tidak ada
generative fill, mirroring, rotasi, perubahan warna, atau penggambaran ulang
lanjutan. `MANIFEST.json` mencatat SHA-256 dan dimensi setiap kartu.

Hak penggunaan/publikasi gambar sumber tetap harus dipastikan oleh pemilik
proyek karena berkas yang diberikan tidak memuat metadata lisensi.
