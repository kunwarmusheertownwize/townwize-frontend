// townwize-frontend/src/services/api.js

import axios from "axios";
import { isNative } from "../utils/platform";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1.2";

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
});

// Native (Capacitor) clients: SameSite=Lax blocks cross-origin cookies, so
// we store the access token in localStorage and send it as a Bearer header.
api.interceptors.request.use((config) => {
    if (isNative()) {
        const token = localStorage.getItem("_tw_at");
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
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
            // Web: refreshToken cookie sent automatically via withCredentials.
            // Native: cookie blocked by SameSite, so send the token in the body.
            const body = isNative()
                ? { refreshToken: localStorage.getItem("_tw_rt") }
                : {};

            const refreshRes = await axios.post(
                `${BASE_URL}/auth/refresh`,
                body,
                { withCredentials: true }
            );

            // Native: update stored access token from response body
            if (isNative()) {
                const newToken = refreshRes.data?.data?.accessToken;
                if (newToken) localStorage.setItem("_tw_at", newToken);
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
