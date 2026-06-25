import { useEffect, useState } from "react";
import { fetchRideDetail, fetchRides } from "../../../api/adminApi";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";
import SidePanel from "../../components/panels/SidePanel";
import RideDetailPanel from "./RideDetailPanel";

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
    return () => {
      mounted = false;
    };
  }, [query, status, page]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedRide(null);
      return;
    }
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
    return () => {
      mounted = false;
    };
  }, [selectedId]);

  const refreshListAndDetail = async () => {
    if (!selectedId) return;
    try {
      const json = await fetchRideDetail(selectedId);
      setSelectedRide(json?.data || null);
    } catch {
      setSelectedRide(null);
    }
    try {
      const json = await fetchRides({ q: query, status, page: String(page), limit: "20" });
      setItems(json?.data?.items || []);
      setMeta({
        page: json?.data?.page || 1,
        totalPages: json?.data?.totalPages || 1,
        total: json?.data?.total || 0,
      });
    } catch {
      // no-op
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="dark:text-white text-xl font-semibold">Rides</h1>
      <div className="bg-white dark:bg-townwize-primary rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            className="w-full md:w-80 border rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
            placeholder="Search rides"
            value={query}
            onChange={(e) => {
              setPage(1);
              setQuery(e.target.value);
            }}
          />
          <select
            className="border rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
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
            <button
              key={r._id}
              type="button"
              className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left"
              onClick={() => setSelectedId(r._id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">Ride ID</div>
                  <div className="text-sm font-medium break-all">{r.rideId || r._id}</div>
                </div>
                <StatusBadge status={r.status || "-"} />
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
          ))
        )}
      </div>

      <div className="hidden md:block overflow-x-auto bg-white dark:bg-townwize-primary rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full table-fixed text-sm min-w-[1100px]">
          <thead className="bg-gray-50 dark:bg-townwize-primaryDark sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left w-[16%]">Ride ID</th>
              <th className="px-4 py-3 text-left w-[10%]">Status</th>
              <th className="px-4 py-3 text-left w-[14%]">Passenger</th>
              <th className="px-4 py-3 text-left w-[14%]">Driver</th>
              <th className="px-4 py-3 text-left w-[26%]">Route</th>
              <th className="px-4 py-3 text-left w-[10%]">Estimate</th>
              <th className="px-4 py-3 text-left w-[10%]">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-10 text-center text-gray-500" colSpan={7}>
                  Loading rides...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="px-4 py-10 text-center text-red-600" colSpan={7}>
                  {error}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8">
                  <EmptyState title="No rides found" description="No records match your search." />
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr
                  key={r._id}
                  className="cursor-pointer border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => setSelectedId(r._id)}
                >
                  <td className="px-4 py-3 break-all">{r.rideId || r._id}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status || "-"} />
                  </td>
                  <td className="px-4 py-3 break-words">{r.passengerEmail || "-"}</td>
                  <td className="px-4 py-3 break-words">{r.driverEmail || "Unassigned"}</td>
                  <td className="px-4 py-3 max-w-[520px] whitespace-normal break-words">{r.route || "-"}</td>
                  <td className="px-4 py-3 break-words">{Number(r.fareEstimate || 0).toLocaleString()} PKR</td>
                  <td className="px-4 py-3 break-words">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span>Total: {meta.total}</span>
        <Pagination page={page} totalPages={meta.totalPages} onPage={setPage} />
      </div>

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
