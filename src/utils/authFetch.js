// src/utils/authFetch.js
//
// Wrapper around fetch() that handles auth for both:
//   - Web (cookie-based, SameSite=Lax works same-origin)
//   - Native / Capacitor (SameSite blocks cross-origin cookies, uses
//     Authorization header + localStorage tokens instead)

import { isNative } from "./platform";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1.2";
const REFRESH_URL = `${BASE_URL}/auth/refresh`;

export async function authFetch(url, options = {}) {
    const buildHeaders = () => {
        const headers = {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        };
        if (isNative()) {
            const token = localStorage.getItem("_tw_at");
            if (token) headers.Authorization = `Bearer ${token}`;
        }
        return headers;
    };

    const makeRequest = () =>
        fetch(url, {
            ...options,
            credentials: "include",
            headers: buildHeaders(),
        });

    // 1️⃣ Try with current credentials
    let res = await makeRequest();
    if (res.status !== 401) return res;

    // 2️⃣ Refresh once
    const refreshRes = await fetch(REFRESH_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        // Native: send refresh token in body (cookie is blocked by SameSite)
        body: isNative()
            ? JSON.stringify({ refreshToken: localStorage.getItem("_tw_rt") })
            : undefined,
    });

    if (!refreshRes.ok) {
        localStorage.removeItem("auth");
        localStorage.removeItem("_tw_at");
        localStorage.removeItem("_tw_rt");
        if (window.location.pathname !== "/login") {
            window.location.href = "/login";
        }
        throw new Error("Session expired");
    }

    // 3️⃣ Native: persist new access token from refresh response body
    if (isNative()) {
        try {
            const refreshJson = await refreshRes.json();
            const newToken = refreshJson?.data?.accessToken;
            if (newToken) localStorage.setItem("_tw_at", newToken);
        } catch { /* ignore parse errors */ }
    }

    // 4️⃣ Retry with updated credentials
    return makeRequest();
}
