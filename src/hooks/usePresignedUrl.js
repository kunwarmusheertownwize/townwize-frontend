import { useEffect, useState } from "react";
import { presignDocumentUrl } from "../api/adminApi";

const cache = new Map(); // url → { presigned, expiresAt }

const isPrivateS3 = (url) => {
  if (!url) return false;
  try {
    return new URL(url).hostname.includes("amazonaws.com");
  } catch {
    return false;
  }
};

export function usePresignedUrl(rawUrl) {
  const [presigned, setPresigned] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!rawUrl || !isPrivateS3(rawUrl)) {
      setPresigned(rawUrl || null);
      return;
    }

    const now = Date.now();
    const cached = cache.get(rawUrl);
    if (cached && cached.expiresAt > now + 30_000) {
      setPresigned(cached.presigned);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    presignDocumentUrl(rawUrl)
      .then((data) => {
        if (!mounted) return;
        const url = data?.data?.url || data?.url;
        const exp = now + ((data?.data?.expiresIn || 300) * 1000);
        if (url) {
          cache.set(rawUrl, { presigned: url, expiresAt: exp });
          setPresigned(url);
        }
      })
      .catch((e) => { if (mounted) setError(e?.message || "Failed to load"); })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [rawUrl]);

  return { url: presigned, loading, error };
}
