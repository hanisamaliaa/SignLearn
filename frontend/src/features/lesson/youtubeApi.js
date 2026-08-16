/**
 * Pemuat IFrame Player API YouTube.
 *
 * Skrip ini hanya boleh dimuat sekali per halaman dan mengumumkan kesiapannya
 * lewat satu callback global, `window.onYouTubeIframeAPIReady`. Dua komponen
 * yang memuatnya sendiri-sendiri akan saling menimpa callback itu, dan yang
 * kalah tidak pernah tahu API-nya sudah siap — player-nya diam selamanya.
 * Karena itu pemuatan dibungkus satu promise bersama.
 */

const SCRIPT_SRC = "https://www.youtube.com/iframe_api";

/** Batas tunggu sebelum menyerah ke <iframe> biasa. */
export const API_TIMEOUT_MS = 5000;

let pending = null;

export function loadYouTubeApi({ timeoutMs = API_TIMEOUT_MS } = {}) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API hanya tersedia di browser."));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (pending) return pending;

  pending = new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      // Promise yang gagal tidak di-cache: jaringan bisa pulih, dan pemelajar
      // yang membuka pelajaran berikutnya berhak dicoba lagi.
      pending = null;
      reject(new Error("Skrip YouTube tidak selesai dimuat."));
    }, timeoutMs);

    const settle = () => {
      window.clearTimeout(timer);
      if (window.YT?.Player) resolve(window.YT);
      else {
        pending = null;
        reject(new Error("Skrip YouTube dimuat tanpa menyediakan player."));
      }
    };

    // Callback sebelumnya tetap dipanggil agar tidak ada pemuat lain yang
    // kehilangan kabar hanya karena kita datang belakangan.
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === "function") previous();
      settle();
    };

    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return;

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timer);
      pending = null;
      reject(new Error("Skrip YouTube gagal dimuat."));
    };
    document.head.appendChild(script);
  });

  return pending;
}

/**
 * Kode galat player yang berarti video tidak akan pernah tampil di sini.
 * 101 dan 150 sama artinya: pemilik video mematikan pemutaran tersemat.
 */
export const EMBED_BLOCKED_CODES = new Set([101, 150]);
export const NOT_FOUND_CODES = new Set([2, 5, 100]);
