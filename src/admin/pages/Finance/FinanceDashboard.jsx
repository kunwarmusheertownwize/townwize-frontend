import { useEffect, useState } from "react";
import { fetchFinanceSummary } from "../../../api/adminApi";

export default function FinanceDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const json = await fetchFinanceSummary();
        if (!mounted) return;
        setSummary(json?.data?.summary || {});
      } catch (e) {
        if (!mounted) return;
        setError(e.message || "Failed to load finance summary");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => (mounted = false);
  }, []);

  const money = (n) => `${Number(n || 0).toLocaleString()} PKR`;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold dark:text-white">Finance</h1>

      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-gray-800 dark:text-white dark:border-gray-600">{error}</div> : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPI label="Gross Revenue" value={loading ? "..." : money(summary?.grossRevenue)} />
        <KPI label="Tax Collected" value={loading ? "..." : money(summary?.taxCollected)} />
        <KPI label="Platform Fees" value={loading ? "..." : money(summary?.platformFees)} />
        <KPI label="Townwize Commission" value={loading ? "..." : money(summary?.commissionRevenue ?? summary?.commission)} />
        <KPI label="Townwize Revenue" value={loading ? "..." : money(summary?.townwizeRevenue ?? summary?.netRevenue)} />
        <KPI label="Driver Earnings" value={loading ? "..." : money(summary?.driverEarnings)} />
        <KPI label="Unpaid Driver Earnings" value={loading ? "..." : money(summary?.unpaidDriverEarnings)} />
        <KPI label="Completed Trips" value={loading ? "..." : Number(summary?.completedTrips || 0).toLocaleString()} />
        <KPI label="Cancelled Trips" value={loading ? "..." : Number(summary?.cancelledTrips || 0).toLocaleString()} />
        <KPI label="Pending Payouts" value={loading ? "..." : money(summary?.pendingPayouts)} />
        <KPI label="Completed Payouts" value={loading ? "..." : money(summary?.completedPayouts)} />
      </div>

      <div className="rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 p-6 text-sm text-gray-600 dark:text-gray-400">
        Use Transactions and Payouts sections for detailed financial records.
      </div>
    </div>
  );
}

function KPI({ label, value }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 p-4">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-lg font-bold dark:text-white">{value}</div>
    </div>
  );
}
