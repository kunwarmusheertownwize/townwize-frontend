import { useEffect, useState } from "react";
import { fetchDriverPayoutRequests, reviewDriverPayoutRequest } from "../../../api/adminApi";

const STATUS_STYLE = {
  PENDING:  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  PAID:     "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const money = (n) => `${Number(n || 0).toLocaleString()} PKR`;
const fmtDate = (iso) => iso ? new Date(iso).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function DriverPayoutRequests() {
  const [items, setItems]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(null);
  const [toast, setToast]       = useState("");
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async (p = page, s = statusFilter) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (s) params.status = s;
      const json = await fetchDriverPayoutRequests(params);
      setItems(json?.data?.items || []);
      setTotal(json?.data?.total || 0);
      setPages(json?.data?.pages || 1);
    } catch {
      setToast("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page, statusFilter); }, [page, statusFilter]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const act = async (id, action, extra = {}) => {
    setBusy(id + action);
    try {
      await reviewDriverPayoutRequest(id, { action, ...extra });
      showToast(action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Marked as paid");
      load(page, statusFilter);
    } catch (e) {
      showToast(e.message || "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const handleReject = () => {
    if (!rejectModal) return;
    act(rejectModal, "reject", { rejectionReason: rejectReason });
    setRejectModal(null);
    setRejectReason("");
  };

  const pendingCount = items.filter((i) => i.status === "PENDING").length;

  return (
    <div className="space-y-5">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-townwize-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Reject reason modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Rejection Reason</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (optional)"
              rows={3}
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-900 dark:bg-gray-800 text-gray-900 dark:text-white dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Driver Payout Requests</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {total} total · {pendingCount} pending review
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-white dark:bg-gray-900 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-townwize-primary"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="PAID">Paid</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No payout requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3 text-left font-semibold">Driver</th>
                  <th className="px-4 py-3 text-left font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold">Note</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Submitted</th>
                  <th className="px-4 py-3 text-left font-semibold">Reviewed by</th>
                  <th className="px-4 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-800/40 transition">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 dark:text-white truncate max-w-[160px]">{item.driverEmail}</p>
                      <p className="text-[11px] text-gray-400">{item.driverPhone}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-townwize-primary dark:text-white">{money(item.amount)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[180px]">
                      <p className="truncate">{item.note || "—"}</p>
                      {item.rejectionReason && (
                        <p className="text-[10px] text-red-500 mt-0.5">Reason: {item.rejectionReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_STYLE[item.status] || ""}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(item.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {item.reviewedByEmail ? (
                        <>
                          <p>{item.reviewedByEmail}</p>
                          <p className="text-[10px]">{fmtDate(item.reviewedAt)}</p>
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {item.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => act(item._id, "approve")}
                              disabled={!!busy}
                              className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold disabled:opacity-50 transition"
                            >
                              {busy === item._id + "approve" ? "…" : "Approve"}
                            </button>
                            <button
                              onClick={() => setRejectModal(item._id)}
                              disabled={!!busy}
                              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-50 transition"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {item.status === "APPROVED" && (
                          <button
                            onClick={() => act(item._id, "mark_paid")}
                            disabled={!!busy}
                            className="px-3 py-1.5 rounded-lg bg-townwize-primary hover:bg-townwize-primaryDark text-white text-xs font-bold disabled:opacity-50 transition"
                          >
                            {busy === item._id + "mark_paid" ? "…" : "Mark Paid"}
                          </button>
                        )}
                        {(item.status === "REJECTED" || item.status === "PAID") && (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-800 transition"
          >
            ←
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-800 transition"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
