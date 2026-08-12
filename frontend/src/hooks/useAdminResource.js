import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeError } from "../services/api";

/**
 * Pemuatan data untuk halaman admin.
 *
 * Keenam halaman admin melakukan hal yang sama: memuat saat dipasang, menahan
 * keadaan memuat, menampilkan galat, lalu memuat ulang setelah setiap
 * perubahan data. Menyalinnya enam kali berarti enam tempat yang perlahan
 * menyimpang — dan yang paling sering terlewat adalah dua penjaga di bawah.
 *
 * ── 1. Balasan basi (stale response) ──────────────────────────────────
 *
 * Halaman Pelajaran dan Kuis punya pemilih kursus. Ganti kursus dua kali
 * dengan cepat dan dua permintaan berjalan bersamaan; tidak ada jaminan
 * yang pertama selesai lebih dulu. Tanpa penjagaan, balasan kursus LAMA
 * dapat tiba belakangan dan menimpa daftar kursus yang baru — admin melihat
 * pelajaran milik kursus yang tidak sedang ia pilih, lalu menyuntingnya.
 *
 * `seqRef` menomori setiap permintaan; hanya balasan bernomor terbaru yang
 * boleh menulis state.
 *
 * ── 2. setState setelah komponen dilepas ──────────────────────────────
 *
 * Berpindah halaman saat permintaan masih terbang akan memanggil setState
 * pada komponen yang sudah tidak ada. `aliveRef` menghentikannya.
 */
export function useAdminResource(loader, deps = [], { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const seqRef = useRef(0);
  const aliveRef = useRef(true);

  // `loader` biasanya arrow function baru setiap render. Menyimpannya di ref
  // membuat `run` stabil, sehingga useEffect di bawah hanya bergantung pada
  // `deps` yang memang dimaksud pemanggil — bukan ikut menembak tiap render.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const run = useCallback(async ({ quiet = false } = {}) => {
    const seq = ++seqRef.current;

    // Muat ulang setelah simpan/hapus tidak boleh mengosongkan tabel jadi
    // "Memuat…" — layar yang berkedip pada setiap penyuntingan membuat admin
    // kehilangan tempatnya di daftar.
    if (!quiet) setLoading(true);
    setError(null);

    try {
      const result = await loaderRef.current();
      if (!aliveRef.current || seq !== seqRef.current) return null;
      setData(result);
      return result;
    } catch (err) {
      if (!aliveRef.current || seq !== seqRef.current) return null;
      setError(normalizeError(err));
      return null;
    } finally {
      if (aliveRef.current && seq === seqRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps]);

  const reload = useCallback(() => run({ quiet: true }), [run]);

  return { data, loading, error, reload, setData };
}

/**
 * Pesan sekilas (toast) untuk hasil operasi.
 *
 * Versi sebelumnya menulis `setTimeout(() => setAlert(null), 3000)` langsung
 * di setiap handler. Dua masalah: timer tidak pernah dibersihkan saat komponen
 * dilepas, dan dua aksi beruntun meninggalkan dua timer — yang pertama menutup
 * pesan KEDUA lebih cepat dari semestinya.
 */
export function useFlash(timeout = 3500) {
  const [flash, setFlash] = useState(null);
  const timerRef = useRef(null);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setFlash(null);
  }, []);

  const show = useCallback(
    (type, message) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setFlash({ type, message });
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setFlash(null);
      }, timeout);
    },
    [timeout],
  );

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { flash, show, clear };
}

/**
 * Membungkus satu operasi tulis (simpan/hapus).
 *
 * Mengembalikan `errors` per-field dari envelope §2.3 supaya form dapat
 * menyorot input yang ditolak, bukan hanya menampilkan satu kalimat merah di
 * atas layar yang tidak memberitahu field mana yang salah.
 */
export async function runMutation(fn) {
  try {
    const result = await fn();
    return { ok: true, result };
  } catch (err) {
    const e = normalizeError(err);
    return { ok: false, message: e.message, code: e.code, errors: e.errors ?? [] };
  }
}

/** `[{field, message}]` → `{field: message}` untuk dibaca komponen input. */
export function fieldErrors(errors = []) {
  return Object.fromEntries((errors ?? []).map((e) => [e.field, e.message]));
}
