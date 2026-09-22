import { useEffect, useMemo, useState } from "react";
import EmptyState from "../../components/common/EmptyState";
import { fetchAuditLogDetail, fetchAuditLogs } from "../../../api/adminApi";

function prettyEvent(v) {
  if (!v) return "-";
  return String(v)
    .toLowerCase()
    .split("_")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

export default function AuditLogs() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [availableModules, setAvailableModules] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const selectedIndex = useMemo(() => items.findIndex((x) => String(x._id) === String(selectedId)), [items, selectedId]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const json = await fetchAuditLogs({
          q: query,
          module: moduleFilter,
          event: eventFilter,
          from: fromDate,
          to: toDate,
          page: String(page),
          limit: "50",
        });
        if (!mounted) return;
        setItems(json?.data?.items || []);
        setMeta({
          page: json?.data?.page || 1,
          totalPages: json?.data?.totalPages || 1,
          total: json?.data?.total || 0,
        });
        setAvailableModules(json?.data?.filters?.modules || []);
        setAvailableEvents(json?.data?.filters?.events || []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load audit logs");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [query, moduleFilter, eventFilter, fromDate, toDate, page]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedItem(null);
      return;
    }
    let mounted = true;
    const run = async () => {
      setDetailLoading(true);
      try {
        const json = await fetchAuditLogDetail(selectedId);
        if (!mounted) return;
        setSelectedItem(json?.data?.item || null);
      } catch {
        if (!mounted) return;
        setSelectedItem(null);
      } finally {
        if (mounted) setDetailLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [selectedId]);

  const applyTextFilter = (setter) => (e) => {
    setPage(1);
    setter(e.target.value);
  };

  return (
    <div className="space-y-4">
      <h1 className="dark:text-white text-xl font-semibold">Audit Logs</h1>

      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-gray-800 dark:text-white dark:border-gray-600">{error}</div> : null}

      <div className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 p-4 dark:border-gray-700 dark:bg-townwize-primary">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <input
            value={query}
            onChange={applyTextFilter(setQuery)}
            placeholder="Search event/entity/actor"
            className="rounded-md border px-3 py-2 text-sm md:col-span-2 dark:bg-gray-800 dark:text-white dark:border-gray-600"
          />
          <select value={moduleFilter} onChange={applyTextFilter(setModuleFilter)} className="rounded-md border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600">
            <option value="all">All Modules</option>
            {availableModules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select value={eventFilter} onChange={applyTextFilter(setEventFilter)} className="rounded-md border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600">
            <option value="all">All Events</option>
            {availableEvents.map((e) => (
              <option key={e} value={e}>
                {prettyEvent(e)}
              </option>
            ))}
          </select>
          <input type="date" value={fromDate} onChange={applyTextFilter(setFromDate)} className="rounded-md border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600" />
          <input type="date" value={toDate} onChange={applyTextFilter(setToDate)} className="rounded-md border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 overflow-x-auto rounded-xl border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 dark:bg-townwize-primary">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 dark:bg-townwize-primaryDark">
              <tr>
                <th className="px-4 py-3 text-start">Timestamp</th>
                <th className="px-4 py-3 text-start">Module</th>
                <th className="px-4 py-3 text-start">Entity</th>
                <th className="px-4 py-3 text-start">Event</th>
                <th className="px-4 py-3 text-start">Actor</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                    Loading audit logs...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8">
                    <EmptyState title="No audit logs found" description="No records match your filters." />
                  </td>
                </tr>
              ) : (
                items.map((row, idx) => {
                  const active = String(selectedId) === String(row._id);
                  return (
                    <tr
                      key={row._id || idx}
                      className={`cursor-pointer border-t border-gray-100 dark:border-gray-700 ${active ? "bg-green-50/50" : ""}`}
                      onClick={() => setSelectedId(row._id)}
                    >
                      <td className="px-4 py-3">{row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}</td>
                      <td className="px-4 py-3">{row.module || "-"}</td>
                      <td className="px-4 py-3">
                        {row.entityType || "-"}
                        {row.entityId ? <div className="text-xs text-gray-500 dark:text-gray-400">{row.entityId}</div> : null}
                      </td>
                      <td className="px-4 py-3">{prettyEvent(row.event)}</td>
                      <td className="px-4 py-3">{row.actorEmail || "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 p-4 dark:border-gray-700 dark:bg-townwize-primary">
          <h2 className="dark:text-white text-sm font-semibold">Audit Detail</h2>
          {!selectedId ? (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Select a row to inspect details.</p>
          ) : detailLoading ? (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading detail...</p>
          ) : !selectedItem ? (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Detail not available.</p>
          ) : (
            <div className="mt-3 space-y-2 text-sm">
              <div><span className="font-semibold">Time:</span> {selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleString() : "-"}</div>
              <div><span className="font-semibold">Module:</span> {selectedItem.module || "-"}</div>
              <div><span className="font-semibold">Event:</span> {prettyEvent(selectedItem.event)}</div>
              <div><span className="font-semibold">Entity:</span> {selectedItem.entityType || "-"} {selectedItem.entityId ? `(${selectedItem.entityId})` : ""}</div>
              <div><span className="font-semibold">Actor:</span> {selectedItem.actorEmail || "-"}</div>
              <div className="pt-2">
                <div className="mb-1 font-semibold">Payload</div>
                <pre className="max-h-[360px] overflow-auto rounded border bg-gray-50 dark:bg-gray-800 p-2 text-xs leading-5">{JSON.stringify(selectedItem.payload || {}, null, 2)}</pre>
              </div>
              {selectedIndex >= 0 ? <div className="text-xs text-gray-500 dark:text-gray-400">Row position on current page: {selectedIndex + 1}</div> : null}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span>Total: {meta.total}</span>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </button>
          <span>
            Page {meta.page} / {meta.totalPages}
          </span>
          <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
