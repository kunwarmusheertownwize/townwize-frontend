import { useCallback, useEffect, useRef, useState } from "react";
import { presignDocumentUrl } from "../api/adminApi";

const cache = new Map(); // url → { presigned, expiresAt }

// Transient failures — an access token lapsing mid-page, a dropped connection —
// resolve themselves on a second attempt. Recovering automatically is the whole
// point: the previous behaviour left a dead "Unavailable" box that only a full
// page reload could clear.
const RETRY_DELAYS_MS = [400, 1200, 3000];

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
  // Starts TRUE when a presign is actually needed. It used to start false, so
  // the very first render reported "not loading, no url" — which every consumer
  // correctly reads as failure, painting "Unavailable" before the request had
  // even been made.
  const [loading, setLoading] = useState(() => isPrivateS3(rawUrl));
  const [error, setError] = useState(null);
  const [manualAttempt, setManualAttempt] = useState(0);
  const timerRef = useRef(null);

  const retry = useCallback(() => setManualAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!rawUrl || !isPrivateS3(rawUrl)) {
      setPresigned(rawUrl || null);
      setLoading(false);
      setError(null);
      return;
    }

    // A retry deliberately bypasses the cache: the usual reason to retry is that
    // the cached URL itself went bad.
    const cached = manualAttempt === 0 ? cache.get(rawUrl) : null;
    if (cached && cached.expiresAt > Date.now() + 30_000) {
      setPresigned(cached.presigned);
      setLoading(false);
      setError(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    const attempt = (n) => {
      const startedAt = Date.now();
      presignDocumentUrl(rawUrl)
        .then((data) => {
          if (!mounted) return;
          const url = data?.data?.url || data?.url;
          if (!url) throw new Error("No URL returned");
          // Only successes are cached, so a blip never sticks.
          cache.set(rawUrl, {
            presigned: url,
            expiresAt: startedAt + ((data?.data?.expiresIn || 300) * 1000),
          });
          setPresigned(url);
          setError(null);
          setLoading(false);
        })
        .catch((e) => {
          if (!mounted) return;
          if (n < RETRY_DELAYS_MS.length) {
            timerRef.current = setTimeout(() => { if (mounted) attempt(n + 1); }, RETRY_DELAYS_MS[n]);
            return;
          }
          // Only after every automatic attempt is exhausted does the user see
          // anything, and even then it is recoverable without a page reload.
          setError(e?.message || "Failed to load");
          setLoading(false);
        });
    };

    attempt(0);

    return () => {
      mounted = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [rawUrl, manualAttempt]);

  return { url: presigned, loading, error, retry };
}
