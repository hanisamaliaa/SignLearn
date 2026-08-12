# SignLearn BISINDO AI Service

Layanan ini memisahkan inferensi BISINDO dari backend aplikasi. Browser
mengirim frame JPEG, MediaPipe mengekstrak 126 koordinat landmark dari maksimal
dua tangan, kemudian Random Forest mengembalikan huruf A-Z dan confidence.

## Persyaratan

- Python 3.10-3.12 (disarankan 3.12; MediaPipe belum mendukung semua versi baru)
- Model `models/rf_bisindo_99.pkl`

## Menjalankan lokal

```bash
cd ai
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Periksa layanan melalui `http://localhost:8000/api/health`. Dokumentasi API
interaktif tersedia di `http://localhost:8000/docs`.

## Endpoint inferensi

`POST /api/v1/predict` menerima isi gambar secara langsung dengan header
`Content-Type: image/jpeg`. Respons:

```json
{
  "detected": true,
  "label": "A",
  "confidence": 0.94,
  "handsDetected": 1,
  "probabilities": { "A": 0.94, "B": 0.01 },
  "secondLabel": "B",
  "margin": 0.93
}
```

Model hanya mengenali alfabet statis A-Z. Pemisahan kata dan stabilisasi hasil
dilakukan oleh frontend. Seluruh probabilitas kelas dikirim agar frontend dapat
melakukan EMA, voting mayoritas, dan menampilkan ranking hanya dalam debug mode.

## Dataset, training, dan evaluasi

Dataset publik yang digunakan adalah `achmadnoer/alfabet-bisindo` dari Kaggle.
Tidak diperlukan `kaggle.json`; downloader memakai endpoint dataset publik.

```bash
cd ai
source .venv/bin/activate
python -m training.download_dataset --output data/raw
python -m training.train \
  --data "data/raw/Citra BISINDO" \
  --manifest data/splits/manifest.json \
  --output models/candidates \
  --augmentations 12
python -m training.evaluate \
  --manifest data/splits/manifest.json \
  --old-model models/rf_bisindo_99.pkl \
  --new-model models/candidates/extra_trees_normalized.pkl \
  --output reports/model_comparison.json
```

Pipeline membuat split dari 312 gambar asli terlebih dahulu. Hanya gambar
train yang diaugmentasi. Validation dan test tidak disentuh. Augmentasi dibuat
ringan untuk kondisi webcam dan tidak menggunakan horizontal flip. Model baru
hanya boleh dipromosikan setelah `model_comparison.json` menunjukkan peningkatan
yang layak pada test asli yang sama. Laporan evaluasi juga menyimpan distribusi
confidence prediksi benar/salah dan grid kalibrasi confidence-margin.

Untuk mengumpulkan validasi webcam dunia nyata, simpan gambar per kelas di
`data/real_world/<LABEL>/`. Jangan masukkan direktori tersebut ke training.
