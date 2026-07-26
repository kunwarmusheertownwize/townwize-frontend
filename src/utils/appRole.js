import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

// On web/dev falls back to the env var; on native, overwritten by initAppRole()
let _role = import.meta.env.VITE_APP_ROLE || "passenger";

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
