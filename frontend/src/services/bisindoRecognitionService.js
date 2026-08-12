const env = import.meta.env;

export const BISINDO_AI_BASE_URL =
  env.VITE_BISINDO_AI_URL || "/bisindo-ai";

export async function predictBisindoFrame(imageBlob, signal) {
  const response = await fetch(`${BISINDO_AI_BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": imageBlob.type || "image/jpeg" },
    body: imageBlob,
    signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail || "Layanan pengenalan BISINDO tidak tersedia.");
  }

  return response.json();
}
