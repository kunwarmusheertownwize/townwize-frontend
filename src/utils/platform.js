export const isNative = () => {
  if (typeof window === "undefined") return false;
  // Dev-only: add ?__native__=1 to any URL to preview mobile renders in the browser
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("__native__") === "1") return true;
  return window.Capacitor?.isNativePlatform() === true;
};

export const getPlatform = () =>
  isNative() ? (window.Capacitor?.getPlatform() ?? "web") : "web";

/**
 * A phone or tablet running a normal browser — NOT the native app.
 *
 * Distinct from isNative(), and the distinction matters: someone registering in
 * Chrome on their phone is on the device that already has the right camera, so
 * offering them a QR code to scan with that same phone is nonsense.
 *
 * Coarse pointer + touch rather than user-agent sniffing, which is unreliable
 * and gets worse every release.
 */
export const isMobileBrowser = () => {
  if (typeof window === "undefined") return false;
  if (isNative()) return false;
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches === true;
  const touch = (navigator.maxTouchPoints || 0) > 0;
  return coarse && touch;
};

/** Any device whose own camera is the right one to use: native app or phone browser. */
export const hasUsableCamera = () => isNative() || isMobileBrowser();
