// townwize-frontend/src/services/api.js

import axios from "axios";
import { isNative } from "../utils/platform";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1.2";

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
});

// Always send Bearer token from localStorage.
// Native: cookies blocked by SameSite; Web (staging): cross-origin subdomains
// block third-party cookies in incognito/modern browsers. Bearer works for both.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("_tw_at");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ── 401 handler with token refresh ──────────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
    failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
    failedQueue = [];
};

const redirectToLogin = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("_tw_at");
    localStorage.removeItem("_tw_rt");
    if (window.location.pathname !== "/login") {
        window.location.href = "/login";
    }
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;

        if (error?.response?.status !== 401 || original._retry) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            })
                .then(() => api(original))
                .catch((err) => Promise.reject(err));
        }

        original._retry = true;
        isRefreshing = true;

        try {
            // Always send refreshToken in body — cookies are unreliable cross-origin.
            const refreshRes = await axios.post(
                `${BASE_URL}/auth/refresh`,
                { refreshToken: localStorage.getItem("_tw_rt") },
                { withCredentials: true }
            );

            const newToken = refreshRes.data?.data?.accessToken;
            if (newToken) {
                localStorage.setItem("_tw_at", newToken);
                // The socket authenticates at handshake, so a live socket still
                // holds the old token. Reconnect with the new one or it will be
                // rejected the next time it drops — killing live tracking.
                try {
                    const { reauthSocket } = await import("../hooks/useRideSocket");
                    reauthSocket();
                } catch { /* socket not in use on this screen */ }
            }

            processQueue(null);
            return api(original);
        } catch (refreshError) {
            processQueue(refreshError);
            redirectToLogin();
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);


export const createRide = (payload) => api.post("/rides", payload);
export const acceptRide = (rideId) => api.post(`/rides/${rideId}/accept`);
export const updateRideStatus = (rideId, status, extra = {}) =>
    api.post(`/rides/${rideId}/status`, { status, ...extra });

// Shared rides (RideTogether)
export const createSharedRide = (payload) => api.post("/rides/shared", payload);
export const searchSharedRides = (params) => api.get("/rides/shared/available", { params });
export const joinSharedRide = (rideId) => api.post(`/rides/${rideId}/join`);
export const dispatchSharedRide = (rideId) => api.post(`/rides/${rideId}/dispatch`);

export default api;
