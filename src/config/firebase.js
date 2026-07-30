import { initializeApp, getApps } from "firebase/app";

const firebaseConfig = {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigured = Object.values(firebaseConfig).every(Boolean);

export const firebaseApp = isConfigured
    ? (getApps().length ? getApps()[0] : initializeApp(firebaseConfig))
    : null;

/**
 * Whether this browser can do web push at all.
 *
 * Push needs a service worker, and service workers need a secure context.
 * Over plain http — a phone opening the dev server on a LAN address, for
 * instance — `navigator.serviceWorker` is undefined.
 *
 * This module used to call `getMessaging()` at import time. That reaches into
 * `navigator.serviceWorker.addEventListener`, so on any such browser it threw
 * while the module graph was still evaluating, which happens BEFORE React
 * mounts and before any try/catch in our own code can run. The result was a
 * blank white page with the whole app dead — not just push disabled.
 */
export const pushSupportedHere = () =>
    !!firebaseApp &&
    typeof window !== "undefined" &&
    window.isSecureContext === true &&
    "serviceWorker" in navigator &&
    "Notification" in window &&
    "PushManager" in window;
