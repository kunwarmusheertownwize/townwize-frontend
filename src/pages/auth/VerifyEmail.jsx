import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function VerifyEmail() {
  const { search } = useLocation();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const params = new URLSearchParams(search);
      const token = params.get("token");
      if (!token) {
        setStatus("error");
        setMessage("Verification token is missing.");
        return;
      }
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/verify-email?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!mounted) return;
        if (!res.ok) throw new Error(json?.error?.message || json?.message || "Email verification failed");
        setStatus("success");
        setMessage(json?.message || "Your email has been verified.");
      } catch (e) {
        if (!mounted) return;
        setStatus("error");
        setMessage(e?.message || "Email verification failed.");
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [search]);

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white dark:bg-townwize-primaryDark border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <h1 className="text-2xl font-bold text-townwize-primary">Email Verification</h1>
      <p className={`mt-4 text-sm ${status === "success" ? "text-green-600" : status === "error" ? "text-red-600" : "text-gray-600"}`}>
        {message}
      </p>
    </div>
  );
}
