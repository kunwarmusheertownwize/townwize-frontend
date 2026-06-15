import { useState } from "react";
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isNative } from "../../utils/platform";

const PasswordField = ({ label, value, onChange, placeholder, autoComplete }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl px-3 py-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors">
        <FaLock className="text-gray-400 shrink-0" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
          tabIndex={-1}
        >
          {show ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>
    </div>
  );
};

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const pt = isNative() ? "pt-14" : "pt-0";

  if (!token) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-950 px-4 ${pt}`}>
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 space-y-4 text-center">
          <FaExclamationCircle className="text-5xl text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invalid Link</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This reset link is missing a token. Please request a new password reset.
          </p>
          <button
            onClick={() => navigate("/forgot-password")}
            className="w-full py-3 rounded-xl bg-townwize-primary text-white font-semibold"
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-950 px-4 ${pt}`}>
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 space-y-5 text-center">
          <FaCheckCircle className="text-5xl text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Password Updated</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your password has been reset successfully. You can now log in with your new password.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full py-3 rounded-xl bg-townwize-primary text-white font-semibold"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword: password }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.message || "Reset failed. The link may have expired.");
      } else {
        setDone(true);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-950 px-4 ${pt}`}>
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Set New Password</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Choose a strong password for your Townwize account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            label="New password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm new password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(""); }}
            placeholder="Repeat your password"
            autoComplete="new-password"
          />

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2.5">
              <FaExclamationCircle className="text-red-400 shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold text-white transition-colors ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-townwize-primary hover:bg-townwize-primaryDark"
            }`}
          >
            {loading ? "Updating…" : "Reset Password"}
          </button>
        </form>

        <p className="text-xs text-center text-gray-400">
          Link expired?{" "}
          <button
            onClick={() => navigate("/forgot-password")}
            className="text-townwize-primary dark:text-townwize-accent underline"
          >
            Request a new one
          </button>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
