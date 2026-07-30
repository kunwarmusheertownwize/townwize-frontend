import { useEffect, useRef, useState } from "react";
import { usePresignedUrl } from "../hooks/usePresignedUrl";

export default function SecureImg({ src, alt = "", className = "", style, onClick }) {
  const { url, loading, error, retry } = usePresignedUrl(src);

  // A presigned URL is good for five minutes. Leave a review tab open longer
  // than that and the browser may re-request the image and get a 403 — the
  // presign call succeeded, so `error` stays null and only the <img> knows.
  const [imgFailed, setImgFailed] = useState(false);
  const autoRetried = useRef(false);

  useEffect(() => { setImgFailed(false); }, [url]);

  // Re-presign once, automatically. Expiry is the overwhelmingly likely cause
  // and it is silently fixable; only a second failure is worth showing anyone.
  useEffect(() => {
    if (imgFailed && !autoRetried.current) {
      autoRetried.current = true;
      retry();
    }
  }, [imgFailed, retry]);

  if (loading) {
    return (
      <div
        className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
        style={style}
      />
    );
  }

  if (error || (imgFailed && autoRetried.current) || !url) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); autoRetried.current = false; setImgFailed(false); retry(); }}
        title={error || "Could not load this image"}
        className={`flex flex-col items-center justify-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-400 text-xs hover:bg-gray-200 dark:hover:bg-gray-700 ${className}`}
        style={style}
      >
        <span>Unavailable</span>
        <span className="text-[10px] underline">Retry</span>
      </button>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={style}
      onClick={onClick}
      onError={() => setImgFailed(true)}
    />
  );
}
