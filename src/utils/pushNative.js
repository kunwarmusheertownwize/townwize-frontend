import { isNative } from "./platform";

/**
 * Push notifications inside the Capacitor app.
 *
 * Distinct from utils/fcm.js, which is the WEB path: a service worker plus the
 * Firebase JS SDK. That path cannot work in the app — there is no service
 * worker in the WebView — so until now a driver with the phone in their pocket
 * never learned a ride had come in. Requests only arrived while the app was
 * open on screen, which for a driver app is the product not working.
 *
 * The native plugin registers with FCM directly through Android, so messages
 * arrive with the app backgrounded or closed. The token it returns is the same
 * kind of token the backend already sends to, so no server change is needed —
 * `sendFcmToUser` works unaltered.
 *
 * Requires google-services.json in android/app. Without it the Google plugin is
 * not applied at build time and registration fails; that is reported rather
 * than swallowed, because a silent failure here is indistinguishable from
 * "nobody sent me a ride".
 */

let started = false;

export async function initNativePush({ onNotificationTap } = {}) {
  if (!isNative() || started) return;
  started = true;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    // Android 13+ requires runtime consent. Asking when already granted is a
    // no-op, so this is safe on every launch.
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") {
      console.warn("[push] permission not granted — ride alerts will not arrive in the background");
      return;
    }

    // Listeners must be attached BEFORE register(), or the registration event
    // fires into nothing and the token is lost until the next cold start.
    await PushNotifications.removeAllListeners();

    await PushNotifications.addListener("registration", async ({ value }) => {
      if (!value) return;
      try {
        const stored = localStorage.getItem("_tw_fcm_token");
        if (stored === value) return;   // unchanged — no need to write again
        const { default: api } = await import("../services/api");
        await api.post("/auth/fcm-token", { token: value });
        localStorage.setItem("_tw_fcm_token", value);
      } catch {
        // Not fatal: the token is re-offered on the next launch. Do not cache
        // it locally on failure, or a failed POST would be never retried.
      }
    });

    await PushNotifications.addListener("registrationError", (err) => {
      console.error("[push] registration failed", err);
    });

    // Delivered while the app is in the foreground. Android does not show a
    // tray notification in that case, so the app is responsible for surfacing it.
    await PushNotifications.addListener("pushNotificationReceived", async (notification) => {
      try {
        const { toast } = await import("react-toastify");
        const { title = "Townwize", body = "" } = notification || {};
        toast.info(`${title}\n${body}`, { autoClose: 6000 });
      } catch { /* toast unavailable — the message is still delivered */ }
    });

    // The user tapped the notification. `data` carries whatever the backend put
    // in the FCM data payload, e.g. the ride id.
    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const data = action?.notification?.data || {};
      if (typeof onNotificationTap === "function") onNotificationTap(data);
    });

    await PushNotifications.register();
  } catch (err) {
    // Never let push take the app down — it is an enhancement, and the same
    // class of mistake already cost us a blank white screen once via Firebase.
    console.error("[push] init failed", err);
  }
}

/** Clear the stored token locally, e.g. on sign-out. */
export function forgetPushToken() {
  try { localStorage.removeItem("_tw_fcm_token"); } catch { /* ignore */ }
}
