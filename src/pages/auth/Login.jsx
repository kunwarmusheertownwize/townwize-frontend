// 📄 src/pages/auth/Login.jsx

import React, { useState, useEffect } from "react";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../services/api";
import { isNative } from "../../utils/platform";

import AuthHeader from "../../components/auth/AuthHeader";
import GoogleSignInButton from "../../components/auth/GoogleSignInButton";
import { useAuth } from "../../hooks/useAuth";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const intentState = location.state;

  // ✅ Mobile keyboard scroll fix (same as Register)
  useEffect(() => {
    const handleFocus = (e) => {
      if (window.innerWidth < 768 && e.target?.scrollIntoView) {
        setTimeout(() => {
          e.target.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 300);
      }
    };

    document.addEventListener("focusin", handleFocus);
    return () => document.removeEventListener("focusin", handleFocus);
  }, []);

  const handleLogin = async () => {
  if (isSubmitting) return;

  if (!email || !password) {
    toast.error("Email and password are required");
    return;
  }

  setIsSubmitting(true);

  try {
    const res = await api.post("/auth/login", {
      email,
      password,
    });

    const role = res.data.data.user.role;
    const appRole = import.meta.env.VITE_APP_ROLE;

    if (appRole === "driver" && role !== "driver") {
      toast.error("This app is for Wizers (drivers) only. Please use the Towner app.");
      setIsSubmitting(false);
      return;
    }
    if (appRole === "passenger" && role === "driver") {
      toast.error("This app is for Towners (passengers) only. Please use the Wizer app.");
      setIsSubmitting(false);
      return;
    }

    login(res.data.data);

    // Native (Capacitor): cookies are blocked cross-origin, store tokens in
    // localStorage so api.js can attach them as Authorization headers instead.
    if (isNative()) {
      const { accessToken, refreshToken } = res.data.data;
      if (accessToken) localStorage.setItem("_tw_at", accessToken);
      if (refreshToken) localStorage.setItem("_tw_rt", refreshToken);
    }

    toast.success("Logged in successfully");

    // ✅ allow AuthContext to commit before guards run
    setTimeout(() => {
      if (role === "admin") {
        navigate("/admin", { replace: true });
      } else if (role === "driver") {
        navigate("/driver/home", { replace: true });
      } else if (intentState?.from === "/passenger/select-ride") {
        navigate("/passenger/select-ride", { replace: true });
      } else if (
        intentState?.pickup &&
        intentState?.dropoff &&
        intentState?.pickupCoords
      ) {
        navigate("/passenger/select-ride", {
          state: {
            pickup: intentState.pickup,
            pickupCoords: intentState.pickupCoords,
            dropoff: intentState.dropoff,
          },
          replace: true,
        });
      } else {
        navigate("/passenger/home", { replace: true });
      }

      setIsSubmitting(false);
    }, 0);

  } catch (err) {
    console.error(err);
    toast.error(err.response?.data?.message || "Login failed");
    setIsSubmitting(false);
  }
};


  const handleGoogleSignIn = async (credential) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await api.post("/auth/google", { credential });
      const role = res.data.data.user.role;
      const appRole = import.meta.env.VITE_APP_ROLE;
      if (appRole === "driver" && role !== "driver") {
        toast.error("This app is for Wizers (drivers) only.");
        setIsSubmitting(false);
        return;
      }
      if (appRole === "passenger" && role === "driver") {
        toast.error("This app is for Towners (passengers) only.");
        setIsSubmitting(false);
        return;
      }
      login(res.data.data);
      if (isNative()) {
        const { accessToken, refreshToken } = res.data.data;
        if (accessToken) localStorage.setItem("_tw_at", accessToken);
        if (refreshToken) localStorage.setItem("_tw_rt", refreshToken);
      }
      toast.success("Logged in successfully");
      setTimeout(() => {
        if (role === "admin") navigate("/admin", { replace: true });
        else if (role === "driver") navigate("/driver/home", { replace: true });
        else navigate("/passenger/home", { replace: true });
        setIsSubmitting(false);
      }, 0);
    } catch (err) {
      toast.error(err.response?.data?.message || "Google sign-in failed");
      setIsSubmitting(false);
    }
  };

  const isReturningUser = Boolean(email?.length);



  return (
    <div className="min-h-screen w-full bg-townwize-bgLight dark:bg-townwize-primaryDark transition-colors duration-300 pb-safe">
      <AuthHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* LEFT — Login Card */}
          <div className="flex justify-center">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6">

              <div className="text-center">
                <h2 className="text-2xl font-extrabold text-townwize-primary dark:text-townwize-accent">
                  {isReturningUser ? "Welcome back" : "Sign in to Townwize"}
                </h2>

                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  to continue your ride booking experience.
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <div className="flex items-center rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2">
                  <FaEnvelope className="mr-2 text-gray-400 ml-2" />
                  <input
                    type="email"
                    disabled={isSubmitting}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-transparent outline-none text-sm text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="flex items-center rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2">
                  <FaLock className="mr-2 text-gray-400" />
                  <input
                    type="password"
                    disabled={isSubmitting}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent outline-none text-sm text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleLogin}
                disabled={isSubmitting}
                className={`w-full py-3 rounded-xl font-semibold transition ${isSubmitting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-townwize-primary hover:bg-townwize-primaryDark text-white"
                  }`}
              >
                {isSubmitting ? "Signing in…" : "Sign in"}
              </button>

              {/* Google Sign-In — hidden on Wizer (driver) builds */}
              {import.meta.env.VITE_APP_ROLE !== "driver" && (
                <div className="space-y-3">
                  <div className="relative flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-xs text-gray-400 shrink-0">or</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <GoogleSignInButton onSuccess={handleGoogleSignIn} />
                </div>
              )}

              {/* Footer Links */}
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <button
                  onClick={() => navigate("/register")}
                  className="font-medium text-townwize-primary hover:underline"
                >
                  Create account
                </button>
                <button
                  onClick={() =>
                    toast.info(
                      "Password reset will be available soon. Please contact support if needed."
                    )
                  }
                  className="hover:underline"
                >
                  Forgot password?
                </button>
              </div>

            </div>
          </div>

          {/* RIGHT — Brand Panel (Desktop only) */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-townwize-primary to-townwize-primaryDark text-white p-10 flex flex-col justify-center">
              <h3 className="text-3xl font-extrabold mb-4">
                Ride smarter in your community
              </h3>
              <p className="text-sm opacity-90 max-w-sm">
                Townwize connects verified residents and guests through secure,
                community-driven transportation across the city.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default Login;
