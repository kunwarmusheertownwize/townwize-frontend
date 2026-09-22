import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import {
  fetchDriverEarnings,
  fetchPayoutRequests,
  submitPayoutRequest,
  fetchPayoutDetails,
  savePayoutDetails,
  startCommissionPayment,
} from "../../../api/driverApi";
import RemittanceDetails from "../../../components/driver/RemittanceDetails";

const toMoney = (n) => `PKR ${Number(n || 0).toLocaleString()}`;
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—";

const fmtShortDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short" }) : "—";

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

// Aggregate daily breakdown rows into weekly buckets for 30-day view
const groupIntoWeeks = (dailyRows) => {
  // dailyRows are sorted newest-first; reverse to process chronologically
  const sorted = [...dailyRows].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!sorted.length) return [];

  const weeks = [];
  let weekIndex = 0;
  let weekLabel = "W1";
  let weekTrips = 0;
  let weekGross = 0;
  let weekCommission = 0;
  let weekTotal = 0;
  let weekStart = sorted[0]?.date;
  let dayCount = 0;

  sorted.forEach((row) => {
    if (dayCount > 0 && dayCount % 7 === 0) {
      weeks.push({ label: weekLabel, trips: weekTrips, gross: weekGross, commission: weekCommission, total: weekTotal, startDate: weekStart, endDate: row.date });
      weekIndex += 1;
      weekLabel = `W${weekIndex + 1}`;
      weekTrips = 0;
      weekGross = 0;
      weekCommission = 0;
      weekTotal = 0;
      weekStart = row.date;
    }
    weekTrips += Number(row.trips || 0);
    weekGross += Number(row.gross || 0);
    weekCommission += Number(row.commission || 0);
    weekTotal += Number(row.total || 0);
    dayCount += 1;
  });

  // Flush remaining days
  if (weekTrips > 0 || dayCount > 0) {
    weeks.push({ label: weekLabel, trips: weekTrips, gross: weekGross, commission: weekCommission, total: weekTotal, startDate: weekStart, endDate: sorted[sorted.length - 1]?.date });
  }

  return weeks.reverse(); // newest first
};

function BarChart({ rows, labelKey, valueKey, period }) {
  if (!rows.length) return null;
  const maxVal = Math.max(...rows.map((r) => Number(r[valueKey] || 0)), 1);
  const displayRows = period === "monthly" ? [...rows].reverse() : [...rows].reverse();

  return (
    <div className="flex items-end gap-1 h-24 w-full overflow-x-auto">
      {displayRows.map((row, i) => {
        const val = Number(row[valueKey] || 0);
        const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
        const label = period === "monthly"
          ? row.label
          : fmtShortDate(row[labelKey]);
        // h-full + a flex-1 track: a percentage height only resolves against a
        // parent with a DEFINITE height. This column had none, so every bar
        // computed to zero and the chart has always rendered empty — even with
        // real earnings in the table directly beneath it.
        return (
          <div key={i} className="flex-1 min-w-[28px] h-full flex flex-col items-center gap-1 group relative">
            <div className="w-full flex-1 flex items-end">
              <div
                className="w-full rounded-t-sm bg-townwize-accent/80 hover:bg-townwize-accent transition-all"
                style={{ height: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <span className="text-[9px] text-gray-400 dark:text-gray-500 truncate w-full text-center leading-none">
              {label}
            </span>
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 shadow-lg">
              {toMoney(val)} · {row.trips} trip{row.trips !== 1 ? "s" : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaymentModal({ balanceOwed, onClose, onSubmit }) {
  const [amount, setAmount] = useState(balanceOwed > 0 ? balanceOwed : "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [payingNow, setPayingNow] = useState(false);

  /* Hands off to Safepay's checkout. The amount is NOT sent: the server reads
     what is owed from the driver's own ledger, so a stale screen cannot ask
     for the wrong figure and nothing here can overpay them into credit. */
  const payNow = async () => {
    if (payingNow) return;
    setPayingNow(true);
    try {
      const { checkoutUrl } = await startCommissionPayment();
      if (!checkoutUrl) throw new Error("Could not start the payment");
      window.location.href = checkoutUrl;
    } catch (e) {
      toast.error(e?.message || "Could not open the payment page. Please try again.");
      setPayingNow(false);
    }
  };

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
          <h3 className="text-lg font-bold">Pay your commission</h3>
          {/* Was "Send payment via EasyPaisa / JazzCash, then submit proof
              here" — which described the only route that existed, told the
              driver nothing about WHERE to send it, and is no longer the
              recommended way to do it. */}
          <p className="text-xs text-white/70 mt-0.5">
            Pay in the app and your balance clears straight away
          </p>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* PAY IN THE APP — the primary route.
              Before this, every commission payment was a manual loop: transfer
              the money yourself, type the amount and a reference, then wait for
              an admin to confirm it by hand before your balance moved. This
              settles the ledger the moment the payment captures, with nobody in
              the path. */}
          <div className="rounded-xl border border-townwize-primary/30 bg-townwize-primary/5 dark:bg-townwize-primary/10 p-4">
            <p className="text-sm font-bold text-townwize-primary dark:text-townwize-accent">
              Pay now, in the app
            </p>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Card, EasyPaisa, JazzCash or bank transfer. Your balance updates
              automatically — no reference to type and nothing to wait for.
            </p>
            <button
              type="button"
              onClick={payNow}
              disabled={payingNow || balanceOwed <= 0}
              className="mt-3 w-full py-3 rounded-xl bg-townwize-primary text-white font-semibold disabled:opacity-60"
            >
              {payingNow ? "Opening payment…" : `Pay ${toMoney(balanceOwed)} now`}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            <span className="text-[11px] uppercase tracking-wide text-gray-400">or pay manually</span>
            <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* The manual route, kept as a fallback for a driver who would rather
              transfer it themselves — or for when card payments are switched
              off. It used to be the ONLY route, and it never said where to
              send the money. */}
          <RemittanceDetails compact />

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

function BankDetailsModal({ existing, onClose, onSaved }) {
  const [accountTitle, setAccountTitle] = useState(existing?.accountTitle || "");
  const [bankName, setBankName] = useState(existing?.bankName || "");
  const [iban, setIban] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState(
    existing?.dateOfBirth ? String(existing.dateOfBirth).slice(0, 10) : ""
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await savePayoutDetails({ accountTitle, bankName, iban, dateOfBirth });
      toast.success("Bank details saved.");
      onSaved();
      onClose();
    } catch (e) {
      // The server validates the IBAN checksum, so its message is the useful
      // one — it says which part is wrong rather than just "invalid".
      toast.error(e?.response?.data?.message || e?.message || "Could not save your details");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-6 sm:pb-0 overflow-y-auto">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden my-6">
        <div className="bg-gradient-to-br from-townwize-primary to-townwize-primaryDark px-6 py-5 text-white">
          <h3 className="text-lg font-bold">Where should we send your earnings?</h3>
          <p className="text-xs text-white/70 mt-0.5">
            Card trips are paid into your bank account. Cash trips you keep at the kerb.
          </p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Account title
            </label>
            <input
              type="text"
              value={accountTitle}
              onChange={(e) => setAccountTitle(e.target.value)}
              placeholder="Exactly as your bank has it"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-townwize-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Bank name
            </label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Meezan Bank"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-townwize-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              IBAN
            </label>
            <input
              type="text"
              value={iban}
              onChange={(e) => setIban(e.target.value.toUpperCase())}
              placeholder="PK00XXXX0000000000000000"
              autoCapitalize="characters"
              spellCheck={false}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-townwize-primary"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {existing?.hasIban
                ? `Currently ${existing.ibanMasked}. Enter it again to change it.`
                : "24 characters, printed on your cheque book or in your banking app."}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Date of birth
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-townwize-primary"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              As printed on your CNIC. Your bank checks this before releasing a transfer.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-townwize-primary text-white font-semibold disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save bank details"}
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
  const [chartPeriod, setChartPeriod] = useState("weekly"); // "weekly" | "monthly"
  const [data, setData] = useState({
    today: 0, week: 0, month: 0,
    balance: 0, balanceStatus: "clear",
    hardBlockThreshold: -3000, softWarnThreshold: -1500,
    totalCommission: 0, breakdown: [],
    payoutCycle: null,
  });
  const [requests, setRequests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [bankDetails, setBankDetails] = useState(null);
  const [showBankModal, setShowBankModal] = useState(false);

  const load = useCallback(async (period = chartPeriod) => {
    setLoading(true);
    try {
      const [earnings, reqs, bank] = await Promise.all([
        fetchDriverEarnings(period),
        fetchPayoutRequests(),
        // Non-blocking: a Wizer who has never earned on card still sees their
        // cash commission screen if this call fails.
        fetchPayoutDetails().catch(() => null),
      ]);
      setBankDetails(bank);
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
        payoutCycle: earnings?.payoutCycle || null,
      });
      setRequests(Array.isArray(reqs) ? reqs : []);
    } catch {
      toast.error("Unable to load earnings right now.");
    } finally {
      setLoading(false);
    }
  }, [chartPeriod]);

  useEffect(() => { load(chartPeriod); }, [chartPeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasPending = requests.some((r) => r.status === "PENDING");
  const balanceOwed = data.balance < 0 ? Math.abs(data.balance) : 0;
  const isBlocked = data.balanceStatus === "blocked";
  const isWarning = data.balanceStatus === "warning";

  const handleSubmit = async (amount, note) => {
    await submitPayoutRequest(amount, note);
    toast.success("Payment submitted! Admin will confirm within 1–2 business days.");
    load(chartPeriod);
  };

  // Compute weekly-aggregated rows for monthly chart
  const weeklyRows = groupIntoWeeks(data.breakdown);
  const chartRows = chartPeriod === "monthly" ? weeklyRows : data.breakdown;

  return (
    <div className="max-w-3xl mx-auto mt-8 px-4 pb-12 space-y-6">
      {showModal && (
        <PaymentModal
          balanceOwed={balanceOwed}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
        />
      )}

      {showBankModal && (
        <BankDetailsModal
          existing={bankDetails}
          onClose={() => setShowBankModal(false)}
          onSaved={() => load(chartPeriod)}
        />
      )}

      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Earnings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Your income &amp; commission overview</p>
        </div>
        <button
          onClick={() => load(chartPeriod)}
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
                  {hasPending ? "Pending…" : "Submit Commission"}
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

          {/* Bank details missing while money is waiting. Shown ahead of the
              payout card because until this is fixed the payout will not
              happen at all — and a Wizer must learn that from the app, not
              from a payout day that passes in silence. */}
          {data.payoutCycle && data.payoutCycle.pendingTotal > 0 && !data.payoutCycle.readiness?.ready && (
            <div className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                We cannot send your {toMoney(data.payoutCycle.pendingTotal)} yet
              </p>
              <p className="mt-1 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                {data.payoutCycle.readinessMessage}
              </p>
              <button
                type="button"
                onClick={() => setShowBankModal(true)}
                className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition"
              >
                Add bank details
              </button>
            </div>
          )}

          {/* Card-ride payouts. Only rendered once there is something to pay —
              a Wizer running cash-only has no use for it and it would just add
              a permanently empty card to their screen. */}
          {data.payoutCycle && data.payoutCycle.pendingTotal > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                    Your next payout
                  </p>
                  <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {toMoney(data.payoutCycle.estimatedNet)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Arrives{" "}
                    <strong className="text-gray-700 dark:text-gray-200">
                      {new Date(data.payoutCycle.nextPayoutDate).toLocaleDateString(undefined, {
                        weekday: "long", day: "numeric", month: "short",
                      })}
                    </strong>
                  </p>
                </div>
              </div>

              <dl className="mt-4 space-y-1.5 border-t border-gray-100 dark:border-gray-800 pt-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Card trips earned</dt>
                  <dd className="font-medium text-gray-800 dark:text-gray-100">
                    {toMoney(data.payoutCycle.pendingTotal)}
                  </dd>
                </div>
                {data.payoutCycle.estimatedWithholding > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-amber-700 dark:text-amber-400">Commission withheld</dt>
                    <dd className="font-medium text-amber-700 dark:text-amber-400">
                      − {toMoney(data.payoutCycle.estimatedWithholding)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-1.5">
                  <dt className="font-semibold text-gray-700 dark:text-gray-200">You receive</dt>
                  <dd className="font-bold text-gray-900 dark:text-white">
                    {toMoney(data.payoutCycle.estimatedNet)}
                  </dd>
                </div>
              </dl>

              {data.payoutCycle.estimatedWithholding > 0 && (
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Commission you owe on cash trips is taken out of this payout, so you do not need to
                  transfer it separately.
                </p>
              )}

              {data.payoutCycle.lastPaidAt && (
                <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                  Last payout {toMoney(data.payoutCycle.lastPaidAmount || 0)} on{" "}
                  {new Date(data.payoutCycle.lastPaidAt).toLocaleDateString()}
                </p>
              )}

              {data.payoutCycle.readiness?.ready && bankDetails?.ibanMasked && (
                <button
                  type="button"
                  onClick={() => setShowBankModal(true)}
                  className="mt-3 text-xs text-townwize-primary hover:underline"
                >
                  Paying into {bankDetails.bankName} {bankDetails.ibanMasked} — change
                </button>
              )}
            </div>
          )}

          {/* Education card — shown when commission is clear */}
          {!balanceOwed && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl px-4 py-3.5">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-0.5">How cash commission works</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                You collect fares directly in cash. Townwize's commission is tracked here. When your balance reaches{" "}
                <strong>PKR 1,500</strong>, you'll get a warning. At <strong>PKR 3,000</strong>, you'll be temporarily
                blocked until you pay via EasyPaisa / JazzCash and submit proof below.
              </p>

              {/* WHERE to pay, shown even at a zero balance.
                  This paragraph says "pay via EasyPaisa / JazzCash" and used to
                  stop there, exactly like the dialog did. A Wizer should be
                  able to find out where the money goes BEFORE they are blocked
                  at PKR 3,000 — by then they cannot earn, and hunting for an
                  account number is the worst possible moment to discover it is
                  not written down anywhere. */}
              <div className="mt-3">
                <RemittanceDetails compact />
              </div>
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

          {/* Bar chart with period toggle */}
          <div className="bg-white dark:bg-townwize-primaryDark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Earnings Chart
              </h2>
              <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 text-xs font-semibold">
                <button
                  onClick={() => setChartPeriod("weekly")}
                  className={`px-3 py-1.5 transition ${
                    chartPeriod === "weekly"
                      ? "bg-townwize-primary text-white"
                      : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => setChartPeriod("monthly")}
                  className={`px-3 py-1.5 transition ${
                    chartPeriod === "monthly"
                      ? "bg-townwize-primary text-white"
                      : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  30 Days
                </button>
              </div>
            </div>

            {chartRows.length === 0 ? (
              <div className="text-sm text-gray-400 py-6 text-center">No data for this period.</div>
            ) : (
              <BarChart
                rows={chartRows}
                labelKey="date"
                valueKey="total"
                period={chartPeriod}
              />
            )}

            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center">
              {chartPeriod === "monthly"
                // "hover bars" told a phone user to do something impossible —
                // there is no hover on touch, and the tooltip it referred to
                // can never appear.
                ? "30-day net earnings, grouped by week"
                : "Last 7 days net earnings"}
            </p>
          </div>

          {/* Daily / Weekly breakdown table with commission columns */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              {chartPeriod === "monthly" ? "Weekly Breakdown (30 Days)" : "Daily Breakdown"}
            </h2>
            {data.breakdown.length === 0 ? (
              <div className="text-sm text-gray-400 py-6 text-center">No completed trips yet.</div>
            ) : (
              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <span className="col-span-1">Date</span>
                  <span className="text-center">Trips</span>
                  <span className="text-end">Gross</span>
                  <span className="text-end">Commission</span>
                  <span className="text-end">Net</span>
                </div>

                {/* Rows — use weekly aggregated for monthly view */}
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {(chartPeriod === "monthly" ? weeklyRows : data.breakdown).map((row, i) => {
                    const label = chartPeriod === "monthly"
                      ? row.label
                      : fmtShortDate(row.date);
                    const gross = Number(row.gross || 0);
                    const commission = Number(row.commission || 0);
                    const net = Number(row.total || 0);
                    return (
                      <div
                        key={i}
                        className="grid grid-cols-5 gap-2 px-4 py-3 bg-white dark:bg-townwize-primaryDark items-center text-sm"
                      >
                        <div className="col-span-1">
                          <p className="font-medium text-gray-900 dark:text-white leading-tight">{label}</p>
                          <p className="text-[10px] text-gray-400">{Number(row.trips || 0)} trip{row.trips !== 1 ? "s" : ""}</p>
                        </div>
                        <p className="text-center text-gray-700 dark:text-gray-300 font-medium">{Number(row.trips || 0)}</p>
                        <p className="text-end text-gray-700 dark:text-gray-300">{toMoney(gross)}</p>
                        <p className="text-end text-red-500 font-medium">-{toMoney(commission)}</p>
                        <p className="text-end font-semibold text-gray-900 dark:text-white">{toMoney(net)}</p>
                      </div>
                    );
                  })}
                </div>
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
                  + Submit Commission
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
