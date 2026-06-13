// src/utils/dateUtils.js

/**
 * Frontend date utilities (PK default)
 * -----------------------------------
 * Global format: DD-MM-YYYY
 * Scope: Townwize (PK) until international expansion
 */

// Pad helper
const pad = (n) => String(n).padStart(2, "0");

// Format date → DD-MM-YYYY
export function formatDate(date) {
    if (!date) return "";

    try {
        const d = new Date(date);
        return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
    } catch {
        return "";
    }
}

// Format date + time → DD-MM-YYYY HH:mm
export function formatDateTime(date) {
    if (!date) return "";

    try {
        const d = new Date(date);
        return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(
            d.getHours()
        )}:${pad(d.getMinutes())}`;
    } catch {
        return "";
    }
}   

// ISO (for internal comparisons / logs only)
export function toISO(date) {
    try {
        return new Date(date).toISOString();
    } catch {
        return "";
    }
}
