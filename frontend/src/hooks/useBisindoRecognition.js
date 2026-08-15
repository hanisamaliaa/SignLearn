import { useCallback, useEffect, useRef, useState } from "react";
import { predictBisindoFrame } from "../services/bisindoRecognitionService";
import { DETECTION_CONFIG } from "../features/bisindo/detectionConfig";
import { PredictionStabilizer } from "../features/bisindo/PredictionStabilizer";
import { addSpace as appendSpace, appendCharacter, removeLastCharacter } from "../features/bisindo/translationBuffer";

function captureFrame(video, canvas) {
  if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;

  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight) return null;

  const targetWidth = Math.min(640, sourceWidth);
  const targetHeight = Math.round((sourceHeight / sourceWidth) * targetWidth);
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  canvas.getContext("2d", { alpha: false }).drawImage(
    video,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
}

export function useBisindoRecognition({ active, videoRef }) {
  const [characters, setCharacters] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState(null);
  const canvasRef = useRef(null);
  const inFlightRef = useRef(false);
  const stabilizerRef = useRef(new PredictionStabilizer(DETECTION_CONFIG));

  const clear = useCallback(() => {
    setCharacters([]);
    stabilizerRef.current.reset();
  }, []);
  const removeLast = useCallback(() => {
    setCharacters(removeLastCharacter);
  }, []);
  const addSpace = useCallback(() => {
    setCharacters((current) => {
      if (!current.length || current.at(-1) === " ") return current;
      return appendSpace(current, DETECTION_CONFIG.maxOutputLength);
    });
  }, []);

  useEffect(() => {
    if (!active) {
      setPrediction(null);
      setStatus("idle");
      setError("");
      setDebugInfo(null);
      stabilizerRef.current.reset();
      return undefined;
    }

    canvasRef.current ||= document.createElement("canvas");
    const controller = new AbortController();
    let disposed = false;

    const recognize = async () => {
      if (inFlightRef.current || disposed) return;
      inFlightRef.current = true;

      try {
        const imageBlob = await captureFrame(videoRef.current, canvasRef.current);
        if (!imageBlob || disposed) return;

        setStatus("recognizing");
        const result = await predictBisindoFrame(imageBlob, controller.signal);
        if (disposed) return;

        setError("");
        setPrediction(result);
        const stabilized = stabilizerRef.current.update(result);
        setDebugInfo(stabilized);
        if (stabilized.committedCharacter) {
          setCharacters((current) => appendCharacter(
            current,
            stabilized.committedCharacter,
            DETECTION_CONFIG.maxOutputLength,
          ));
        }
      } catch (recognitionError) {
        if (recognitionError.name !== "AbortError" && !disposed) {
          setStatus("error");
          setError(recognitionError.message);
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    recognize();
    const intervalId = window.setInterval(recognize, DETECTION_CONFIG.inferenceIntervalMs);

    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(intervalId);
      inFlightRef.current = false;
    };
  }, [active, videoRef]);

  return {
    characters,
    prediction,
    status,
    error,
    debugInfo,
    debugEnabled: DETECTION_CONFIG.debug,
    clear,
    removeLast,
    addSpace,
  };
}
