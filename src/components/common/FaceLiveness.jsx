import { useEffect, useRef, useState, useCallback } from "react";
import { Controller } from "react-hook-form";
import * as faceapi from "face-api.js";

// stable constant
const STEPS = ["front", "left", "right", "up", "down"];

export default function FaceLiveness({ control, name, label }) {
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
          <div className="flex flex-col gap-4 items-center">
            <label className="font-medium text-sm">{label}</label>

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

            {!cameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 bg-townwize-primary text-white rounded-lg shadow"
              >
                Start Recognition
              </button>
            ) : !capturedImage ? (
              <div className="relative flex flex-col items-center">
                <div
                  className={`w-30 h-34 rounded-full overflow-hidden border-4 transition-colors ${borderColor} relative bg-black`}
                >
                  {loading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
                      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}

                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover relative z-10"
                    onLoadedMetadata={() => {
                      if (videoRef.current) {
                        videoRef.current
                          .play()
                          .then(() => console.log("✅ Video playing"))
                          .catch((err) =>
                            console.error("Video play failed:", err)
                          );
                      }
                    }}
                  />
                  {/* guide overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div
                      className={`w-56 h-56 rounded-full border-2 guide-circle ${guideColor === "green"
                        ? "green"
                        : guideColor === "red"
                          ? "red"
                          : ""
                        }`}
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Step {currentStep + 1} of {STEPS.length}
                </p>
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