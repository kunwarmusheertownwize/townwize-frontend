import { useEffect, useState, useCallback } from "react";
import { fetchCases, fetchFinanceSummary, fetchRides, fetchSupportTickets, fetchPriorityAlerts, unblockDriver } from "../../../api/adminApi";

const SEVERITY_META = {
  critical: { bg: "bg-red-50 border-red-300",    badge: "bg-red-100 text-red-700",    dot: "bg-red-500",    label: "Critical" },
  warning:  { bg: "bg-amber-50 border-amber-300", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500", label: "Warning"  },
};

const TYPE_LABEL = {
  SUSPENDED:        "Driver Suspended",
  HIGH_CANCEL_RATE: "High Cancellation Rate",
  ON_TRIP_CANCEL:   "ON_TRIP Cancellation",
};

const fmtTime = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

const money = (n) => `${Number(n || 0).toLocaleString()} PKR`;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ACTIVE_STATUSES = new Set(["REQUESTED", "DRIVER_ASSIGNED", "EN_ROUTE", "ARRIVED", "ON_TRIP"]);

function buildDailyChart(rides) {
  const today = new Date();
  const slots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return { label: DAYS[d.getDay()], date: d.toISOString().slice(0, 10), completed: 0, cancelled: 0 };
  });
  const keyMap = new Map(slots.map((s) => [s.date, s]));
  rides.forEach((r) => {
    if (!r.createdAt) return;
    const key = new Date(r.createdAt).toISOString().slice(0, 10);
    const slot = keyMap.get(key);
    if (!slot) return;
    if (r.status === "COMPLETED")  slot.completed++;
    if (r.status === "CANCELLED")  slot.cancelled++;
  });
  return slots;
}

function RidesChart({ slots, loading }) {
  const max = Math.max(...slots.map((s) => s.completed + s.cancelled), 1);
  if (loading) {
    return (
      <div className="flex items-end gap-2 h-28 animate-pulse">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-t-sm bg-gray-100 dark:bg-gray-700" style={{ height: `${25 + (i * 11) % 70}%` }} />
        ))}
      </div>
    );
  }
  return (
    <div className="flex items-end gap-1.5 h-28">
      {slots.map((s, i) => {
        const total = s.completed + s.cancelled;
        const totalPct = Math.max(4, Math.round((total / max) * 100));
        const cancelPct = total ? Math.round((s.cancelled / total) * 100) : 0;
        const isToday = i === 6;
        return (
          <div key={s.date} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full rounded-t-sm overflow-hidden flex flex-col-reverse" style={{ height: `${totalPct}%` }}
              title={`${s.label}: ${s.completed} completed, ${s.cancelled} cancelled`}>
              <div className="w-full" style={{ flex: s.completed || 1, background: isToday ? "#17BEBB" : "#6ee7b7" }} />
              {s.cancelled > 0 && <div className="w-full" style={{ flex: s.cancelled, background: isToday ? "#f87171" : "#fca5a5" }} />}
            </div>
            <span className={`text-[9px] font-semibold ${isToday ? "text-townwize-primary dark:text-townwize-accent" : "text-gray-400"}`}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CompletionRing({ completed, cancelled, loading }) {
  const total = completed + cancelled;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      {loading ? (
        <div className="h-16 w-16 rounded-full border-4 border-gray-100 animate-pulse" />
      ) : (
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#f3f4f6" strokeWidth="6" />
          <circle
            cx="32" cy="32" r={r} fill="none"
            stroke="#17BEBB" strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
          />
          <text x="32" y="36" textAnchor="middle" fontSize="12" fontWeight="700" fill="#023645">{pct}%</text>
        </svg>
      )}
      <p className="text-xs text-gray-500 text-center">Completion<br/>rate</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState({
    activeRides: 0, ridesToday: 0, openCases: 0, openTickets: 0,
    grossRevenue: 0, commission: 0, completedTrips: 0, cancelledTrips: 0,
  });
  const [slots, setSlots] = useState(Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { label: DAYS[d.getDay()], date: "", completed: 0, cancelled: 0 };
  }));
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
          fetchRides({ status: "all", page: "1", limit: "500" }),
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
          activeRides: rides.filter((r) => ACTIVE_STATUSES.has(r.status)).length,
          ridesToday: rides.filter((r) => r.createdAt && isToday(r.createdAt)).length,
          openCases: Number(casesRes?.data?.total || 0),
          openTickets: Number(ticketsRes?.data?.total || (ticketsRes?.data?.items || []).length || 0),
          grossRevenue: Number(financeRes?.data?.summary?.grossRevenue || 0),
          commission: Number(financeRes?.data?.summary?.commission || 0),
          completedTrips: Number(financeRes?.data?.summary?.completedTrips || 0),
          cancelledTrips: Number(financeRes?.data?.summary?.cancelledTrips || 0),
        });
        setSlots(buildDailyChart(rides));
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
      // silently fail
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      {/* ── Priority Alerts ─────────────────────────────────────────────── */}
      {(alertsLoading || alerts.length > 0) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-red-600">Priority Alerts — Action Required</h2>
            {!alertsLoading && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{alerts.length}</span>
            )}
            <button onClick={loadAlerts} className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline">Refresh</button>
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
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${meta.badge}`}>{TYPE_LABEL[alert.type] || alert.type}</span>
                        <span className="text-xs font-semibold text-gray-800">{alert.driverName}</span>
                        {alert.driverEmail && <span className="text-xs text-gray-500">{alert.driverEmail}</span>}
                        {alert.occurredAt && <span className="ml-auto text-xs text-gray-400">{fmtTime(alert.occurredAt)}</span>}
                      </div>
                      <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                      {alert.detail && <p className="text-xs text-gray-500 mt-0.5">{alert.detail}</p>}
                      {alert.rideId && <p className="text-xs text-gray-400 mt-0.5">Ride ID: {alert.rideId}</p>}
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

      {/* ── KPI grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI label="Active Rides"    value={data.activeRides}            loading={loading} accent />
        <KPI label="Rides Today"     value={data.ridesToday}             loading={loading} />
        <KPI label="Open Cases"      value={data.openCases}              loading={loading} warn={data.openCases > 5} />
        <KPI label="Open Tickets"    value={data.openTickets}            loading={loading} warn={data.openTickets > 10} />
        <KPI label="Gross Revenue"   value={money(data.grossRevenue)}    loading={loading} />
        <KPI label="Commission"      value={money(data.commission)}      loading={loading} />
        <KPI label="Completed Trips" value={data.completedTrips}         loading={loading} />
        <KPI label="Cancelled Trips" value={data.cancelledTrips}         loading={loading} warn={data.cancelledTrips > data.completedTrips * 0.2} />
      </div>

      {/* ── 7-day chart + completion rate ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-xl border bg-white dark:bg-townwize-primaryDark dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Rides — Last 7 days</h3>
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-teal-300 inline-block" /> Completed</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-red-300 inline-block" /> Cancelled</span>
            </div>
          </div>
          <RidesChart slots={slots} loading={loading} />
        </div>

        <div className="rounded-xl border bg-white dark:bg-townwize-primaryDark dark:border-gray-700 p-4 flex flex-col items-center justify-center gap-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 self-start">Completion</h3>
          <CompletionRing completed={data.completedTrips} cancelled={data.cancelledTrips} loading={loading} />
          <div className="text-center text-xs text-gray-400">
            <span className="font-semibold text-green-600 dark:text-green-400">{data.completedTrips}</span> completed ·{" "}
            <span className="font-semibold text-red-500">{data.cancelledTrips}</span> cancelled
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, loading, accent, warn }) {
  return (
    <div className={`rounded-xl border bg-white dark:bg-townwize-primaryDark p-4 ${warn ? "border-amber-200 dark:border-amber-700" : "dark:border-gray-700"}`}>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      {loading ? (
        <div className="mt-1 h-6 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      ) : (
        <div className={`text-lg font-bold mt-0.5 ${accent ? "text-townwize-accent" : warn ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-white"}`}>
          {value}
        </div>
      )}
    </div>
  );
}
