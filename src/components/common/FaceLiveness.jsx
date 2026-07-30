import { useEffect, useRef, useState, useCallback } from "react";
import { Controller } from "react-hook-form";
import * as faceapi from "face-api.js";
import { isNative } from "../../utils/platform";
import FaceProgressRing from "./FaceProgressRing";

// stable constant
const STEPS = ["front", "left", "right", "up", "down"];

// Plain-language instruction per step. "Now turn front" is not an instruction
// anyone can act on; these are what the user actually reads while the camera is
// running, so they carry the whole interaction.
const PROMPTS = {
  front: "Look straight at the camera",
  left:  "Slowly turn your head left",
  right: "Slowly turn your head right",
  up:    "Tilt your head up",
  down:  "Tilt your head down",
};

export default function FaceLiveness({ control, name, label = "Face verification" }) {
  // Whether this device has a camera at all, so a laptop user is told to switch
  // to their phone instead of tapping a button that can only fail.
  const [hasCamera, setHasCamera] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) { if (!cancelled) setHasCamera(false); return; }
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) setHasCamera(devices.some((d) => d.kind === "videoinput"));
      } catch {
        if (!cancelled) setHasCamera(true); // unknown — let them try
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState("Initializing...");
  const [borderColor, setBorderColor] = useState("border-gray-300");
  const [capturedImage, setCapturedImage] = useState(null);
  const [passCount, setPassCount] = useState(0);
  const [guideColor, setGuideColor] = useState("white");
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false); // add this state near other useState

  const streamRef = useRef(null);
  const onChangeRef = useRef(null);

  // Load models only
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      ]);
    };

    loadModels();
    return () => stopCamera();
  }, []);



  // getUserMedia fails for several very different reasons, and reporting them all
  // as "Camera access denied" made a missing Android permission indistinguishable
  // from a user tapping Deny. Tell the person what to actually do about it.
  const describeCameraError = (err) => {
    switch (err?.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return "Camera permission was denied. Open your phone's Settings → Apps → Wizer → Permissions and allow Camera, then try again.";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "No camera was found on this device.";
      case "NotReadableError":
      case "TrackStartError":
        return "The camera is being used by another app. Close it and try again.";
      case "SecurityError":
        return "The camera is blocked on this connection. Please contact support.";
      case "OverconstrainedError":
        return "This device's camera is not supported. Please contact support.";
      default:
        return err?.message
          ? `Camera could not start: ${err.message}`
          : "Camera could not start. Please try again.";
    }
  };

  const startCamera = async () => {
    try {
      setLoading(true); // show spinner

      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("This device or browser does not support camera capture.");
        return;
      }

      // Prefer the front camera for a selfie, but never fail because of it —
      // some devices reject the facingMode constraint outright.
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      setCameraActive(true);
      setStatus("Look straight ahead");
    } catch (err) {
      // Keep the real error in the console for diagnosis; show the user the
      // specific, actionable version.
      console.error("Camera start failed:", err?.name, err?.message, err);
      setStatus(describeCameraError(err));
    } finally {
      setLoading(false); // hide spinner
    }
  };

  // Bind stream to video after cameraActive is true
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current
          .play()
          .then(() => console.log("✅ Video playing"))
          .catch((err) => console.error("❌ Video play failed:", err));
      };
    }
  }, [cameraActive]);


  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };


  const capture = useCallback((onChange) => {

    // 🟡 TODO: Backend Integration
    // After capture, send `imageData` to backend API for verification.
    // Backend should compare with stored reference image (embeddings / Rekognition).
    // Update status + borderColor based on API response.
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.drawImage(
      videoRef.current,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );
    const imageData = canvasRef.current.toDataURL("image/png");
    setCapturedImage(imageData);
    onChange(imageData);
    // 🟡 Temporary placeholder until backend verification
    setStatus("🔄 Verification pending (UI only)");
    setBorderColor("border-yellow-500");

    // stop camera after capture
    stopCamera();
  }, []);

  const runDetection = useCallback(
    async (onChange) => {
      if (!videoRef.current) return;

      const detections = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceLandmarks();

      if (!detections) {
        setStatus("Reading Your Face, Please Wait... ");
        setBorderColor("pulse-red");
        setGuideColor("red");
        setPassCount(0);
        return;
      }

      const nose = detections.landmarks.getNose();
      const { x, y } = nose[3];

      const box = detections.detection.box;
      const faceCenterX = box.x + box.width / 2;
      const faceCenterY = box.y + box.height / 2;

      const step = STEPS[currentStep];
      let pass = false;

      if (step === "front") pass = true;
      if (step === "left" && x > faceCenterX + 20) pass = true;
      if (step === "right" && x < faceCenterX - 20) pass = true;
      if (step === "up" && y < faceCenterY - 20) pass = true;

      // Improved DOWN detection
      if (step === "down") {
        const mouth = detections.landmarks.getMouth();
        const eyes = detections.landmarks.getLeftEye();
        const eyeY = (eyes[0].y + eyes[3].y) / 2;
        const mouthY = (mouth[3].y + mouth[9].y) / 2;
        const eyeMouthDist = mouthY - eyeY;

        if (y > faceCenterY + 10 || eyeMouthDist < 35) pass = true;
      }

      if (pass) {
        setPassCount((c) => c + 1);

        if (passCount + 1 >= 3) {
          setStatus(`✅ ${step} verified`);
          setBorderColor("pulse-green");
          setGuideColor("green");
          setPassCount(0);

          setTimeout(() => {
            if (currentStep + 1 < STEPS.length) {
              setCurrentStep((s) => s + 1);
              setStatus(`Now turn ${STEPS[currentStep + 1]}`);
              setBorderColor("border-gray-300");
              setGuideColor("white");
            } else {
              capture(onChange);
            }
          }, 1200);
        }
      } else {
        setPassCount(0);
        setBorderColor("pulse-red");
        setGuideColor("red");
        setStatus(`Please turn ${step}`);
      }
    },
    [currentStep, capture, passCount]
  );

  // Continuous detection loop
  useEffect(() => {
    let interval;
    if (
      cameraActive &&
      !capturedImage &&
      videoRef.current &&
      onChangeRef.current
    ) {
      interval = setInterval(() => {
        runDetection(onChangeRef.current);
      }, 800);
    }
    return () => clearInterval(interval);
  }, [cameraActive, capturedImage, runDetection]);

  const retake = async (onChange) => {
    setCapturedImage(null);
    onChange(null);
    setCurrentStep(0);
    setStatus("Look straight ahead");
    setBorderColor("border-gray-300");
    setGuideColor("white");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current
            .play()
            .catch((err) => console.error("Video play failed:", err));
        };
      }
    } catch (err) {
      console.error("Camera restart failed:", err);
    }
  };

  return (
    <Controller
      control={control}
      name={name}
      rules={{ required: `${label || "Selfie"} is required` }}
      render={({ field: { onChange }, fieldState: { error } }) => {
        onChangeRef.current = onChange;
        return (
          <div className="flex flex-col gap-3 items-center">
            {/* The parent section already titles this. A second heading here
                produced three stacked labels above one button. */}

            {/* "Initializing…" before anything has been started is noise, not
                status. Only speak once there is something to report. */}
            {(cameraActive || capturedImage || status.startsWith("✅") ||
              status.startsWith("❌") || status.startsWith("🔄")) && (
              <p
                className={`text-sm font-semibold ${status.startsWith("✅")
                    ? "text-green-600"
                    : status.startsWith("❌")
                      ? "text-red-600"
                      : status.startsWith("🔄")
                        ? "text-yellow-600"
                        : "text-gray-700 dark:text-gray-300"
                  }`}
              >
                {status}
              </p>
            )}

            {!cameraActive ? (
              <div className="flex w-full flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full rounded-lg bg-townwize-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-townwize-primaryDark"
                >
                  Start face verification
                </button>
                {/* A laptop webcam works, but the CNIC-match check is far more
                    reliable on a phone's front camera — and most Wizers are on a
                    phone anyway. Say so rather than let them fail and retry. */}
                {!hasCamera && (
                  <p className="text-center text-xs text-amber-600">
                    No camera detected on this device. Open registration on your
                    phone to complete this step — your progress is saved.
                  </p>
                )}
                {hasCamera && !isNative() && (
                  <p className="text-center text-[11px] text-gray-400">
                    Using a phone gives the most reliable result.
                  </p>
                )}
              </div>
            ) : !capturedImage ? (
              <div className="relative flex flex-col items-center gap-3">
                {/* The ring reports progress through the five head movements.
                    Previously this was a line of text only, so people had no
                    sense of how far through they were and often stopped early. */}
                <FaceProgressRing
                  progress={currentStep / STEPS.length}
                  state={
                    guideColor === "green" ? "success"
                      : guideColor === "red" ? "error"
                        : "active"
                  }
                  size={232}
                >
                  {loading && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
                    </div>
                  )}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="relative z-10 h-full w-full scale-x-[-1] object-cover"
                    onLoadedMetadata={() => {
                      videoRef.current?.play().catch((err) =>
                        console.error("Video play failed:", err)
                      );
                    }}
                  />
                </FaceProgressRing>

                <div className="text-center">
                  <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    {PROMPTS[STEPS[currentStep]] || "Hold still"}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {currentStep} of {STEPS.length} complete
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className={`w-64 h-64 object-cover rounded-full border-4 ${borderColor}`}
                />

                <button
                  type="button"
                  onClick={() => retake(onChange)}
                  className="mt-2 text-sm text-townwize-primary underline"
                >
                  Retake
                </button>
              </div>
            )}

            <canvas ref={canvasRef} width={400} height={300} className="hidden" />

            {error && (
              <p className="text-xs text-townwize-error mt-1">{error.message}</p>
            )}
          </div>
        );
      }}
    />
  );
}