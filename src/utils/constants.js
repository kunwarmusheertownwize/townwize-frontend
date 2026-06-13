// src/utils/constants.js

/**
 * Frontend UI constants
 * ---------------------
 * Shared across Passenger, Driver, Admin UIs
 */

// Roles (frontend-facing only)
export const ROLES = Object.freeze({
    ADMIN: "admin",
    DRIVER: "driver",
    PASSENGER: "passenger",
});

// Ride types (UI labels only)
export const RIDE_TYPES = Object.freeze({
    PRIVATE: "Private Ride",
    POOL: "Pool Ride",
});

// Booking / map UI states
export const MAP_MODES = Object.freeze({
    IDLE: "idle",
    PICKUP: "pickup",
    DROP: "drop",
    ROUTE_LOADING: "route_loading",
});

// Generic UI timing (ms)
export const UI_TIMINGS = Object.freeze({
    SHORT: 300,
    MEDIUM: 600,
    LONG: 1200,
});

// Pagination defaults (frontend only)
export const PAGINATION = Object.freeze({
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 50,
});

// Platform detection (web | app)
// Used only for layout + navigation decisions
export const PLATFORM = import.meta.env.VITE_PLATFORM || "web";
