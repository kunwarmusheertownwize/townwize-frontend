import { useEffect, useState } from "react";
import { fetchCases, fetchFinanceSummary, fetchRides, fetchSupportTickets } from "../../../api/adminApi";

export default function AdminDashboard() {
  const [data, setData] = useState({
    activeRides: 0,
    ridesToday: 0,
    openCases: 0,
    openTickets: 0,
    grossRevenue: 0,
    commission: 0,
    completedTrips: 0,
    cancelledTrips: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const [ridesRes, casesRes, ticketsRes, financeRes] = await Promise.all([
          fetchRides({ status: "all", page: "1", limit: "200" }),
          fetchCases({ status: "open", page: "1", limit: "200" }),
          fetchSupportTickets({ status: "open", limit: "200" }),
          fetchFinanceSummary(),
        ]);

        if (!mounted) return;
        const rides = ridesRes?.data?.items || [];
        const now = new Date();
        const isToday = (d) => {
          const t = new Date(d);
          return t.getFullYear() === now.getFullYear() && t.getMonth() === now.getMonth() && t.getDate() === now.getDate();
        };

        setData({
          activeRides: rides.filter((r) => ["REQUESTED", "DRIVER_ASSIGNED", "EN_ROUTE", "ARRIVED", "ON_TRIP"].includes(r.status)).length,
          ridesToday: rides.filter((r) => r.createdAt && isToday(r.createdAt)).length,
          openCases: Number(casesRes?.data?.total || 0),
          openTickets: Number(ticketsRes?.data?.total || (ticketsRes?.data?.items || []).length || 0),
          grossRevenue: Number(financeRes?.data?.summary?.grossRevenue || 0),
          commission: Number(financeRes?.data?.summary?.commission || 0),
          completedTrips: Number(financeRes?.data?.summary?.completedTrips || 0),
          cancelledTrips: Number(financeRes?.data?.summary?.cancelledTrips || 0),
        });
      } catch (e) {
        if (!mounted) return;
        setError(e.message || "Failed to load dashboard");
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
      <h1 className="text-xl font-semibold">Dashboard</h1>
      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPI label="Active Rides" value={data.activeRides} loading={loading} />
        <KPI label="Rides Today" value={data.ridesToday} loading={loading} />
        <KPI label="Open Cases" value={data.openCases} loading={loading} />
        <KPI label="Open Tickets" value={data.openTickets} loading={loading} />
        <KPI label="Gross Revenue" value={money(data.grossRevenue)} loading={loading} />
        <KPI label="Commission" value={money(data.commission)} loading={loading} />
        <KPI label="Completed Trips" value={data.completedTrips} loading={loading} />
        <KPI label="Cancelled Trips" value={data.cancelledTrips} loading={loading} />
      </div>
    </div>
  );
}

function KPI({ label, value, loading }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      {loading ? (
        <div className="mt-1 h-6 w-16 animate-pulse rounded bg-gray-200" />
      ) : (
        <div className="text-lg font-bold">{value}</div>
      )}
    </div>
  );
}

