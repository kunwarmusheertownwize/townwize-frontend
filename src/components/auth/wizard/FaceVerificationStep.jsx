import { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { QRCodeCanvas } from "qrcode.react";
import FaceLiveness from "../../common/FaceLiveness";
import { isNative } from "../../../utils/platform";

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

  const [mode, setMode] = useState(isNative() ? "camera" : "qr");
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
      setSession({ token, url: `${window.location.origin}/face-verify/${token}` });
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
        <FaceLiveness name="selfie" />
        {errors?.selfie && <p className="text-center text-xs !text-townwize-error">{errors.selfie.message}</p>}
        {!isNative() && (
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
