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

/**
 * The region of the sensor frame the applicant can actually SEE.
 *
 * The preview is a container at the guide aspect with the video set to
 * object-cover, so the browser crops the sensor frame to fit. Everything
 * outside this rectangle is hidden from them — and used to be saved anyway.
 *
 * Shared by the live quality check and the shutter, deliberately: judging the
 * whole sensor frame while saving a crop of it meant the two disagreed. A card
 * filling the guide but sitting on a busy desk read as "sharp" because the desk
 * was sharp.
 */
const cropRect = (source, aspect) => {
  // A video element reports videoWidth; an ImageBitmap reports width.
  const vw = source.videoWidth || source.width;
  const vh = source.videoHeight || source.height;
  const wanted = Number(aspect) || vw / vh;

  let sw = vw;
  let sh = vh;
  if (vw / vh > wanted) {
    sw = Math.round(vh * wanted); // sensor wider than the guide — trim the sides
  } else {
    sh = Math.round(vw / wanted); // taller — trim top and bottom
  }
  return { sx: Math.round((vw - sw) / 2), sy: Math.round((vh - sh) / 2), sw, sh };
};

/** Draw just that region onto a canvas. Works for a video or a still. */
const cropToCanvas = (source, aspect) => {
  const { sx, sy, sw, sh } = cropRect(source, aspect);
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  canvas.getContext("2d").drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas;
};

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

/**
 * A full-resolution photograph, not a frame of the video preview.
 *
 * getUserMedia hands back a VIDEO stream, and a video stream is small: asking
 * for 2560 returned 1440 on a real phone whose camera is twelve megapixels. We
 * were photographing the preview and discarding the sensor.
 *
 * It showed up as unreadable text. On a BTK ID card the CNIC came out 24px
 * tall and Textract reported 24.4% confidence on it — openly guessing — while
 * the same number on the CNIC card, 32px tall, read at 100%. One digit came
 * back wrong and refused a genuine applicant. Below roughly 20px, 8 and 0 and
 * 6 stop being distinguishable.
 *
 * ImageCapture.takePhoto() uses the still-image path instead, which is the
 * camera's real resolution — three to four times the linear size, so that 24px
 * number becomes 70-90px and stops being a guess.
 *
 * ⚠️ Chrome on Android has it; Safari on iOS does not. So it is tried and the
 * video frame remains the fallback — which is what everyone was getting
 * already, so nobody is worse off than before.
 *
 * @returns {Promise<CanvasImageSource|null>} something drawable, or null to
 *          tell the caller to use the video element.
 */
const takeFullResolutionPhoto = async (stream) => {
  try {
    if (typeof window.ImageCapture !== "function") return null;
    const track = stream?.getVideoTracks?.()[0];
    if (!track) return null;

    const capture = new window.ImageCapture(track);
    const blob = await capture.takePhoto();
    // createImageBitmap is drawable straight onto a canvas and avoids an
    // object URL that would have to be revoked.
    return await createImageBitmap(blob);
  } catch {
    // Every failure here is the browser declining, not the applicant doing
    // anything wrong: unsupported, a track that will not do stills, a
    // permissions quirk. Fall back silently.
    return null;
  }
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
          /* Ask for as many pixels as the device will give.
           *
           * `width: { ideal: 1920 }` returned an 886 x 1920 stream on a phone
           * held portrait — width is the SHORT side there, so the request was
           * being read as a cap on the wrong axis. With the card filling about
           * a third of that, a BTK registration number is roughly 150 pixels
           * across, and Textract read BTKA-XYS1461 as BTKA-XYS1401. One digit,
           * and a genuine applicant refused five times.
           *
           * Both axes are asked for, and `ideal` is a preference rather than a
           * requirement — a device that cannot manage it returns what it has
           * instead of failing to open the camera at all. */
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 2560 },
            height: { ideal: 1440 },
          },
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

  /* Live quality, checked on the crop region several times a second.
   *
   * Until now the only feedback was AFTER the shutter, and only for blur and
   * glare. Nothing ever told an applicant the card was too small in the frame —
   * which is precisely what went wrong twice on 28 Sep: a genuine BTK card
   * photographed from too far away, occupying a third of the frame, so the
   * registration number was about 150 pixels wide and Textract read
   * BTKA-XYS1461 as BTKA-XYS1401. One digit, and a real Wizer refused five
   * times.
   *
   * The face capture has had a red/green guide since it was written. The
   * document capture had a static white rectangle and no signal at all.
   *
   * ⚠️ IT ONLY EVER WARNS. It never says a photograph is good, and the shutter
   * is not gated on it.
   *
   * The first version did both, and was wrong. Variance of the Laplacian
   * measures whether there is DETAIL ANYWHERE in the image — not whether a
   * document fills the frame. The user pointed a camera at a tea cup and got a
   * green light, and a card two feet away on a textured desk passes just as
   * easily, because the desk has edges. The assumption that a distant card
   * leaves the crop full of FLAT background only holds on a plain surface.
   *
   * A green light that is wrong is worse than none: it tells somebody a bad
   * photograph is fine. Telling them it is blurry, when it measurably is, does
   * not make that mistake — low variance is genuine evidence of blur even
   * though high variance is not evidence of good framing.
   *
   * Knowing a document fills the frame needs actual document detection — the
   * card's quadrilateral — which is what the KYC vendors do and is not a
   * variance threshold. Until that exists, the honest signal is one-sided. */
  const [quality, setQuality] = useState({ ok: false, message: "" });

  useEffect(() => {
    if (status !== "ready") return undefined;

    const id = setInterval(() => {
      const video = videoRef.current;
      if (!video || !video.videoWidth || busy) return;

      const { variance, glareRatio } = measureBlurAndGlare(cropToCanvas(video, aspect));

      if (glareRatio > GLARE_MAX_RATIO) {
        setQuality({ ok: false, message: "Too much glare — tilt away from the light." });
      } else if (variance < BLUR_MIN_VARIANCE) {
        setQuality({ ok: false, message: "Hold steady — keep the document in focus." });
      } else {
        // Nothing is wrong that we can actually measure. That is NOT the same
        // as the photograph being good, so nothing is claimed.
        setQuality({ ok: false, message: "" });
      }
    }, 400);

    return () => clearInterval(id);
  }, [status, busy, aspect]);

  const shoot = useCallback(async () => {
    const video = videoRef.current;
    if (!video || busy) return;
    setBusy(true);
    setProblem("");

    /* A real photograph if the browser will take one, the preview frame if
     * not. Both are cropped identically, so what is saved is still exactly the
     * rectangle the applicant framed — just with far more pixels in it. */
    const still = await takeFullResolutionPhoto(streamRef.current);
    const source = still || video;

    /* Save the rectangle the applicant actually SAW.
     *
     * The preview is a container at the guide aspect with the video set to
     * object-cover, so the browser crops the sensor frame to fit and the
     * applicant lines the document up inside what is left. This then captured
     * video.videoWidth × videoHeight — the WHOLE sensor frame, including
     * everything object-cover had hidden from them.
     *
     * On 27 Sep that cost a Wizer his registration. He aligned his CNIC in the
     * guide and we saved a portrait photograph of a sofa cushion with the card
     * in the middle, his trousers along the bottom and a second ID document in
     * the corner he could not see. The card was perhaps a quarter of the frame,
     * so the text was a small fraction of the pixels and Textract read it at
     * 78% — missing the CNIC printed on his BTK card entirely.
     *
     * Cropping to the CONTAINER, not to the dashed guide inside it: the guide
     * is a target, not a boundary, and someone who aligned loosely would lose
     * an edge. This keeps everything they could see and drops everything they
     * could not. */
    const canvas = cropToCanvas(source, aspect);

    // Re-checked at the moment of capture, not trusted from the live loop —
    // the frame can move between the last sample and the shutter.
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
        still?.close?.(); // release the bitmap; the fallback has nothing to free
        stop();
      },
      "image/jpeg",
      0.92
    );
  }, [aspect, busy, label, onCapture, stop]);


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
        {/* Amber while something measurable is wrong, neutral otherwise. It
            never turns green: see the note on the live loop — nothing here can
            tell that a document fills the frame, and pretending otherwise told
            the user a photograph of a tea cup was good. */}
        <div
          className={[
            "pointer-events-none absolute inset-[6%] rounded-md border-2 border-dashed transition-colors",
            quality.message ? "border-amber-400" : "border-white/80",
          ].join(" ")}
        />
      </div>

      {/* A rejection from the shutter outranks the live hint — it is about the
          photograph they just tried to take, not the one they are lining up. */}
      {problem ? (
        <p className="mt-2 text-center text-xs font-medium text-amber-300">{problem}</p>
      ) : quality.message ? (
        <p className="mt-2 text-center text-xs font-medium text-amber-300">{quality.message}</p>
      ) : null}

      <div className="mt-3 flex items-center justify-center gap-3">
        <button type="button" onClick={() => { stop(); onCancel(); }}
          className="rounded-lg px-3 py-2 text-xs font-medium text-white/70 hover:text-white">
          Cancel
        </button>
        {/* NOT gated on the live check. It was, briefly, and since that check
            cannot tell a document from a tea cup the gate was meaningless — it
            passed everything while implying it had judged something. The
            shutter's own blur and glare test still rejects after capture, and
            that one is measuring what it claims to. */}
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
