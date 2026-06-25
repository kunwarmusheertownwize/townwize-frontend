import { useEffect, useState } from "react";
import { fetchCaseDetail, fetchCases } from "../../../api/adminApi";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import SidePanel from "../../components/panels/SidePanel";
import CaseDetailPanel from "./CaseDetailPanel";

export default function CasesList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [entityType, setEntityType] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const json = await fetchCases({ q: query, status, entityType, page: String(page), limit: "20" });
        if (!mounted) return;
        setItems(json?.data?.items || []);
        setMeta({
          page: json?.data?.page || 1,
          totalPages: json?.data?.totalPages || 1,
          total: json?.data?.total || 0,
          limit: json?.data?.limit || 20,
        });
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load cases");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [query, status, entityType, page]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    let mounted = true;
    const run = async () => {
      setLoadingDetail(true);
      try {
        const json = await fetchCaseDetail(selectedId);
        if (!mounted) return;
        setSelected(json?.data || null);
      } catch {
        if (!mounted) return;
        setSelected(null);
      } finally {
        if (mounted) setLoadingDetail(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [selectedId]);

  const reload = async () => {
    try {
      const json = await fetchCases({ q: query, status, entityType, page: String(page), limit: "20" });
      setItems(json?.data?.items || []);
      setMeta({
        page: json?.data?.page || 1,
        totalPages: json?.data?.totalPages || 1,
        total: json?.data?.total || 0,
        limit: json?.data?.limit || 20,
      });
      if (selectedId) {
        const detail = await fetchCaseDetail(selectedId);
        setSelected(detail?.data || null);
      }
    } catch {
      // no-op
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="dark:text-white text-xl font-semibold">Verification Cases</h1>
      <div className="bg-white dark:bg-townwize-primary rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={query}
            onChange={(e) => {
              setPage(1);
              setQuery(e.target.value);
            }}
            placeholder="Search case id or applicant"
            className="w-full md:w-96 border rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
          />
          <select
            value={entityType}
            onChange={(e) => {
              setPage(1);
              setEntityType(e.target.value);
            }}
            className="border rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
          >
            <option value="all">All Entities</option>
            <option value="passenger">Passenger</option>
            <option value="driver">Driver</option>
          </select>
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="border rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="escalated">Escalated</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">Loading cases...</div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <EmptyState title="No cases found" description="No records match your search." />
          </div>
        ) : (
          items.map((row, idx) => (
            <button
              key={row._id || row.id || idx}
              type="button"
              className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left"
              onClick={() => setSelectedId(row.caseId || row._id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">Case ID</div>
                  <div className="text-sm font-medium break-all">{row.caseId || row._id || "-"}</div>
                </div>
                <StatusBadge status={row.status || row.caseStatus || "-"} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500">Entity</div>
                  <div className="break-words">{row.entityType || row.entity || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Name</div>
                  <div className="break-words">{row.name || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Phone</div>
                  <div className="break-words">{row.phone || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Priority</div>
                  <div>{row.priority || "-"}</div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="hidden md:block overflow-x-auto bg-white dark:bg-townwize-primary rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full table-fixed text-sm min-w-[980px]">
          <thead className="bg-gray-50 dark:bg-townwize-primaryDark sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left w-[16%]">Case ID</th>
              <th className="px-4 py-3 text-left w-[10%]">Entity</th>
              <th className="px-4 py-3 text-left w-[14%]">Name</th>
              <th className="px-4 py-3 text-left w-[12%]">Phone</th>
              <th className="px-4 py-3 text-left w-[14%]">Assignee</th>
              <th className="px-4 py-3 text-left w-[10%]">Status</th>
              <th className="px-4 py-3 text-left w-[10%]">Priority</th>
              <th className="px-4 py-3 text-left w-[14%]">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-10 text-center text-gray-500" colSpan={8}>
                  Loading cases...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="px-4 py-10 text-center text-red-600" colSpan={8}>
                  {error}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8">
                  <EmptyState title="No cases found" description="No records match your search." />
                </td>
              </tr>
            ) : (
              items.map((row, idx) => (
                <tr
                  key={row._id || row.id || idx}
                  className="cursor-pointer border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => setSelectedId(row.caseId || row._id)}
                >
                  <td className="px-4 py-3 break-all">{row.caseId || row._id || "-"}</td>
                  <td className="px-4 py-3 break-words">{row.entityType || row.entity || "-"}</td>
                  <td className="px-4 py-3 break-words">{row.name || "-"}</td>
                  <td className="px-4 py-3 break-words">{row.phone || "-"}</td>
                  <td className="px-4 py-3 break-words">{row.assigneeEmail || "Unassigned"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status || row.caseStatus || "-"} />
                  </td>
                  <td className="px-4 py-3 break-words">{row.priority || "-"}</td>
                  <td className="px-4 py-3 break-words">{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "-"}</td>
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

      <SidePanel open={!!selectedId} onClose={() => setSelectedId(null)} title={`Case ${selectedId || ""}`}>
        {loadingDetail ? (
          <div className="py-6 text-sm text-gray-500">Loading case details...</div>
        ) : selected ? (
          <CaseDetailPanel item={selected} onUpdated={reload} />
        ) : (
          <EmptyState title="Case not found" description="This case may have been removed." />
        )}
      </SidePanel>
    </div>
  );
}
