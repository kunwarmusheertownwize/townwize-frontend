import { usePresignedUrl } from "../hooks/usePresignedUrl";

export default function SecureImg({ src, alt = "", className = "", style, onClick }) {
  const { url, loading, error } = usePresignedUrl(src);

  if (loading) {
    return (
      <div
        className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
        style={style}
      />
    );
  }

  if (error || !url) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded text-gray-400 text-xs ${className}`}
        style={style}
      >
        Unavailable
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={style}
      onClick={onClick}
    />
  );
}
