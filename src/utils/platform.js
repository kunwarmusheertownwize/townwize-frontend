export const isNative = () => {
  if (typeof window === "undefined") return false;
  // Dev-only: add ?__native__=1 to any URL to preview mobile renders in the browser
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("__native__") === "1") return true;
  return window.Capacitor?.isNativePlatform() === true;
};

export const getPlatform = () =>
  isNative() ? (window.Capacitor?.getPlatform() ?? "web") : "web";
