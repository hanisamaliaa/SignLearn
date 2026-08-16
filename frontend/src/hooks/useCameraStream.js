import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Siklus hidup kamera webcam.
 *
 * Diangkat dari `BisindoTranslator` agar penerjemah dan kuis berkamera memakai
 * satu implementasi. Menyalin logika ini adalah cara paling mudah menghasilkan
 * kamera yang tetap menyala setelah komponennya hilang: lampu indikator
 * perangkat tetap hidup dan pengguna merasa sedang direkam diam-diam.
 *
 * `requestRef` menjaga permintaan yang saling menyusul. Pengguna yang menekan
 * "aktifkan" dua kali, atau berpindah halaman sebelum izin diberikan, akan
 * menerima stream dari permintaan yang sudah usang; stream itu ditutup alih-alih
 * dipasang.
 *
 * @returns {{videoRef: object, state: "idle"|"requesting"|"active"|"denied"|"error"|"unsupported", start: Function, stop: Function}}
 */
export function useCameraStream() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const requestRef = useRef(0);
  const [state, setState] = useState("idle");

  const stop = useCallback(() => {
    requestRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setState("idle");
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setState("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      if (requestRef.current !== requestId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("active");
    } catch (error) {
      setState(error?.name === "NotAllowedError" ? "denied" : "error");
    }
  }, []);

  // Melepas perangkat saat komponen dilepas, apa pun penyebabnya.
  useEffect(() => stop, [stop]);

  return { videoRef, state, start, stop };
}
