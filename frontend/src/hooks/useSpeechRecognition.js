import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pengenalan ucapan bahasa Indonesia lewat Web Speech API.
 *
 * ── Mengapa bukan Google Cloud Speech-to-Text ─────────────────────────
 *
 * Web Speech API dipilih untuk kalimat pendek karena tidak membutuhkan kunci
 * API maupun endpoint unggah audio di server SignLearn. Mesin pengenalannya
 * ditentukan peramban/perangkat; beberapa peramban dapat mengirim audio ke
 * layanan milik penyedia peramban. Karena itu kebijakan privasi dan antarmuka
 * tidak boleh menjanjikan bahwa pengolahan selalu lokal.
 *
 * Dukungan peramban masih terbatas dan mikrofon membutuhkan secure context.
 * Karena itu `supported` dan alasan fallback dikembalikan secara eksplisit.
 *
 * ── Hasil sementara ───────────────────────────────────────────────────
 *
 * `interimResults` dinyalakan supaya kata-kata muncul selagi diucapkan. Tanpa
 * itu layar diam beberapa detik dan orang mengira mikrofonnya mati, lalu
 * berhenti bicara tepat sebelum hasilnya keluar.
 *
 * @param {{ lang?: string, onResult?: (text: string) => void }} options
 */
export function useSpeechRecognition({ lang = "id-ID", onResult } = {}) {
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");

  // Callback disimpan di ref supaya penggantiannya tidak membangun ulang objek
  // pengenalan — membangun ulang di tengah pengucapan akan memutus sesinya.
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  const hasApi =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const secure = typeof window !== "undefined" && window.isSecureContext;
  const supported = hasApi && secure;
  const unavailableReason = !hasApi
    ? "Input suara belum didukung peramban ini. Kamu tetap bisa mengetik."
    : !secure
      ? "Input suara hanya tersedia melalui HTTPS atau localhost. Kamu tetap bisa mengetik."
      : "";

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const cancel = useCallback(() => {
    recognitionRef.current?.abort();
  }, []);

  const start = useCallback(() => {
    if (!supported || recognitionRef.current) return;

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.interimResults = true;
    // Satu kalimat lalu berhenti sendiri. Mode berkelanjutan membuat mikrofon
    // tetap menyala tanpa batas — pada aplikasi anak itu tidak pantas.
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      setInterim(interimText);
      if (finalText.trim()) onResultRef.current?.(finalText.trim());
    };

    recognition.onerror = (event) => {
      // Pesan dibedakan karena tindakannya berbeda: izin ditolak diperbaiki di
      // setelan peramban, sedangkan tidak terdengar suara cukup diulang.
      const messages = {
        "not-allowed": "Izin mikrofon ditolak. Aktifkan lewat setelan peramban, lalu coba lagi.",
        "service-not-allowed": "Izin mikrofon ditolak. Aktifkan lewat setelan peramban, lalu coba lagi.",
        "no-speech": "Tidak ada suara yang terdengar. Coba bicara sedikit lebih dekat ke mikrofon.",
        "audio-capture": "Mikrofon tidak ditemukan. Pastikan perangkatnya tersambung.",
        network: "Pengenalan suara butuh koneksi internet.",
      };
      // `aborted` terjadi setiap kali kita menghentikannya sendiri; itu bukan
      // kegagalan dan tidak boleh muncul sebagai pesan galat.
      if (event.error !== "aborted") {
        setError(messages[event.error] ?? "Suara gagal dikenali. Coba ketik saja.");
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      setInterim("");
    };

    recognitionRef.current = recognition;
    setError("");
    setInterim("");
    setListening(true);

    try {
      recognition.start();
    } catch {
      // `start()` melempar bila dipanggil saat sesi lain masih hidup.
      recognitionRef.current = null;
      setListening(false);
      setError("Mikrofon belum dapat dimulai. Coba lagi atau ketik saja.");
    }
  }, [lang, supported]);

  // Melepas mikrofon saat komponen dilepas, apa pun penyebabnya. Tanpa ini
  // indikator perekaman tetap menyala setelah orang berpindah halaman.
  useEffect(() => () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition.abort();
    recognitionRef.current = null;
  }, []);

  return {
    supported,
    unavailableReason,
    listening,
    interim,
    error,
    start,
    stop,
    cancel,
    clearError: useCallback(() => setError(""), []),
  };
}
