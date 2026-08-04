import { useCallback, useEffect, useState } from "react";
import { fetchNoShowDisputes, resolveNoShowDispute } from "../../../api/adminApi";

/**
 * Disputed no-shows, each with its GPS verdict already worked out.
 *
 * A no-show is otherwise one person's word against another's — and the
 * passenger is the one charged. Every trip records a GPS trail, so the two
 * questions that settle it (did the Wizer reach the pickup, and did they wait
 * long enough) are answered by the server before this page renders. The admin
 * reads a conclusion and decides; nobody interprets a map.
 *
 * Upholding clears the passenger's fee and charges the same amount to the
 * Wizer. Deliberately a human action: taking money off a driver on an automated
 * reading of consumer GPS would not be defensible.
 */

const VERDICT_STYLES = {
  NEVER_ARRIVED: { label: "Never arrived", cls: "bg-red-100 text-red-700 border-red-200" },
  TOO_BRIEF: { label: "Left too early", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  SUPPORTED: { label: "Waited as required", cls: "bg-green-100 text-green-700 border-green-200" },
  NO_EVIDENCE: { label: "No GPS trail", cls: "bg-gray-100 text-gray-600 border-gray-200" },
};

const SUGGESTION_TEXT = {
  UPHOLD: "Evidence favours the passenger",
  REJECT: "Evidence supports the Wizer",
  REVIEW_MANUALLY: "Decide manually — no trail to check",
};

export default function NoShowDisputes() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("OPEN");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [notes, setNotes] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const json = await fetchNoShowDisputes(status);
      setItems(json?.data?.items || []);
    } catch (e) {
      setError(e.message || "Failed to load disputes");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (rideId, uphold) => {
    const fee = items.find((i) => i.rideId === rideId)?.noShowFee || 0;
    const confirmText = uphold
      ? `Clear the passenger's ${fee} PKR fee and charge the same amount to the Wizer?`
      : "Reject this dispute and leave the passenger's fee in place?";
    if (!window.confirm(confirmText)) return;

    setBusyId(rideId);
    try {
      await resolveNoShowDispute(rideId, { uphold, note: notes[rideId] || "" });
      await load();
    } catch (e) {
      setError(e.message || "Failed to resolve dispute");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="dark:text-white text-xl font-semibold">No-show disputes</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Upholding removes the passenger's fee and charges it to the Wizer instead.
          </p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border px-3 py-1.5 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
        >
          <option value="OPEN">Open</option>
          <option value="UPHELD">Upheld</option>
          <option value="REJECTED">Rejected</option>
          <option value="ALL">All</option>
        </select>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-8 text-sm text-gray-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-gray-500">
          No {status === "ALL" ? "" : status.toLowerCase()} disputes.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((d) => {
            const v = VERDICT_STYLES[d.evidence?.verdict] || VERDICT_STYLES.NO_EVIDENCE;
            const isOpen = d.status === "OPEN";
            return (
              <div key={d.rideId} className="rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 p-5 space-y-4">

                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold dark:text-white">
                      {d.passenger} <span className="text-gray-400 font-normal">vs</span> {d.driver}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {d.pickupAddress || "—"} · fee {d.noShowFee} PKR
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${v.cls}`}>
                    {v.label}
                  </span>
                </div>

                {/* The finding, in words. No map to read. */}
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 space-y-1">
                  <p className="text-sm dark:text-gray-200">{d.evidence?.summary}</p>
                  <p className="text-xs text-gray-500">
                    Closest approach: {d.evidence?.closestMetres ?? "—"} m ·
                    {" "}waited {d.evidence?.waitedMinutes ?? "—"} min of {d.evidence?.requiredWaitMinutes} required
                  </p>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 pt-1">
                    {SUGGESTION_TEXT[d.suggestion]}
                  </p>
                </div>

                {d.passengerReason && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                    Passenger says: “{d.passengerReason}”
                  </p>
                )}

                {isOpen ? (
                  <div className="space-y-2">
                    <input
                      value={notes[d.rideId] || ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [d.rideId]: e.target.value }))}
                      placeholder="Note (optional) — recorded in the audit log"
                      className="w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={busyId === d.rideId}
                        onClick={() => resolve(d.rideId, true)}
                        className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Uphold — charge the Wizer {d.noShowFee} PKR
                      </button>
                      <button
                        disabled={busyId === d.rideId}
                        onClick={() => resolve(d.rideId, false)}
                        className="flex-1 rounded-lg border py-2 text-sm font-semibold dark:text-white disabled:opacity-50"
                      >
                        Reject — fee stands
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    {d.status === "UPHELD"
                      ? `Upheld — ${d.driverPenalty} PKR charged to the Wizer`
                      : "Rejected — the passenger's fee stands"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
