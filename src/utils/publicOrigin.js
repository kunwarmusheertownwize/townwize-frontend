/**
 * Origins that work from a DIFFERENT device than the one running the app.
 *
 * The QR hand-off is the only flow where a second physical device loads our
 * pages, and it breaks every assumption `localhost` lets you get away with:
 * to the phone, `localhost` is the phone. Both the page URL in the QR and the
 * API base that page then calls have to be addresses the phone can actually
 * route to.
 *
 * In production this is all a no-op — the site and the API are on real
 * hostnames already, and nothing here rewrites anything.
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "::1"]);

const isLocalHostname = (hostname) => LOCAL_HOSTS.has(hostname);

/**
 * The origin to encode in the QR code.
 *
 * Priority: an explicit override, then the LAN address Vite injects at dev
 * server start (the browser cannot discover the machine's own LAN IP), then
 * whatever the user is browsing.
 */
export const qrOrigin = () => {
  const override = import.meta.env.VITE_PUBLIC_ORIGIN;
  if (override) return override.replace(/\/+$/, "");

  const here = window.location.origin;
  if (!isLocalHostname(window.location.hostname)) return here;

  // Injected by vite.config.js in dev only; undefined in a production build.
  const lan = typeof __DEV_LAN_ORIGIN__ !== "undefined" ? __DEV_LAN_ORIGIN__ : null;
  return lan || here;
};

/** True when the QR would point at an address only this machine can reach. */
export const qrOriginIsUnreachable = () =>
  isLocalHostname(new URL(qrOrigin()).hostname);

/**
 * API base, corrected for the device actually loading the page.
 *
 * A phone that opened `http://192.168.1.20:5173` was handed a bundle built with
 * `VITE_API_BASE_URL=http://localhost:5000/...`. Pointing that at the phone
 * itself fails; the API is on the same machine as the dev server, so borrow the
 * hostname the page was served from and keep the API's own port.
 */
export const apiBase = () => {
  const base = import.meta.env.VITE_API_BASE_URL || "";
  if (!base) return base;

  try {
    const url = new URL(base, window.location.origin);
    if (isLocalHostname(url.hostname) && !isLocalHostname(window.location.hostname)) {
      url.hostname = window.location.hostname;
      url.protocol = window.location.protocol;
      return url.toString().replace(/\/+$/, "");
    }
    return base;
  } catch {
    return base;
  }
};

/**
 * getUserMedia requires a secure context. Browsers grant that to `localhost`
 * but NOT to a plain-http LAN address, so a phone on `http://192.168.x.x` gets
 * an undefined `navigator.mediaDevices` and the camera never opens — with no
 * error a user could act on. Detected so the UI can say what is wrong.
 */
export const cameraBlockedByInsecureContext = () =>
  !window.isSecureContext && !isLocalHostname(window.location.hostname);
