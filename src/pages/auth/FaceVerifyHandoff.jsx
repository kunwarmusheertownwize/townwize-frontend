import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import FaceLiveness from "../../components/common/FaceLiveness";
import { apiBase, cameraBlockedByInsecureContext } from "../../utils/publicOrigin";

// Resolved per-load, not at module scope: this page is the one place the device
// running it may not be the device the bundle was configured for.
const BASE = apiBase();

/**
 * The page a phone lands on after scanning the QR shown on the desktop.
 *
 * Standalone and unauthenticated — it runs before the account exists. It does
 * the liveness check, posts the result against the hand-off token, and tells the
 * user to go back to their computer. The desktop is polling and picks it up.
 */
export default function FaceVerifyHandoff() {
  const { token } = useParams();
  const methods = useForm({ defaultValues: { selfie: "", selfieAngles: null } });
  const selfie = methods.watch("selfie");

  const [state, setState] = useState("checking"); // checking|ready|sending|done|error
  const [message, setMessage] = useState("");

  // Tell the desktop a phone has picked it up, so it can stop saying "waiting".
  useEffect(() => {
    // Say this before anything else. On a plain-http LAN address the browser
    // withholds the camera entirely, and the liveness component can only report
    // a generic permission failure — which sends people into their phone
    // settings looking for a permission that was never asked for.
    if (cameraBlockedByInsecureContext()) {
      setState("error");
      setMessage(
        "Your browser only allows camera access over a secure (https) connection. " +
        "This link is plain http, so the camera cannot open. Use the Townwize app, " +
        "or continue on your computer."
      );
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BASE}/auth/face-session/${token}`);
        const body = await res.json();
        const status = body?.data?.status;
        if (cancelled) return;
        if (status === "expired") {
          setState("error");
          setMessage("This link has expired. Start again on your computer.");
          return;
        }
        if (status === "completed") {
          setState("done");
          setMessage("Already verified. You can return to your computer.");
          return;
        }
        fetch(`${BASE}/auth/face-session/${token}/scan`, { method: "POST" }).catch(() => {});
        setState("ready");
      } catch {
        if (!cancelled) { setState("error"); setMessage("Could not reach Townwize. Check your connection."); }
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Once liveness produces an image, send it up.
  useEffect(() => {
    if (!selfie || state !== "ready") return;
    setState("sending");
    (async () => {
      try {
        const res = await fetch(`${BASE}/auth/face-session/${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selfie, angles: methods.getValues("selfieAngles") }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.message || "Upload failed");
        setState("done");
      } catch (e) {
        setState("error");
        setMessage(e.message || "Could not send your verification. Please try again.");
      }
    })();
  }, [selfie, state, token]);

  return (
    <div className="min-h-screen bg-townwize-bgLight px-4 py-10 dark:bg-townwize-primaryDark">
      <div className="mx-auto max-w-sm text-center">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-townwize-accent">Townwize</p>
        <h1 className="mt-1 text-xl font-extrabold text-townwize-primary dark:text-white">
          Face verification
        </h1>

        {state === "checking" && (
          <p className="mt-8 text-sm text-gray-500">Checking your link…</p>
        )}

        {state === "error" && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{message}</p>
          </div>
        )}

        {state === "done" && (
          <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
            <div className="text-3xl">✓</div>
            <p className="mt-2 text-sm font-bold text-green-800 dark:text-green-300">
              {message || "Verification complete"}
            </p>
            <p className="mt-1 text-xs text-green-700 dark:text-green-400">
              Return to your computer — it has already updated. You can close this page.
            </p>
          </div>
        )}

        {(state === "ready" || state === "sending") && (
          <>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Hold your phone at eye level and follow the prompts.
            </p>
            <div className="mt-6">
              <FormProvider {...methods}>
                <FaceLiveness
                  control={methods.control}
                  name="selfie"
                  onAngles={(a) => methods.setValue("selfieAngles", a || null)}
                />
              </FormProvider>
            </div>
            {state === "sending" && (
              <p className="mt-4 text-sm font-medium text-townwize-primary dark:text-townwize-accent">
                Sending to your computer…
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
