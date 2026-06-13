//File: src/contexts/AuthContext.jsx

import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContextBase";

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
  }, []);

  const login = (payload) => {
    localStorage.setItem("auth", JSON.stringify(payload));
    setAuth(payload);
  };

  const logout = () => {
    localStorage.removeItem("auth");
    setAuth(null);
  };

  return (
    <AuthContext.Provider
      value={{
        auth,
        user: auth?.user || null,
        token: auth?.tokens?.accessToken || null,
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