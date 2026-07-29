import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

// Native: seed from the env var, then initAppRole() corrects it from the real
// package id. Web: MUST be null — there is no single app role in a browser.
//
// This previously defaulted to "passenger" on web too, which made the web app
// behave as though it were the Towner APK: Login.jsx refused Wizer sign-in with
// "This app is for Towners only", and Register.jsx treated the role as forced
// and skipped the Towner/Wizer selection screen entirely.
//
// Note the native check comes first, so a stale VITE_APP_ROLE in .env.production
// (build-apk.sh writes one there) cannot leak into the web build.
let _role = Capacitor.isNativePlatform()
  ? (import.meta.env.VITE_APP_ROLE || "passenger")
  : null;

export const initAppRole = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const info = await App.getInfo();
    _role = info.id === "com.townwize.wizer" ? "driver" : "passenger";
  } catch {
    // keep env var default
  }
};

export const getAppRole = () => _role;
