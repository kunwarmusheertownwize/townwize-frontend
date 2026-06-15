import { useState } from "react";
import { FaEnvelope, FaArrowLeft, FaCheckCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { isNative } from "../../utils/platform";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Please enter your email address");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        }
      );
      // Always show success — backend never reveals if email exists
      if (res.ok || res.status === 404) {
        setSent(true);
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json?.message || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const pt = isNative() ? "pt-14" : "pt-0";

  if (sent) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-950 px-4 ${pt}`}>
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 space-y-5 text-center">
          <FaCheckCircle className="text-5xl text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Check your inbox</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            If <strong>{email}</strong> is registered with Townwize, you'll receive a password reset link shortly.
          </p>
          <p className="text-xs text-gray-400">
            Didn't get it? Check your spam folder or wait a minute before trying again.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full py-3 rounded-xl bg-townwize-primary text-white font-semibold"
          >
            Back to Login
          </button>
          <button
            onClick={() => { setSent(false); setEmail(""); }}
            className="w-full py-2 text-sm text-townwize-primary dark:text-townwize-accent underline"
          >
            Try a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-950 px-4 ${pt}`}>
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 space-y-6">
        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-townwize-primary dark:hover:text-white transition-colors"
        >
          <FaArrowLeft className="text-xs" /> Back to Login
        </button>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Forgot Password?</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
              Email address
            </label>
            <div className={`flex items-center gap-2 rounded-xl px-3 py-3 border transition-colors ${
              error
                ? "border-red-400 bg-red-50 dark:bg-red-950/20"
                : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
            }`}>
              <FaEnvelope className="text-gray-400 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold text-white transition-colors ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-townwize-primary hover:bg-townwize-primaryDark"
            }`}
          >
            {loading ? "Sending…" : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
