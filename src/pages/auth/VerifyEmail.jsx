import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import BrandSpinner from "../../components/common/BrandSpinner";

// Tokens already sent to the server, kept at module scope so the guard survives
// StrictMode's mount → unmount → remount cycle. The old `mounted` flag only
// discarded the first RESULT; both requests still went out, the second landed on
// a token the first had already consumed, and its failure was what rendered —
// so a successful verification displayed "Invalid or expired token".
const attempted = new Set();

export default function VerifyEmail() {
  const { search } = useLocation();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const params = new URLSearchParams(search);
      const token = params.get("token");
      if (!token) {
        setStatus("error");
        setMessage("Verification token is missing. Please use the link from your email.");
        return;
      }
      if (attempted.has(token)) return;
      attempted.add(token);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/auth/verify-email?token=${encodeURIComponent(token)}`
        );
        const json = await res.json();
        if (!mounted) return;
        if (!res.ok) throw new Error(json?.error?.message || json?.message || "Email verification failed.");
        setStatus("success");
        setMessage(json?.message || "Your email has been verified successfully.");
      } catch (e) {
        if (!mounted) return;
        setStatus("error");
        setMessage(e?.message || "Email verification failed. The link may have expired.");
      }
    };
    run();
    return () => { mounted = false; };
  }, [search]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-townwize-primaryDark border border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center shadow-sm">

        {status === "loading" && (
          <BrandSpinner size={88} label="Verifying your email…" className="py-2" />
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-4 text-3xl">
              ✓
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Email Verified</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{message}</p>
            <Link
              to="/login"
              className="inline-block w-full py-3 rounded-xl bg-townwize-primary text-white font-semibold hover:bg-townwize-primaryDark transition"
            >
              Go to Login
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mx-auto mb-4 text-3xl">
              ✕
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Verification Failed</h1>
            <p className="text-sm text-red-500 dark:text-red-400 mb-6">{message}</p>
            <Link
              to="/register"
              className="inline-block w-full py-3 rounded-xl bg-townwize-primary text-white font-semibold hover:bg-townwize-primaryDark transition"
            >
              Back to Registration
            </Link>
          </>
        )}

      </div>
    </div>
  );
}
