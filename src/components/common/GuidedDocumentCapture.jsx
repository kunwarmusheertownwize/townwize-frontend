import { useCallback, useEffect, useRef, useState } from "react";
import { hasUsableCamera } from "../../utils/platform";

/**
 * Live camera capture for documents and vehicle photos, with quality checks.
 *
 * Every registration upload was a plain file input, so an applicant could
 * submit any image from their gallery — including photos of a vehicle or CNIC
 * that were not theirs. Onfido, Jumio and Persona (the KYC vendors behind
 * Uber and Careem) all force live capture for identity documents; this is the
 * same idea, minus their model-based document detection.
 *
 * WHAT THIS IS NOT: proof. Photographing a screen defeats it, as it defeats
 * every camera-only check. It raises the effort bar and produces consistent,
 * reviewable images. The real controls are the server-set `submittedAt`,
 * preserved EXIF, and a human reviewer.
 *
 * Emits a real `File` via canvas.toBlob so it satisfies the same contract as a
 * file input. The pre-existing CameraCapture.jsx is unused precisely because it
 * emitted a base64 data URL and nothing could accept it.
 */

// Rejection thresholds. Deliberately permissive: a false rejection strands an
// applicant with no way forward, while a marginal photo still reaches a human
// who can reject it. Tune against real photos in Karachi lighting.
const BLUR_MIN_VARIANCE = 55;   // variance of the Laplacian
const GLARE_MAX_RATIO = 0.18;   // fraction of near-blown-out pixels
const ANALYSIS_WIDTH = 320;     // downscale before analysis; full res is wasted work

/** Variance of the Laplacian — the standard cheap blur detector. */
const measureBlurAndGlare = (canvas) => {
  const scale = ANALYSIS_WIDTH / canvas.width;
  const w = ANALYSIS_WIDTH;
  const h = Math.max(1, Math.round(canvas.height * scale));

  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const ctx = small.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  // Greyscale once; both measures read from it.
  const grey = new Float32Array(w * h);
  let blown = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const value = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    grey[p] = value;
    if (value > 250) blown++;
  }

  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap =
        -4 * grey[i] + grey[i - 1] + grey[i + 1] + grey[i - w] + grey[i + w];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  const mean = n ? sum / n : 0;
  const variance = n ? sumSq / n - mean * mean : 0;

  return { variance, glareRatio: blown / (w * h) };
};

export default function GuidedDocumentCapture({
  label = "Document",
  aspect = 1.585,          // CNIC / licence ratio; 4/3 suits vehicle photos
  onCapture,               // (File) => void
  onCancel,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("starting");   // starting|ready|error
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // getUserMedia needs a secure context. Over plain http on a LAN address
      // navigator.mediaDevices is undefined — report it rather than failing
      // with a bare permission error the applicant cannot act on.
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setProblem("Your browser will only open the camera over a secure (https) connection.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus("ready");
      } catch {
        setStatus("error");
        setProblem("Camera access was denied. Allow camera access, or use a device with a camera.");
      }
    })();
    return () => { cancelled = true; stop(); };
  }, [stop]);

  const shoot = useCallback(() => {
    const video = videoRef.current;
    if (!video || busy) return;
    setBusy(true);
    setProblem("");

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    const { variance, glareRatio } = measureBlurAndGlare(canvas);
    if (variance < BLUR_MIN_VARIANCE) {
      setProblem("Too blurry — hold steady and make sure the document is in focus.");
      setBusy(false);
      return;
    }
    if (glareRatio > GLARE_MAX_RATIO) {
      setProblem("Too much glare — tilt away from the light or move out of direct sun.");
      setBusy(false);
      return;
    }

    canvas.toBlob(
      (blob) => {
        setBusy(false);
        if (!blob) {
          setProblem("Could not save that photo. Please try again.");
          return;
        }
        const safe = String(label).toLowerCase().replace(/[^a-z0-9]+/g, "-");
        onCapture(new File([blob], `${safe}-${Date.now()}.jpg`, { type: "image/jpeg" }));
        stop();
      },
      "image/jpeg",
      0.92
    );
  }, [busy, label, onCapture, stop]);

  if (status === "error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm text-red-700 dark:text-red-300">{problem}</p>
        <button type="button" onClick={onCancel}
          className="mt-3 text-xs font-semibold text-townwize-primary underline underline-offset-2">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-black p-3 dark:border-gray-700">
      <p className="mb-2 text-center text-xs font-semibold text-white">{label}</p>

      <div className="relative mx-auto overflow-hidden rounded-lg" style={{ aspectRatio: String(aspect) }}>
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        {/* Guide frame — the applicant fills it. Not detection, just a target. */}
        <div className="pointer-events-none absolute inset-[6%] rounded-md border-2 border-dashed border-white/80" />
      </div>

      {problem && (
        <p className="mt-2 text-center text-xs font-medium text-amber-300">{problem}</p>
      )}

      <div className="mt-3 flex items-center justify-center gap-3">
        <button type="button" onClick={() => { stop(); onCancel(); }}
          className="rounded-lg px-3 py-2 text-xs font-medium text-white/70 hover:text-white">
          Cancel
        </button>
        <button type="button" onClick={shoot} disabled={status !== "ready" || busy}
          className="rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-black disabled:opacity-40">
          {busy ? "Checking…" : "Take photo"}
        </button>
      </div>

      <p className="mt-2 text-center text-[11px] text-white/50">
        Fill the frame, keep it flat, avoid glare.
      </p>
    </div>
  );
}

/** Whether guided capture can run at all — otherwise fall back to a file input. */
export const canGuideCapture = () =>
  hasUsableCamera() && typeof window !== "undefined" && window.isSecureContext;
