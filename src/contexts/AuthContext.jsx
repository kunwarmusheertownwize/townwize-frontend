//File: src/contexts/AuthContext.jsx

import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContextBase";
import { SplashScreen } from "@capacitor/splash-screen";
import { isNative } from "../utils/platform";

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      try {
        setAuth(JSON.parse(stored));
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
    // Store only user identity — tokens live in httpOnly cookies set by the server
    const session = { user: payload?.user ?? payload };
    localStorage.setItem("auth", JSON.stringify(session));
    setAuth(session);
  };

  const logout = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("_tw_at");
    localStorage.removeItem("_tw_rt");
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