import { useEffect, useState } from "react";
import GuidedDocumentCapture, { canGuideCapture } from "./GuidedDocumentCapture";

export default function UploadPreview({
  id,
  label,
  file,
  onFileChange,
  accept = "image/*,.pdf",
  minWidth = 400,
  minHeight = 300,
  maxSizeMB = 5,
  onProgress,
  // Opt in to live camera capture. Off by default, so every pre-existing call
  // site behaves exactly as before.
  //
  // Set it wherever the photo must be of the thing in front of the applicant —
  // identity documents and vehicle photos. NOT the utility bill: BTK bills
  // arrive as emailed PDFs, and proof-of-address is the one category the KYC
  // vendors also accept as an upload.
  requireCamera = false,
  // Guide-frame ratio: 1.585 matches a CNIC or licence, 4/3 suits a vehicle.
  captureAspect = 1.585,
}) {
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [capturing, setCapturing] = useState(false);

  // Falls back to the file input when the camera cannot run at all — a desktop
  // without a webcam, or an insecure context. Better a gallery pick than an
  // applicant who physically cannot complete registration.
  const useCamera = requireCamera && canGuideCapture();

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";

    if (f.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large. Max ${maxSizeMB}MB allowed.`);
      return;
    }

    const proceed = () => {
      setError("");
      setProgress(0);
      if (onProgress) onProgress(0);

      setTimeout(() => onFileChange(f), 0);

      const interval = setInterval(() => {
        setProgress((p) => {
          const next = p + 10;
          if (onProgress) setTimeout(() => onProgress(next), 0);
          if (next >= 100) {
            clearInterval(interval);
            return 100;
          }
          return next;
        });
      }, 100);
    };

    if (f.type === "application/pdf") {
      proceed();
    } else {
      const img = new Image();
      img.onload = () => {
        if (img.width < minWidth || img.height < minHeight) {
          setError(`Image too small. Min ${minWidth}x${minHeight}px required.`);
          return;
        }
        proceed();
      };
      img.src = URL.createObjectURL(f);
    }
  };

  const handleRemove = () => {
    setError("");
    setProgress(0);
    if (onProgress) onProgress(0);
    setTimeout(() => onFileChange(null), 0);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-center dark:border-gray-600 dark:bg-gray-800">
      <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-300">{label}</p>

      {file ? (
        <>
          {previewUrl &&
            (file.type === "application/pdf" ? (
              <div className="flex h-28 items-center justify-center rounded-md bg-gray-100 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                PDF uploaded
              </div>
            ) : (
              <img src={previewUrl} alt="Preview" className="h-28 w-full rounded-md object-cover" />
            ))}

          {progress > 0 && progress < 100 ? (
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-600">
              <div className="h-2 rounded-full bg-townwize-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          ) : null}

          {progress === 100 ? (
            <p className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">✓ Uploaded</p>
          ) : null}
        </>
      ) : (
        <div className="flex h-28 flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 text-sm text-gray-400 dark:border-gray-600">
          <span className="mb-1 text-gray-400">No file uploaded</span>
        </div>
      )}

      {/* A camera-captured JPEG carries no `.pdf` case, and offering one would
          be misleading when the picker cannot produce it. */}
      <input
        id={id}
        type="file"
        accept={useCamera ? "image/*" : accept}
        className="hidden"
        onChange={handleFileChange}
      />

      {capturing ? (
        <div className="mt-2">
          <GuidedDocumentCapture
            label={label}
            aspect={captureAspect}
            onCancel={() => setCapturing(false)}
            onCapture={(captured) => {
              setCapturing(false);
              // Route through the same validation the file input uses, so the
              // size and dimension rules apply identically to both paths.
              handleFileChange({ target: { files: [captured], value: "" } });
            }}
          />
        </div>
      ) : null}

      {/* Once a file is present, Replace and Remove are secondary actions on an
          already-completed task. They were two full-size solid buttons — one of
          them bright red — which shouted louder than the upload itself and made
          a finished step look unfinished. */}
      {file ? (
        <div className="mt-2 flex items-center justify-center gap-4 text-xs font-medium">
          {useCamera ? (
            <button
              type="button"
              onClick={() => setCapturing(true)}
              className="text-townwize-primary underline-offset-2 hover:underline dark:text-townwize-accent"
            >
              Retake
            </button>
          ) : (
            <label
              htmlFor={id}
              className="cursor-pointer text-townwize-primary underline-offset-2 hover:underline dark:text-townwize-accent"
            >
              Replace
            </label>
          )}
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <button
            type="button"
            onClick={handleRemove}
            className="text-gray-400 underline-offset-2 transition-colors hover:text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      ) : useCamera ? (
        <button
          type="button"
          onClick={() => setCapturing(true)}
          className="mt-2 inline-block w-full cursor-pointer rounded-lg bg-townwize-primary px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-townwize-primaryDark"
        >
          Take photo
        </button>
      ) : (
        <label
          htmlFor={id}
          className="mt-2 inline-block w-full cursor-pointer rounded-lg bg-townwize-primary px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-townwize-primaryDark"
        >
          Upload
        </label>
      )}

      {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

