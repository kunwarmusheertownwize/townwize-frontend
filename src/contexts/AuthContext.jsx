//File: src/contexts/AuthContext.jsx

import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContextBase";
import { SplashScreen } from "@capacitor/splash-screen";
import { isNative } from "../utils/platform";
import { initFCM } from "../utils/fcm";
import { initNativePush } from "../utils/pushNative";

// Web uses a service worker (utils/fcm.js); the app cannot — there is no
// service worker in the WebView — so it registers with FCM natively instead.
// Picking the wrong one is why push has never worked inside the app.
const registerForPush = () =>
  (isNative() ? initNativePush() : initFCM()).catch(() => {});

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      try {
        setAuth(JSON.parse(stored));
        // Re-register FCM on page reload if user is already logged in
        registerForPush();
      } catch {
        localStorage.removeItem("auth");
      }
    }
    setLoading(false);
    // Hide the splash after a minimum visible time so the logo is seen.
    // launchAutoHide:true is a safety net at 2000ms if this never fires.
    if (isNative()) {
      setTimeout(() => {
        SplashScreen.hide({ fadeOutDuration: 400 });
      }, 1200);
    }
  }, []);

  const login = (payload) => {
    const session = { user: payload?.user ?? payload };
    localStorage.setItem("auth", JSON.stringify(session));
    // Also store tokens in localStorage so Bearer auth works cross-origin
    // (staging: frontend + backend on different onrender.com subdomains blocks
    // cross-site httpOnly cookies in incognito/modern browsers).
    // In production on townwize.com subdomains, cookies will also work as backup.
    if (payload?.accessToken)  localStorage.setItem("_tw_at", payload.accessToken);
    if (payload?.refreshToken) localStorage.setItem("_tw_rt", payload.refreshToken);
    setAuth(session);
    // Register FCM token for push notifications (non-blocking)
    registerForPush();
  };

  const logout = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("_tw_at");
    localStorage.removeItem("_tw_rt");
    localStorage.removeItem("_tw_fcm_token");
    setAuth(null);
  };

  return (
    <AuthContext.Provider
      value={{
        auth,
        user: auth?.user || null,
        role: auth?.user?.role || null,
        isAuthenticated: !!auth,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext