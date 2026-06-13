import { useEffect, useState } from "react";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import { fetchFinancePayouts, generateFinancePayoutBatch, updateFinancePayoutStatus } from "../../../api/adminApi";

export default function PayoutBatches() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const json = await fetchFinancePayouts();
      setItems(json?.data?.items || []);
    } catch (e) {
      setError(e.message || "Failed to load payouts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const money = (n) => `${Number(n || 0).toLocaleString()} PKR`;

  const generateBatch = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await generateFinancePayoutBatch();
      setMessage("New payout batch generated.");
      await load();
    } catch (e) {
      setError(e.message || "Failed to generate payout batch");
    } finally {
      setBusy(false);
    }
  };

  const nextActions = (status) => {
    const s = String(status || "").toUpperCase();
    if (s === "DRAFT") return ["APPROVED", "CANCELLED"];
    if (s === "APPROVED") return ["PROCESSING", "CANCELLED"];
    if (s === "PROCESSING") return ["PAID", "FAILED"];
    if (s === "FAILED") return ["PROCESSING", "CANCELLED"];
    return [];
  };

  const updateStatus = async (batch, nextStatus) => {
    if (!nextStatus) return;
    const notes = window.prompt(`Optional note for ${nextStatus}:`, "") || "";
    const failureReason = nextStatus === "FAILED" ? window.prompt("Failure reason (required for FAILED):", "") || "" : "";
    if (nextStatus === "FAILED" && !failureReason.trim()) return;

    setBusy(true);
    setError("");
    setMessage("");
    try {
      await updateFinancePayoutStatus(batch._id || batch.id, {
        status: nextStatus,
        notes,
        failureReason,
      });
      setMessage(`Batch moved to ${nextStatus}.`);
      await load();
    } catch (e) {
      setError(e.message || "Failed to update payout batch");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Payout Batches</h1>
        <button
          className="rounded-md bg-townwize-primary px-3 py-2 text-sm text-white disabled:opacity-50"
          disabled={busy}
          onClick={generateBatch}
        >
          {busy ? "Working..." : "Generate Batch"}
        </button>
      </div>

      {message ? <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div> : null}
      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Batch ID</th>
              <th className="px-4 py-3 text-left">Period</th>
              <th className="px-4 py-3 text-left">Trips</th>
              <th className="px-4 py-3 text-left">Drivers</th>
              <th className="px-4 py-3 text-left">Gross</th>
              <th className="px-4 py-3 text-left">Tax</th>
              <th className="px-4 py-3 text-left">Platform Fee</th>
              <th className="px-4 py-3 text-left">Commission</th>
              <th className="px-4 py-3 text-left">Townwize Revenue</th>
              <th className="px-4 py-3 text-left">Driver Payout</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-10 text-center text-gray-500" colSpan={12}>
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="p-8" colSpan={12}>
                  <EmptyState title="No payouts found" description="No payout batches yet" />
                </td>
              </tr>
            ) : (
              items.map((it) => {
                const actions = nextActions(it.status);
                const period = it.periodFrom && it.periodTo
                  ? `${new Date(it.periodFrom).toLocaleDateString()} - ${new Date(it.periodTo).toLocaleDateString()}`
                  : it.period || "-";
                return (
                  <tr key={it._id || it.id} className="border-t">
                    <td className="px-4 py-3">{it.code || it.id}</td>
                    <td className="px-4 py-3">{period}</td>
                    <td className="px-4 py-3">{it.totalTrips ?? it.drivers ?? "-"}</td>
                    <td className="px-4 py-3">{it.totalDrivers ?? "-"}</td>
                    <td className="px-4 py-3">{money(it.grossAmount ?? it.amount)}</td>
                    <td className="px-4 py-3">{money(it.taxAmount)}</td>
                    <td className="px-4 py-3">{money(it.platformFeeAmount)}</td>
                    <td className="px-4 py-3">{money(it.commissionAmount)}</td>
                    <td className="px-4 py-3">
                      {money(it.townwizeRevenue ?? Number(it.platformFeeAmount || 0) + Number(it.commissionAmount || 0))}
                    </td>
                    <td className="px-4 py-3">{money(it.payoutAmount ?? it.amount)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={it.status || "-"} />
                    </td>
                    <td className="px-4 py-3">
                      {actions.length ? (
                        <select
                          className="rounded border px-2 py-1 text-xs"
                          defaultValue=""
                          onChange={(e) => {
                            updateStatus(it, e.target.value);
                            e.target.value = "";
                          }}
                        >
                          <option value="" disabled>
                            Change status...
                          </option>
                          {actions.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-500">No actions</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
