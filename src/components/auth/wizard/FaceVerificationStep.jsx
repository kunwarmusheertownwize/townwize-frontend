import { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { QRCodeCanvas } from "qrcode.react";
import FaceLiveness from "../../common/FaceLiveness";
import { hasUsableCamera } from "../../../utils/platform";
import { qrOrigin, qrOriginIsUnreachable } from "../../../utils/publicOrigin";

const BASE = import.meta.env.VITE_API_BASE_URL;
const POLL_MS = 2500;

/**
 * Face verification — its own step, nothing else on the screen.
 *
 * On a phone the camera is right there, so it runs inline.
 *
 * On a desktop it offers a QR code instead: a laptop webcam is a poor match for
 * a CNIC photo — wrong angle, worse sensor, often absent entirely — and the
 * result is what an admin approves the Wizer against. The phone that scans it
 * does the liveness check and posts the result; this page polls and fills in the
 * form field. The webcam stays available underneath so a user without a phone to
 * hand is never blocked.
 */
export default function FaceVerificationStep() {
  const { watch, setValue, trigger, formState: { errors } } = useFormContext();
  const selfie = watch("selfie");

  // Anyone already holding a phone — native app or mobile browser — goes
  // straight to the camera. The QR hand-off exists only to get a desktop user
  // onto a phone, so showing it ON a phone would ask them to scan their own
  // screen with the device displaying it.
  const [mode, setMode] = useState(hasUsableCamera() ? "camera" : "qr");
  const [session, setSession] = useState(null);   // { token, url }
  const [handoff, setHandoff] = useState("idle"); // idle|waiting|scanned|expired|error
  const pollRef = useRef(null);

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const startSession = useCallback(async () => {
    setHandoff("waiting");
    try {
      const res = await fetch(`${BASE}/auth/face-session`, { method: "POST" });
      const body = await res.json();
      const token = body?.data?.token;
      if (!token) throw new Error();
      // NOT window.location.origin — on a dev machine that is `localhost`,
      // which resolves to the phone itself and loads nothing.
      setSession({ token, url: `${qrOrigin()}/face-verify/${token}` });
    } catch {
      setHandoff("error");
    }
  }, []);

  // Open a session as soon as the QR view is shown.
  useEffect(() => {
    if (mode === "qr" && !session && handoff === "idle") startSession();
  }, [mode, session, handoff, startSession]);

  // Poll until the phone reports back.
  useEffect(() => {
    if (!session?.token || selfie) return;
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${BASE}/auth/face-session/${session.token}`);
        const body = await res.json();
        const status = body?.data?.status;
        if (status === "scanned") setHandoff("scanned");
        if (status === "expired") { setHandoff("expired"); stopPolling(); }
        if (status === "completed" && body.data.selfie) {
          setValue("selfie", body.data.selfie, { shouldValidate: true });
          if (body.data.angles) setValue("selfieAngles", body.data.angles);
          trigger("selfie");
          stopPolling();
        }
      } catch { /* transient — keep polling */ }
    }, POLL_MS);
    return stopPolling;
  }, [session, selfie, setValue, trigger]);

  useEffect(() => stopPolling, []);

  // ── Done ────────────────────────────────────────────────────────────────
  if (selfie) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-900/20">
          <img src={selfie} alt="Verified selfie" className="h-24 w-24 rounded-full object-cover ring-4 ring-green-500/30" />
          <div>
            <p className="text-sm font-bold text-green-800 dark:text-green-300">Face verified</p>
            <p className="mt-0.5 text-xs text-green-700 dark:text-green-400">
              This is checked against your CNIC photo during review.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setValue("selfie", "", { shouldValidate: true });
              setValue("selfieAngles", null);
              setSession(null); setHandoff("idle");
            }}
            className="text-xs font-medium text-gray-500 underline-offset-2 hover:text-red-600 hover:underline"
          >
            Retake
          </button>
        </div>
      </div>
    );
  }

  // ── Inline camera (phone, or desktop fallback) ──────────────────────────
  if (mode === "camera") {
    return (
      <div className="space-y-4">
        <FaceLiveness
          name="selfie"
          onAngles={(a) => setValue("selfieAngles", a || null)}
        />
        {errors?.selfie && <p className="text-center text-xs !text-townwize-error">{errors.selfie.message}</p>}
        {!hasUsableCamera() && (
          <button
            type="button"
            onClick={() => { setMode("qr"); setHandoff("idle"); }}
            className="w-full text-xs font-medium text-gray-400 underline-offset-2 hover:text-townwize-primary hover:underline"
          >
            ← Use my phone instead
          </button>
        )}
      </div>
    );
  }

  // ── QR hand-off ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-800">
        <p className="text-sm font-bold text-gray-900 dark:text-white">Continue on your phone</p>
        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          Scan this with your phone camera. Your phone's front camera gives a far
          more reliable match against your CNIC photo.
        </p>

        {qrOriginIsUnreachable() && (
          <div className="mx-auto mt-4 max-w-xs rounded-lg border border-amber-300 bg-amber-50 p-3 text-start dark:border-amber-700 dark:bg-amber-900/20">
            <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              Development only
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
              This QR points at <code>localhost</code>, which a phone cannot reach.
              Open this page on your machine's LAN address instead, or set
              <code> VITE_PUBLIC_ORIGIN</code>. Not shown in production.
            </p>
          </div>
        )}

        <div className="mx-auto mt-5 w-fit rounded-xl bg-white p-3 ring-1 ring-gray-200 dark:ring-gray-600">
          {session?.url ? (
            <QRCodeCanvas value={session.url} size={168} level="M" includeMargin={false} />
          ) : (
            <div className="flex h-[168px] w-[168px] items-center justify-center text-xs text-gray-400">
              {handoff === "error" ? "Could not create a link" : "Preparing…"}
            </div>
          )}
        </div>

        <div className="mt-4 min-h-[20px]">
          {handoff === "waiting" && session && (
            <p className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-townwize-accent" />
              Waiting for your phone…
            </p>
          )}
          {handoff === "scanned" && (
            <p className="text-xs font-medium text-townwize-primary dark:text-townwize-accent">
              Phone connected — follow the prompts there.
            </p>
          )}
          {handoff === "expired" && (
            <button
              type="button"
              onClick={() => { setSession(null); startSession(); }}
              className="text-xs font-semibold text-townwize-primary underline underline-offset-2"
            >
              Link expired — get a new code
            </button>
          )}
          {handoff === "error" && (
            <button
              type="button"
              onClick={() => { setSession(null); startSession(); }}
              className="text-xs font-semibold text-townwize-primary underline underline-offset-2"
            >
              Try again
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        <span className="text-[11px] uppercase tracking-wider text-gray-400">or</span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      </div>

      <button
        type="button"
        onClick={() => setMode("camera")}
        className="w-full rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        Use this computer's camera
      </button>

      {errors?.selfie && <p className="text-center text-xs !text-townwize-error">{errors.selfie.message}</p>}
    </div>
  );
}
