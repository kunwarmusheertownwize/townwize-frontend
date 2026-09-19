import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../services/api";

/**
 * Account deletion, shared by the in-app settings screens and the public
 * /delete-account page.
 *
 * Google Play requires BOTH an in-app route and a public web URL through which
 * a user can request deletion, so the same panel serves both rather than two
 * implementations that would eventually disagree with each other.
 *
 * Three states:
 *   - blocked   — something must be resolved first; say what, do not just
 *                 disable the button and leave them guessing
 *   - scheduled — a request is pending; offer to undo it
 *   - idle      — deletion can be requested, behind a typed confirmation
 */
export default function DeleteAccountPanel() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/users/me/deletion");
      setState(res?.data?.data || null);
    } catch {
      setState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const request = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.post("/users/me/deletion");
      toast.success("Your account is scheduled for deletion.");
      setConfirming(false);
      setTyped("");
      await load();
    } catch (err) {
      // The server returns the specific blockers, so surface those rather than
      // a generic failure — they each need a different action from the user.
      const d = err?.response?.data?.error;
      toast.error(d?.message || "Could not schedule deletion. Please try again.");
      if (d?.details?.blockers) await load();
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.delete("/users/me/deletion");
      toast.success("Your account will not be deleted.");
      await load();
    } catch (err) {
      toast.error(
        err?.response?.data?.error?.message || "Could not cancel. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (!state) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 text-sm text-gray-500">
        Could not load your account status.{" "}
        <button onClick={load} className="underline">Try again</button>
      </div>
    );
  }

  const when = state.scheduledFor
    ? new Date(state.scheduledFor).toLocaleDateString("en-PK", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  /* ── Already scheduled ─────────────────────────────────────────────── */
  if (state.requestedAt) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-5 space-y-3">
        <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
          Your account is scheduled for deletion
        </h3>
        <p className="text-sm text-amber-900/80 dark:text-amber-200/80">
          It will be deleted on <strong>{when}</strong>. Until then your account
          works normally, and you can stop this at any time.
        </p>
        <button
          onClick={cancel}
          disabled={busy}
          className="rounded-xl bg-townwize-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Working…" : "Keep my account"}
        </button>
      </div>
    );
  }

  /* ── Blocked ───────────────────────────────────────────────────────── */
  if (state.blockers?.length) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
          Delete account
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          You can&rsquo;t delete your account just yet:
        </p>
        <ul className="space-y-2">
          {state.blockers.map((b) => (
            <li
              key={b.code}
              className="rounded-xl bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200"
            >
              {b.message}
            </li>
          ))}
        </ul>
        <button onClick={load} className="text-sm text-townwize-primary underline">
          Check again
        </button>
      </div>
    );
  }

  /* ── Idle ──────────────────────────────────────────────────────────── */
  return (
    <div className="rounded-2xl border border-red-200 dark:border-red-900 p-5 space-y-3">
      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
        Delete account
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        This removes your name, phone number, address, identity documents and
        photos. Your account stays usable for{" "}
        <strong>{state.graceDays} days</strong> in case you change your mind,
        then it is deleted permanently and you cannot sign in again.
      </p>
      {/* Said plainly rather than buried: the privacy policy already commits to
          retaining some records, and a person deserves to know that before they
          press the button, not after. */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Records of trips you have taken and payments you have made are kept for
        tax and dispute purposes, as our{" "}
        <a href="/privacy" className="underline">Privacy Policy</a> explains.
        They are no longer linked to your name.
      </p>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
        >
          Delete my account
        </button>
      ) : (
        <div className="space-y-3 rounded-xl bg-red-50 dark:bg-red-900/20 p-4">
          <label className="block text-sm text-red-900 dark:text-red-200">
            Type <strong>DELETE</strong> to confirm
          </label>
          {/* A typed confirmation, not just a second button. Deletion is the
              most destructive thing a user can do to their own account and a
              stray tap must not be enough to start it. */}
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm dark:border-red-800 dark:bg-transparent"
            placeholder="DELETE"
          />
          <div className="flex gap-2">
            <button
              onClick={request}
              disabled={busy || typed.trim().toUpperCase() !== "DELETE"}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy ? "Working…" : "Confirm deletion"}
            </button>
            <button
              onClick={() => {
                setConfirming(false);
                setTyped("");
              }}
              className="rounded-xl px-4 py-2 text-sm text-gray-600 dark:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
