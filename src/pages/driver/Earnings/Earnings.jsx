import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { fetchDriverEarnings, fetchPayoutRequests, submitPayoutRequest } from "../../../api/driverApi";

const toMoney = (n) => `${Number(n || 0).toLocaleString()} PKR`;

const STATUS_STYLE = {
  PENDING:  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  PAID:     "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—";

function PayoutModal({ weekAmount, onClose, onSubmit }) {
  const [amount, setAmount] = useState(weekAmount > 0 ? weekAmount : "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const val = Number(amount);
    if (!val || val < 1) { toast.error("Enter a valid amount"); return; }
    setSubmitting(true);
    try {
      await onSubmit(val, note);
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || e?.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-6 sm:pb-0">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-townwize-primary px-6 py-5 text-white">
          <h3 className="text-lg font-bold">Request Payout</h3>
          <p className="text-xs text-white/60 mt-0.5">Admin will review and process within 2–3 business days</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Amount (PKR)</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-townwize-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 300))}
              placeholder="e.g. Monthly withdrawal"
              rows={2}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-townwize-primary"
            />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-townwize-primary text-white font-semibold disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-sm text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const Earnings = () => {
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState({ today: 0, week: 0, month: 0, breakdown: [] });
  const [requests, setRequests] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, reqs] = await Promise.all([fetchDriverEarnings(), fetchPayoutRequests()]);
      setEarnings({
        today: Number(data?.today || 0),
        week: Number(data?.week || 0),
        month: Number(data?.month || 0),
        breakdown: Array.isArray(data?.breakdown) ? data.breakdown : [],
      });
      setRequests(Array.isArray(reqs) ? reqs : []);
    } catch {
      toast.error("Unable to load earnings right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const hasPending = requests.some((r) => r.status === "PENDING");

  const handleSubmit = async (amount, note) => {
    await submitPayoutRequest(amount, note);
    toast.success("Payout request submitted!");
    load();
  };

  return (
    <div className="max-w-5xl mx-auto mt-8 px-4 space-y-8">
      {showModal && (
        <PayoutModal
          weekAmount={earnings.week}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
        />
      )}

      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Earnings</h1>
          <p className="text-sm text-gray-500">Your income overview</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            disabled={hasPending || loading}
            className="px-4 py-2 rounded-lg bg-townwize-primary text-white text-sm font-semibold disabled:opacity-50"
            title={hasPending ? "You already have a pending request" : ""}
          >
            Request Payout
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-500">Loading earnings...</div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white dark:bg-townwize-primaryDark rounded-xl shadow-sm">
              <p className="text-sm text-gray-500">Today</p>
              <p className="text-xl font-semibold">{toMoney(earnings.today)}</p>
            </div>
            <div className="p-4 bg-white dark:bg-townwize-primaryDark rounded-xl shadow-sm">
              <p className="text-sm text-gray-500">This Week</p>
              <p className="text-xl font-semibold">{toMoney(earnings.week)}</p>
            </div>
            <div className="p-4 bg-white dark:bg-townwize-primaryDark rounded-xl shadow-sm">
              <p className="text-sm text-gray-500">This Month</p>
              <p className="text-xl font-semibold">{toMoney(earnings.month)}</p>
            </div>
          </div>

          {/* Daily breakdown */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Recent Daily Breakdown</h2>
            {earnings.breakdown.length === 0 ? (
              <div className="text-gray-500 py-8">No completed trips yet.</div>
            ) : (
              <div className="space-y-3">
                {earnings.breakdown.map((row) => (
                  <div
                    key={row.date}
                    className="flex items-center justify-between p-4 bg-white dark:bg-townwize-primaryDark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
                  >
                    <div>
                      <p className="text-sm font-medium">{row.date}</p>
                      <p className="text-xs text-gray-500">{Number(row.trips || 0)} trips</p>
                    </div>
                    <div className="font-semibold">{toMoney(row.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payout requests */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Payout Requests</h2>
            {requests.length === 0 ? (
              <div className="text-gray-500 py-4 text-sm">No payout requests yet.</div>
            ) : (
              <div className="space-y-3">
                {requests.map((r) => (
                  <div
                    key={r._id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-townwize-primaryDark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{toMoney(r.amount)}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status] || STATUS_STYLE.PENDING}`}>
                          {r.status}
                        </span>
                      </div>
                      {r.note && <p className="text-xs text-gray-500 mt-0.5 truncate">{r.note}</p>}
                      {r.rejectionReason && (
                        <p className="text-xs text-red-500 mt-0.5">Rejected: {r.rejectionReason}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 shrink-0">{fmtDate(r.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Earnings;
