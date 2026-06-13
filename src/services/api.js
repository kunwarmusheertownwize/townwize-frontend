// townwize-frontend/src/services/api.js

import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1.2",
    withCredentials: true,
});

// ✅ Attach JWT to every request

api.interceptors.request.use((config) => {
    const stored = localStorage.getItem("auth");
    if (!stored) return config;

    try {
        const auth = JSON.parse(stored);
        const token = auth?.tokens?.accessToken ?? auth?.accessToken;

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch {
        // ignore parse errors
    }

    return config;
});

// ✅ Global 401 handler (REQUIRED)

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            // Clear auth safely
            localStorage.removeItem("auth");

            // Prevent infinite loops
            if (window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
        }

        return Promise.reject(error);
    }
);


export const createRide = (payload) => api.post("/rides", payload);
export const acceptRide = (rideId) => api.post(`/rides/${rideId}/accept`);
export const updateRideStatus = (rideId, status) =>
    api.post(`/rides/${rideId}/status`, { status });

export default api;