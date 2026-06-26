import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "../config/firebase.js";
import api from "../services/api.js";
import { toast } from "react-toastify";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Registers the service worker, requests notification permission,
 * gets the FCM token, and sends it to the backend.
 * Safe to call multiple times — no-ops if already done.
 */
export async function initFCM() {
    if (!messaging || !VAPID_KEY) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        // Register service worker
        const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

        // Pass Firebase config to the service worker
        const firebaseConfig = {
            apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId:             import.meta.env.VITE_FIREBASE_APP_ID,
        };
        reg.active?.postMessage({ type: "FIREBASE_CONFIG", config: firebaseConfig });

        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
        if (!token) return;

        // Only send to backend if token changed
        const stored = localStorage.getItem("_tw_fcm_token");
        if (stored !== token) {
            await api.post("/auth/fcm-token", { token });
            localStorage.setItem("_tw_fcm_token", token);
        }

        // Handle foreground messages as toasts
        onMessage(messaging, (payload) => {
            const { title = "Townwize", body = "" } = payload.notification || {};
            toast.info(`${title}\n${body}`, { autoClose: 6000 });
        });
    } catch {
        // Silently fail — push notifications are non-critical
    }
}
