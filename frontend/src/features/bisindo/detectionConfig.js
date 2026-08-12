const env = import.meta.env;

const numberFromEnv = (name, fallback) => {
  const value = Number(env[name]);
  return Number.isFinite(value) ? value : fallback;
};

// Semua parameter realtime sengaja dipusatkan di sini agar tuning webcam dapat
// dilakukan lewat frontend/.env.local tanpa mengubah komponen UI.
export const DETECTION_CONFIG = Object.freeze({
  // Jeda pengambilan frame. Request berikutnya tetap tidak dikirim saat request
  // sebelumnya belum selesai, sehingga AI service tidak dibanjiri request.
  inferenceIntervalMs: numberFromEnv("VITE_BISINDO_CAPTURE_INTERVAL_MS", 90),
  // Prediksi di bawah nilai ini tidak ikut voting, tetapi tidak langsung
  // menghapus kandidat yang sudah terkumpul.
  uncertainConfidence: numberFromEnv("VITE_BISINDO_UNCERTAIN_CONFIDENCE", 0.4),
  // Syarat normal untuk memasukkan sebuah huruf.
  // Held-out source-image evaluation separates 48 correct samples (minimum
  // 0.54) from one incorrect sample (0.49) at this boundary.
  minConfidence: numberFromEnv("VITE_BISINDO_MIN_CONFIDENCE", 0.5),
  minMargin: numberFromEnv("VITE_BISINDO_MIN_MARGIN", 0.05),
  // Confidence tinggi boleh memakai margin sedikit lebih kecil (hysteresis
  // keputusan), karena kelas teratas sudah sangat kuat.
  highConfidence: numberFromEnv("VITE_BISINDO_HIGH_CONFIDENCE", 0.8),
  highConfidenceMinMargin: numberFromEnv("VITE_BISINDO_HIGH_CONFIDENCE_MIN_MARGIN", 0.03),
  // Voting mayoritas: satu frame salah di jendela 5 frame tidak mereset progres.
  predictionWindow: numberFromEnv("VITE_BISINDO_PREDICTION_WINDOW", 5),
  minimumVotes: numberFromEnv("VITE_BISINDO_MINIMUM_VOTES", 3),
  stableDurationMs: numberFromEnv("VITE_BISINDO_STABLE_DURATION_MS", 180),
  // Jalur cepat hanya untuk prediksi yang benar-benar tegas.
  fastConfidence: numberFromEnv("VITE_BISINDO_FAST_CONFIDENCE", 0.85),
  fastMargin: numberFromEnv("VITE_BISINDO_FAST_MARGIN", 0.15),
  fastVotes: numberFromEnv("VITE_BISINDO_FAST_VOTES", 2),
  fastWindow: numberFromEnv("VITE_BISINDO_FAST_WINDOW", 3),
  // Ambang KEEP lebih rendah daripada ENTER agar gerakan yang sedang ditahan
  // tidak dianggap lepas hanya karena satu penurunan confidence.
  keepConfidence: numberFromEnv("VITE_BISINDO_KEEP_CONFIDENCE", 0.4),
  releaseDurationMs: numberFromEnv("VITE_BISINDO_RELEASE_DURATION_MS", 180),
  releaseVotes: numberFromEnv("VITE_BISINDO_RELEASE_VOTES", 2),
  duplicateCooldownMs: numberFromEnv("VITE_BISINDO_DUPLICATE_COOLDOWN_MS", 250),
  smoothingAlpha: numberFromEnv("VITE_BISINDO_SMOOTHING_ALPHA", 0.45),
  maxOutputLength: numberFromEnv("VITE_BISINDO_MAX_OUTPUT_LENGTH", 500),
  debug: env.VITE_BISINDO_DEBUG === "true",
});
