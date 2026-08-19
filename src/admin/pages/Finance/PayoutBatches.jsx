import { Fragment, useEffect, useState } from "react";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import {
  fetchFinancePayouts,
  generateFinancePayoutBatch,
  updateFinancePayoutStatus,
  downloadPayoutTransfers,
} from "../../../api/adminApi";

// Safepay Payouts is on hold pending SBP approval, so Wizers are paid by bank
// transfer. A batch is only worth a file once someone has approved it.
const TRANSFERABLE = ["APPROVED", "PROCESSING", "PAID"];

export default function PayoutBatches() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState(null); // { batch, nextStatus }
  const [actionNotes, setActionNotes] = useState("");
  const [actionFailureReason, setActionFailureReason] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [skipped, setSkipped] = useState([]);

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
    setSkipped([]);
    try {
      const json = await generateFinancePayoutBatch();
      setMessage("New payout batch generated.");
      // Wizers left out because they have no bank details. Surfaced rather than
      // swallowed — they earned this cycle and are not getting paid, so someone
      // has to chase them before the next run.
      setSkipped(json?.data?.notPayable || []);
      await load();
    } catch (e) {
      setError(e.message || "Failed to generate payout batch");
    } finally {
      setBusy(false);
    }
  };

  const getTransferFile = async (batch) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await downloadPayoutTransfers(batch._id || batch.id, batch.code);
      setMessage("Transfer file downloaded.");
    } catch (e) {
      setError(e.message || "Could not produce the transfer file");
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

  const openActionModal = (batch, nextStatus) => {
    if (!nextStatus) return;
    setPendingAction({ batch, nextStatus });
    setActionNotes("");
    setActionFailureReason("");
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    const { batch, nextStatus } = pendingAction;
    if (nextStatus === "FAILED" && !actionFailureReason.trim()) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await updateFinancePayoutStatus(batch._id || batch.id, {
        status: nextStatus,
        notes: actionNotes,
        failureReason: actionFailureReason,
      });
      setMessage(`Batch moved to ${nextStatus}.`);
      setPendingAction(null);
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
        <div>
          <h1 className="dark:text-white text-xl font-semibold">Payout Batches</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Weekly cycle. A batch covers the seven days ending on the payout day, and includes
            card-settled trips only — cash fares are already in the Wizer's hands.
          </p>
        </div>
        <button
          className="rounded-md bg-townwize-primary px-3 py-2 text-sm text-white disabled:opacity-50"
          disabled={busy}
          onClick={generateBatch}
        >
          {busy ? "Working..." : "Generate Batch"}
        </button>
      </div>

      {message ? <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-gray-800 dark:text-white dark:border-gray-600">{message}</div> : null}
      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-gray-800 dark:text-white dark:border-gray-600">{error}</div> : null}

      {skipped.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/20">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {skipped.length} Wizer{skipped.length > 1 ? "s" : ""} left out — no bank details
          </p>
          <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
            They earned this cycle but cannot be paid. Their trips return to the pool and will be
            picked up by the next batch once details are supplied.
          </p>
          <ul className="mt-2 space-y-1">
            {skipped.map((s) => (
              <li key={String(s.driverId)} className="text-xs text-amber-900 dark:text-amber-200">
                <span className="font-medium">{s.driverName || String(s.driverId)}</span>
                {" — "}{s.trips} trip{s.trips === 1 ? "" : "s"}, missing: {s.missing.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
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
              <th className="px-4 py-3 text-left">Wizer Earnings</th>
              <th className="px-4 py-3 text-left">Commission Withheld</th>
              <th className="px-4 py-3 text-left">Net to Pay</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-10 text-center text-gray-500 dark:text-gray-400" colSpan={14}>
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="p-8" colSpan={14}>
                  <EmptyState title="No payouts found" description="No payout batches yet" />
                </td>
              </tr>
            ) : (
              items.map((it) => {
                const actions = nextActions(it.status);
                const period = it.periodFrom && it.periodTo
                  ? `${new Date(it.periodFrom).toLocaleDateString()} - ${new Date(it.periodTo).toLocaleDateString()}`
                  : it.period || "-";
                const id = it._id || it.id;
                const lines = Array.isArray(it.lines) ? it.lines : [];
                const isOpen = expandedId === id;
                return (
                  <Fragment key={id}>
                  <tr className="border-t">
                    <td className="px-4 py-3">
                      {lines.length ? (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isOpen ? null : id)}
                          aria-expanded={isOpen}
                          className="text-left font-medium text-townwize-primary hover:underline"
                        >
                          {isOpen ? "▾" : "▸"} {it.code || id}
                        </button>
                      ) : (
                        it.code || id
                      )}
                    </td>
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
                    <td className="px-4 py-3 text-amber-700 dark:text-amber-400">
                      {Number(it.commissionOffsetTotal || 0) > 0 ? `- ${money(it.commissionOffsetTotal)}` : money(0)}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {money(it.netPayoutAmount ?? it.payoutAmount ?? it.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={it.status || "-"} />
                    </td>
                    <td className="px-4 py-3">
                      {actions.length ? (
                        <select
                          className="rounded border px-2 py-1 text-xs"
                          defaultValue=""
                          onChange={(e) => {
                            openActionModal(it, e.target.value);
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
                        <span className="text-xs text-gray-500 dark:text-gray-400">No actions</span>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-gray-50 dark:bg-gray-800/60">
                      <td colSpan={14} className="px-4 py-4">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Per-Wizer breakdown — one bank transfer each
                          </p>
                          {TRANSFERABLE.includes(String(it.status || "").toUpperCase()) ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => getTransferFile(it)}
                              className="rounded-md border border-townwize-primary px-3 py-1.5 text-xs font-semibold text-townwize-primary disabled:opacity-50 hover:bg-townwize-primary hover:text-white transition"
                            >
                              ↓ Bank transfer file (CSV)
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Approve the batch to produce a transfer file
                            </span>
                          )}
                        </div>
                        <div className="overflow-x-auto rounded-lg border bg-white dark:bg-gray-900">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-100 dark:bg-gray-800">
                              <tr>
                                <th className="px-3 py-2 text-left">Wizer</th>
                                <th className="px-3 py-2 text-left">Trips</th>
                                <th className="px-3 py-2 text-left">Earned</th>
                                <th className="px-3 py-2 text-left">Commission withheld</th>
                                <th className="px-3 py-2 text-left">Credit added</th>
                                <th className="px-3 py-2 text-left">Net to pay</th>
                                <th className="px-3 py-2 text-left">Ledger at generation</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lines.map((ln) => (
                                <tr key={String(ln.driverId)} className="border-t">
                                  <td className="px-3 py-2">{ln.driverName || String(ln.driverId)}</td>
                                  <td className="px-3 py-2">{ln.trips}</td>
                                  <td className="px-3 py-2">{money(ln.grossEarning)}</td>
                                  <td className="px-3 py-2 text-amber-700 dark:text-amber-400">
                                    {Number(ln.commissionOffset || 0) > 0 ? `- ${money(ln.commissionOffset)}` : money(0)}
                                  </td>
                                  <td className="px-3 py-2 text-green-700 dark:text-green-400">
                                    {Number(ln.carriedCredit || 0) > 0 ? `+ ${money(ln.carriedCredit)}` : money(0)}
                                  </td>
                                  <td className="px-3 py-2 font-semibold">{money(ln.netPayable)}</td>
                                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                                    {money(ln.balanceAtGeneration)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {it.offsetsAppliedAt ? (
                          <p className="mt-2 text-xs text-green-700 dark:text-green-400">
                            Commission withheld here has been credited to the Wizers' ledgers.
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Status-change modal */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Move to {pendingAction.nextStatus}
            </h2>

            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                Note <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Add an internal note…"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-townwize-primary"
              />
            </div>

            {pendingAction.nextStatus === "FAILED" && (
              <div>
                <label className="text-xs font-medium text-red-500 block mb-1">
                  Failure reason <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={actionFailureReason}
                  onChange={(e) => setActionFailureReason(e.target.value)}
                  placeholder="Required for FAILED status"
                  className="w-full rounded-lg border border-red-300 dark:border-red-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setPendingAction(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={busy || (pendingAction.nextStatus === "FAILED" && !actionFailureReason.trim())}
                className="flex-1 py-2 rounded-xl bg-townwize-primary text-white text-sm font-semibold disabled:opacity-50 transition"
              >
                {busy ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
