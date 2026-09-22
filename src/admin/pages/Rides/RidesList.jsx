import { useEffect, useMemo, useState } from "react";
import { fetchRideDetail, fetchRides, updateRideStatus } from "../../../api/adminApi";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";
import SidePanel from "../../components/panels/SidePanel";
import RideDetailPanel from "./RideDetailPanel";

function BulkCancelModal({ count, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handleConfirm = async () => {
    if (!reason.trim()) { setErr("Cancellation reason is required."); return; }
    setBusy(true);
    setErr("");
    try {
      await onConfirm(reason.trim());
    } catch (e) {
      setErr(e?.message || "Failed to cancel rides");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Cancel Rides</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          You are cancelling <strong>{count}</strong> ride(s). Provide a reason.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Reason for cancellation..."
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:border-townwize-primary focus:outline-none"
        />
        {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? "Cancelling..." : "Confirm Cancel"}
          </button>
          <button onClick={onCancel} disabled={busy} className="flex-1 rounded-lg border dark:border-gray-600 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

function exportRidesToCSV(rides) {
  const headers = ["Ride ID", "Status", "Passenger", "Driver", "Route", "Fare Estimate (PKR)", "Created"];
  const rows = rides.map((r) => [
    r.rideId || r._id,
    r.status || "",
    r.passengerEmail || "",
    r.driverEmail || "",
    (r.route || "").replace(/,/g, ";"),
    Number(r.fareEstimate || 0),
    r.createdAt ? new Date(r.createdAt).toLocaleString() : "",
  ]);
  const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rides_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RidesList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRide, setSelectedRide] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  // Bulk selection
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bulkError, setBulkError] = useState("");

  const allIds = useMemo(() => items.map((r) => r._id), [items]);
  const allChecked = allIds.length > 0 && allIds.every((id) => checkedIds.has(id));
  const someChecked = checkedIds.size > 0;

  const toggleAll = () => {
    if (allChecked) setCheckedIds(new Set());
    else setCheckedIds(new Set(allIds));
  };

  const toggleOne = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          q: query,
          status,
          page: String(page),
          limit: "20",
        });
        const json = await fetchRides(Object.fromEntries(params.entries()));
        if (!mounted) return;
        setItems(json?.data?.items || []);
        setMeta({
          page: json?.data?.page || 1,
          totalPages: json?.data?.totalPages || 1,
          total: json?.data?.total || 0,
        });
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load rides");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [query, status, page]);

  useEffect(() => {
    if (!selectedId) { setSelectedRide(null); return; }
    let mounted = true;
    const load = async () => {
      setLoadingDetail(true);
      try {
        const json = await fetchRideDetail(selectedId);
        if (!mounted) return;
        setSelectedRide(json?.data || null);
      } catch {
        if (!mounted) return;
        setSelectedRide(null);
      } finally {
        if (mounted) setLoadingDetail(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [selectedId]);

  const refreshList = async () => {
    try {
      const json = await fetchRides({ q: query, status, page: String(page), limit: "20" });
      setItems(json?.data?.items || []);
      setMeta({
        page: json?.data?.page || 1,
        totalPages: json?.data?.totalPages || 1,
        total: json?.data?.total || 0,
      });
    } catch { /* no-op */ }
  };

  const refreshListAndDetail = async () => {
    if (selectedId) {
      try {
        const json = await fetchRideDetail(selectedId);
        setSelectedRide(json?.data || null);
      } catch { setSelectedRide(null); }
    }
    await refreshList();
  };

  const handleBulkCancel = async (reason) => {
    setBulkError("");
    await Promise.all([...checkedIds].map((id) => updateRideStatus(id, "CANCELLED", reason)));
    setCheckedIds(new Set());
    setShowCancelModal(false);
    await refreshList();
  };

  const handleExportCSV = () => {
    const selected = items.filter((r) => checkedIds.has(r._id));
    exportRidesToCSV(selected);
  };

  const COLCOUNT = 8;

  return (
    <div className="space-y-4">
      {showCancelModal && (
        <BulkCancelModal
          count={checkedIds.size}
          onConfirm={handleBulkCancel}
          onCancel={() => setShowCancelModal(false)}
        />
      )}

      <h1 className="dark:text-white text-xl font-semibold">Rides</h1>
      <div className="bg-white dark:bg-townwize-primary rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            className="w-full md:w-80 border rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
            placeholder="Search rides"
            value={query}
            onChange={(e) => { setPage(1); setQuery(e.target.value); }}
          />
          <select
            className="border rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
            value={status}
            onChange={(e) => { setPage(1); setStatus(e.target.value); }}
          >
            <option value="all">All Statuses</option>
            <option value="REQUESTED">Requested</option>
            <option value="DRIVER_ASSIGNED">Driver Assigned</option>
            <option value="ARRIVED">Arrived</option>
            <option value="ON_TRIP">On Trip</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">Loading rides...</div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <EmptyState title="No rides found" description="No records match your search." />
          </div>
        ) : (
          items.map((r) => (
            <div key={r._id} className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 cursor-pointer accent-townwize-primary"
                  checked={checkedIds.has(r._id)}
                  onChange={() => toggleOne(r._id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
                  className="flex-1 text-start"
                  onClick={() => setSelectedId(r._id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500">Ride ID</div>
                      <div className="text-sm font-medium break-all">{r.rideId || r._id}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={r.status || "-"} />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">Passenger</div>
                      <div className="break-words">{r.passengerEmail || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Driver</div>
                      <div className="break-words">{r.driverEmail || "Unassigned"}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-gray-500">Route</div>
                      <div className="break-words">{r.route || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Estimate</div>
                      <div>{Number(r.fareEstimate || 0).toLocaleString()} PKR</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Created</div>
                      <div>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto bg-white dark:bg-townwize-primary rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full table-fixed text-sm min-w-[1140px]">
          <thead className="bg-gray-50 dark:bg-townwize-primaryDark sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer accent-townwize-primary"
                  checked={allChecked}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3 text-start w-[15%]">Ride ID</th>
              <th className="px-4 py-3 text-start w-[10%]">Status</th>
              <th className="px-4 py-3 text-start w-[14%]">Passenger</th>
              <th className="px-4 py-3 text-start w-[14%]">Driver</th>
              <th className="px-4 py-3 text-start w-[25%]">Route</th>
              <th className="px-4 py-3 text-start w-[9%]">Estimate</th>
              <th className="px-4 py-3 text-start w-[10%]">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-10 text-center text-gray-500" colSpan={COLCOUNT}>Loading rides...</td>
              </tr>
            ) : error ? (
              <tr>
                <td className="px-4 py-10 text-center text-red-600" colSpan={COLCOUNT}>{error}</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={COLCOUNT} className="p-8">
                  <EmptyState title="No rides found" description="No records match your search." />
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr
                  key={r._id}
                  className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer accent-townwize-primary"
                      checked={checkedIds.has(r._id)}
                      onChange={() => toggleOne(r._id)}
                    />
                  </td>
                  <td className="px-4 py-3 break-all cursor-pointer" onClick={() => setSelectedId(r._id)}>{r.rideId || r._id}</td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setSelectedId(r._id)}>
                    <StatusBadge status={r.status || "-"} />
                  </td>
                  <td className="px-4 py-3 break-words cursor-pointer" onClick={() => setSelectedId(r._id)}>{r.passengerEmail || "-"}</td>
                  <td className="px-4 py-3 break-words cursor-pointer" onClick={() => setSelectedId(r._id)}>{r.driverEmail || "Unassigned"}</td>
                  <td className="px-4 py-3 whitespace-normal break-words cursor-pointer" onClick={() => setSelectedId(r._id)}>{r.route || "-"}</td>
                  <td className="px-4 py-3 break-words cursor-pointer" onClick={() => setSelectedId(r._id)}>{Number(r.fareEstimate || 0).toLocaleString()} PKR</td>
                  <td className="px-4 py-3 break-words cursor-pointer" onClick={() => setSelectedId(r._id)}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Total: {meta.total}</span>
        <Pagination page={page} totalPages={meta.totalPages} onPage={setPage} />
      </div>

      {/* Bulk action bar */}
      {someChecked && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl bg-townwize-primary text-white px-5 py-3 shadow-2xl">
          <span className="text-sm font-medium">{checkedIds.size} selected</span>
          <div className="h-4 w-px bg-white/30" />
          <button
            onClick={handleExportCSV}
            className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-sm font-semibold transition"
          >
            Export CSV
          </button>
          <button
            onClick={() => { setBulkError(""); setShowCancelModal(true); }}
            className="rounded-lg bg-red-500 hover:bg-red-600 px-3 py-1.5 text-sm font-semibold transition"
          >
            Cancel Rides
          </button>
          <button
            onClick={() => setCheckedIds(new Set())}
            className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-sm font-semibold transition"
          >
            Deselect
          </button>
          {bulkError && <span className="text-xs text-red-300">{bulkError}</span>}
        </div>
      )}

      <SidePanel open={!!selectedId} onClose={() => setSelectedId(null)} title={`Ride ${selectedId || ""}`}>
        {loadingDetail ? (
          <div className="py-6 text-sm text-gray-500">Loading ride details...</div>
        ) : selectedRide ? (
          <RideDetailPanel ride={selectedRide} onUpdated={refreshListAndDetail} />
        ) : (
          <EmptyState title="Ride not found" description="This ride may have been removed." />
        )}
      </SidePanel>
    </div>
  );
}
