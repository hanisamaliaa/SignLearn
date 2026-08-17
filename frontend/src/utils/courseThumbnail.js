const STORAGE_KEY = "signlearn.courseThumbnails.v1";
const MAX_WIDTH = 800;
const MAX_HEIGHT = 450;
const JPEG_QUALITY = 0.82;

function readMap() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/**
 * Mengambil thumbnail lokal untuk kursus.
 *
 * Thumbnail sengaja disimpan di localStorage karena backend saat ini hanya
 * menerima URL http/https dan tidak menyediakan object storage. Dengan cara
 * ini tidak ada perubahan schema/API/backend, dan gambar tetap tersedia di
 * seluruh halaman SignLearn pada perangkat/browser yang sama.
 */
export function getCourseThumbnail(course) {
  if (!course) return "";
  const local = readMap()[String(course.id)];
  return local || course.thumbnail || "";
}

/**
 * Mengubah File gambar menjadi data URL JPEG yang sudah diperkecil agar
 * penyimpanan browser tidak cepat memenuhi kuota localStorage.
 */
export function imageFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith("image/")) {
      reject(new Error("File harus berupa gambar."));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Gambar tidak dapat dibaca."));
    reader.onload = () => {
      const image = new Image();

      image.onerror = () => reject(new Error("File gambar tidak valid."));
      image.onload = () => {
        const scale = Math.min(
          1,
          MAX_WIDTH / image.naturalWidth,
          MAX_HEIGHT / image.naturalHeight,
        );
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Browser tidak mendukung pemrosesan gambar."));
          return;
        }

        context.drawImage(image, 0, 0, width, height);

        try {
          resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
        } catch {
          reject(new Error("Gambar tidak dapat diproses."));
        }
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

export function saveCourseThumbnail(courseId, dataUrl) {
  if (!courseId || !dataUrl) return;
  const map = readMap();
  map[String(courseId)] = dataUrl;
  writeMap(map);
}

export function removeCourseThumbnail(courseId) {
  if (!courseId) return;
  const map = readMap();
  delete map[String(courseId)];
  writeMap(map);
}
