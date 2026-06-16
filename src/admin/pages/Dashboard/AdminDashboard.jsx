import { useEffect, useState, useCallback } from "react";
import { fetchCases, fetchFinanceSummary, fetchRides, fetchSupportTickets, fetchPriorityAlerts, unblockDriver } from "../../../api/adminApi";

const SEVERITY_META = {
  critical: { bg: "bg-red-50 border-red-300",   badge: "bg-red-100 text-red-700",   dot: "bg-red-500",    label: "Critical" },
  warning:  { bg: "bg-amber-50 border-amber-300", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500", label: "Warning"  },
};

const TYPE_LABEL = {
  SUSPENDED:       "Driver Suspended",
  HIGH_CANCEL_RATE: "High Cancellation Rate",
  ON_TRIP_CANCEL:  "ON_TRIP Cancellation",
};

const fmtTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

export default function AdminDashboard() {
  const [data, setData] = useState({
    activeRides: 0, ridesToday: 0, openCases: 0, openTickets: 0,
    grossRevenue: 0, commission: 0, completedTrips: 0, cancelledTrips: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [unblocking, setUnblocking] = useState(null);

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
          activeRides: rides.filter((r) => ["REQUESTED","DRIVER_ASSIGNED","EN_ROUTE","ARRIVED","ON_TRIP"].includes(r.status)).length,
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
    return () => { mounted = false; };
  }, []);

  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const res = await fetchPriorityAlerts();
      setAlerts(res?.data || []);
    } catch {
      // silently fail — alerts are supplemental
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const handleUnblock = async (driverId) => {
    setUnblocking(driverId);
    try {
      await unblockDriver(driverId);
      await loadAlerts();
    } catch {
      // noop
    } finally {
      setUnblocking(null);
    }
  };

  const money = (n) => `${Number(n || 0).toLocaleString()} PKR`;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      {/* ── Priority Alerts ─────────────────────────────────────────────── */}
      {(alertsLoading || alerts.length > 0) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-red-600">
              Priority Alerts — Action Required
            </h2>
            {!alertsLoading && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                {alerts.length}
              </span>
            )}
            <button
              onClick={loadAlerts}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Refresh
            </button>
          </div>

          {alertsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert, i) => {
                const meta = SEVERITY_META[alert.severity] || SEVERITY_META.warning;
                return (
                  <div key={i} className={`flex items-start gap-3 rounded-xl border p-4 ${meta.bg}`}>
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${meta.badge}`}>
                          {TYPE_LABEL[alert.type] || alert.type}
                        </span>
                        <span className="text-xs font-semibold text-gray-800">{alert.driverName}</span>
                        {alert.driverEmail && (
                          <span className="text-xs text-gray-500">{alert.driverEmail}</span>
                        )}
                        {alert.occurredAt && (
                          <span className="ml-auto text-xs text-gray-400">{fmtTime(alert.occurredAt)}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                      {alert.detail && <p className="text-xs text-gray-500 mt-0.5">{alert.detail}</p>}
                      {alert.rideId && (
                        <p className="text-xs text-gray-400 mt-0.5">Ride ID: {alert.rideId}</p>
                      )}
                    </div>
                    {alert.type === "SUSPENDED" && alert.driverId && (
                      <button
                        onClick={() => handleUnblock(alert.driverId)}
                        disabled={unblocking === alert.driverId}
                        className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {unblocking === alert.driverId ? "Reinstating…" : "Reinstate Driver"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* ──────────────────────────────────────────────────────────────────── */}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPI label="Active Rides"    value={data.activeRides}    loading={loading} />
        <KPI label="Rides Today"     value={data.ridesToday}     loading={loading} />
        <KPI label="Open Cases"      value={data.openCases}      loading={loading} />
        <KPI label="Open Tickets"    value={data.openTickets}    loading={loading} />
        <KPI label="Gross Revenue"   value={money(data.grossRevenue)}  loading={loading} />
        <KPI label="Commission"      value={money(data.commission)}    loading={loading} />
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
