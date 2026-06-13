import { useEffect, useState } from "react";

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
}) {
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);

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

          {progress === 100 ? <p className="mt-1 text-xs text-green-600 dark:text-green-400">Upload complete</p> : null}

          <button
            type="button"
            onClick={handleRemove}
            className="mt-2 inline-block rounded-lg bg-red-500 px-3 py-2 text-sm text-white transition hover:bg-red-600"
          >
            Remove
          </button>
        </>
      ) : (
        <div className="flex h-28 flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 text-sm text-gray-400 dark:border-gray-600">
          <span className="mb-1 text-gray-400">No file uploaded</span>
        </div>
      )}

      <input id={id} type="file" accept={accept} className="hidden" onChange={handleFileChange} />
      <label htmlFor={id} className="mt-2 inline-block cursor-pointer rounded-lg bg-townwize-primary px-4 py-2 text-white transition hover:bg-townwize-primaryDark">
        {file ? "Replace" : "Upload"}
      </label>

      {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

