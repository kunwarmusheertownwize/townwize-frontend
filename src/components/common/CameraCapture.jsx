import { useRef, useState, useEffect } from "react";
import { Controller } from "react-hook-form";


export default function CameraCapture({ control, name, label }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);

    // Start webcam
    useEffect(() => {
        let mediaStream;

        const startCamera = async () => {
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    videoRef.current.play();
                }
            } catch (err) {
                console.error("Camera access denied:", err);
            }
        };

        startCamera();

        // ✅ cache ref before cleanup
        const videoEl = videoRef.current;

        return () => {
            if (videoEl && videoEl.srcObject) {
                videoEl.srcObject.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);

  const handleCapture = (onChange) => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    const imageData = canvasRef.current.toDataURL("image/png");
    setCapturedImage(imageData);
    onChange(imageData); // ✅ store in RHF form state
  };

  const handleRetake = (onChange) => {
    setCapturedImage(null);
    onChange(null);
  };

  return (
    <Controller
      control={control}
      name={name}
      rules={{ required: `${label || "Selfie"} is required` }}
      render={({ field: { onChange }, fieldState: { error } }) => (
        <div className="flex flex-col gap-3">
          <label className="font-medium text-sm">{label}</label>

          {/* Live Camera or Captured Image */}
          {!capturedImage ? (
            <div className="relative w-full max-w-sm mx-auto">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg border"
              />
              <button
                type="button"
                onClick={() => handleCapture(onChange)}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-townwize-primary text-white px-4 py-2 rounded-full shadow"
              >
                Capture
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-40 h-40 object-cover rounded-full border"
              />
              <button
                type="button"
                onClick={() => handleRetake(onChange)}
                className="mt-2 text-sm text-townwize-primary underline"
              >
                Retake
              </button>
            </div>
          )}

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} width={400} height={300} className="hidden" />

          {/* Error message */}
          {error && <p className="text-xs text-townwize-error mt-1">{error.message}</p>}
        </div>
      )}
    />
  );
}
