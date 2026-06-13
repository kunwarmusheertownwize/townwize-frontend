// src/hooks/useAuth.js

/**
 * Frontend-only auth stub
 * -----------------------
 * No backend
 * No storage
 * Safe defaults for UI gating
 */

import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContextBase";

export function useAuth() {
    return useContext(AuthContext);
}

export default useAuth;
