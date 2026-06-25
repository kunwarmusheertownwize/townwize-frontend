// src/utils/googleMapsLoader.js

import { Loader } from "@googlemaps/js-api-loader";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// 🔥 MASTER library list — MUST match all app code everywhere
const LIBRARIES = ["places", "marker", "geometry", "routes", "geocoding", "visualization"].sort();

// 🔥 Stable loader configuration (never changes)
const LOADER_OPTIONS = {
    apiKey: GOOGLE_MAPS_API_KEY,
    version: "weekly",
    id: "__googleMapsScriptId",
    libraries: LIBRARIES,
};

let loader = null;
let loaderPromise = null;

// -------------------------------------------------------
// RESET — only used when coming back from history cache
// -------------------------------------------------------
export function resetGoogleMapsLoader() {
    loader = null;
    loaderPromise = null;

    try {
        delete window.google;
    } catch {
        // ignore: delete may fail on non-configurable property
    }

    const script = document.getElementById(LOADER_OPTIONS.id);
    if (script?.parentNode) {
        script.parentNode.removeChild(script);
    }
}

// -------------------------------------------------------
// MAIN LOADER — used by all screens
// -------------------------------------------------------
export function loadGoogleMaps() {
    // Already loaded globally?
    if (window.google?.maps) {
        return Promise.resolve(window.google);
    }

    // Already loading?
    if (loaderPromise) return loaderPromise;

    if (!GOOGLE_MAPS_API_KEY) {
        return Promise.reject(
            new Error("Google API key missing. Add VITE_GOOGLE_MAPS_API_KEY in .env")
        );
    }

    // 🔥 ENSURES ONE SINGLE LOADER INSTANCE
    if (!loader) {
        loader = new Loader(LOADER_OPTIONS);
    }

    loaderPromise = loader.load().then(() => window.google);
    return loaderPromise;
}

export const GOOGLE_MAPS_LIBRARIES = LIBRARIES;
