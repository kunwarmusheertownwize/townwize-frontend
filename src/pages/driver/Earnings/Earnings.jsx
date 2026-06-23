import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { fetchDriverEarnings, fetchPayoutRequests, submitPayoutRequest } from "../../../api/driverApi";

const toMoney = (n) => `PKR ${Number(n || 0).toLocaleString()}`;
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—";

const STATUS_STYLE = {
  PENDING:  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  PAID:     "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const STATUS_LABEL = {
  PENDING: "Under Review",
  APPROVED: "Approved",
  PAID: "Confirmed",
  REJECTED: "Rejected",
};

function PaymentModal({ balanceOwed, onClose, onSubmit }) {
  const [amount, setAmount] = useState(balanceOwed > 0 ? balanceOwed : "");
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
      toast.error(e?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-6 sm:pb-0">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-townwize-primary to-townwize-primaryDark px-6 py-5 text-white">
          <h3 className="text-lg font-bold">Submit Commission Payment</h3>
          <p className="text-xs text-white/70 mt-0.5">
            Send payment via EasyPaisa / JazzCash, then submit proof here
          </p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Amount Paid (PKR)
            </label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-townwize-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Transaction Reference
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 300))}
              placeholder="e.g. EasyPaisa TID: 1234567890 · sent to 0300-XXXXXXX"
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
            {submitting ? "Submitting…" : "Submit Payment"}
          </button>
          <button type="button" onClick={onClose} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const Earnings = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    today: 0, week: 0, month: 0,
    balance: 0, balanceStatus: "clear",
    hardBlockThreshold: -3000, softWarnThreshold: -1500,
    totalCommission: 0, breakdown: [],
  });
  const [requests, setRequests] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [earnings, reqs] = await Promise.all([fetchDriverEarnings(), fetchPayoutRequests()]);
      setData({
        today: Number(earnings?.today || 0),
        week: Number(earnings?.week || 0),
        month: Number(earnings?.month || 0),
        balance: Number(earnings?.balance ?? 0),
        balanceStatus: earnings?.balanceStatus || "clear",
        hardBlockThreshold: Number(earnings?.hardBlockThreshold ?? -3000),
        softWarnThreshold: Number(earnings?.softWarnThreshold ?? -1500),
        totalCommission: Number(earnings?.totalCommission || 0),
        breakdown: Array.isArray(earnings?.breakdown) ? earnings.breakdown : [],
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
  const balanceOwed = data.balance < 0 ? Math.abs(data.balance) : 0;
  const isBlocked = data.balanceStatus === "blocked";
  const isWarning = data.balanceStatus === "warning";

  const handleSubmit = async (amount, note) => {
    await submitPayoutRequest(amount, note);
    toast.success("Payment submitted! Admin will confirm within 1–2 business days.");
    load();
  };

  return (
    <div className="max-w-3xl mx-auto mt-8 px-4 pb-12 space-y-6">
      {showModal && (
        <PaymentModal
          balanceOwed={balanceOwed}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
        />
      )}

      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Earnings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Your income &amp; commission overview</p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">Loading earnings…</div>
      ) : (
        <>
          {/* Balance card — primary hero */}
          <div
            className={[
              "rounded-2xl p-5 text-white",
              isBlocked
                ? "bg-gradient-to-br from-red-600 to-red-800"
                : isWarning
                ? "bg-gradient-to-br from-orange-500 to-red-600"
                : "bg-gradient-to-br from-green-600 to-emerald-700",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-1">
                  {balanceOwed > 0 ? "Commission Owed" : "Commission Balance"}
                </p>
                <p className="text-3xl font-bold tracking-tight">
                  {balanceOwed > 0 ? toMoney(balanceOwed) : "Clear ✓"}
                </p>
                {balanceOwed > 0 && (
                  <p className="text-xs text-white/70 mt-1">
                    Pay before reaching {toMoney(Math.abs(data.hardBlockThreshold))} to avoid being blocked
                  </p>
                )}
                {!balanceOwed && (
                  <p className="text-xs text-white/70 mt-1">No outstanding commission — you're all good</p>
                )}
              </div>
              {balanceOwed > 0 && (
                <button
                  onClick={() => setShowModal(true)}
                  disabled={hasPending}
                  className="shrink-0 px-4 py-2 rounded-xl bg-white text-red-600 text-sm font-bold hover:bg-red-50 disabled:opacity-60 transition shadow-sm"
                  title={hasPending ? "Payment already submitted, awaiting confirmation" : ""}
                >
                  {hasPending ? "Pending…" : "I've Paid"}
                </button>
              )}
            </div>

            {/* Progress bar toward block threshold */}
            {balanceOwed > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-[10px] text-white/60 mb-1">
                  <span>PKR 0</span>
                  <span>Block at {toMoney(Math.abs(data.hardBlockThreshold))}</span>
                </div>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/80 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (balanceOwed / Math.abs(data.hardBlockThreshold)) * 100).toFixed(1)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Education card — shown when commission is clear */}
          {!balanceOwed && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl px-4 py-3.5">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-0.5">How cash commission works</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                You collect fares directly in cash. Townwize's commission is tracked here. When your balance reaches{" "}
                <strong>PKR 1,500</strong>, you'll get a warning. At <strong>PKR 3,000</strong>, you'll be temporarily
                blocked until you pay via EasyPaisa / JazzCash and submit proof below.
              </p>
            </div>
          )}

          {/* Earnings KPIs */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Your Take-Home (after commission)
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Today", value: data.today },
                { label: "This Week", value: data.week },
                { label: "This Month", value: data.month },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="p-4 bg-white dark:bg-townwize-primaryDark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
                >
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{toMoney(value)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Daily breakdown */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Recent Daily Breakdown
            </h2>
            {data.breakdown.length === 0 ? (
              <div className="text-sm text-gray-400 py-6 text-center">No completed trips yet.</div>
            ) : (
              <div className="space-y-2">
                {data.breakdown.map((row) => (
                  <div
                    key={row.date}
                    className="flex items-center justify-between px-4 py-3 bg-white dark:bg-townwize-primaryDark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{row.date}</p>
                      <p className="text-xs text-gray-400">{Number(row.trips || 0)} trip{row.trips !== 1 ? "s" : ""}</p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white">{toMoney(row.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment history */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Commission Payment History
              </h2>
              {balanceOwed > 0 && !hasPending && (
                <button
                  onClick={() => setShowModal(true)}
                  className="text-xs font-bold text-townwize-primary hover:underline"
                >
                  + Submit payment
                </button>
              )}
            </div>
            {requests.length === 0 ? (
              <div className="text-sm text-gray-400 py-4 text-center">No payments submitted yet.</div>
            ) : (
              <div className="space-y-2">
                {requests.map((r) => (
                  <div
                    key={r._id}
                    className="flex items-center justify-between px-4 py-3 bg-white dark:bg-townwize-primaryDark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{toMoney(r.amount)}</p>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status] || STATUS_STYLE.PENDING}`}
                        >
                          {STATUS_LABEL[r.status] || r.status}
                        </span>
                      </div>
                      {r.note && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{r.note}</p>
                      )}
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
