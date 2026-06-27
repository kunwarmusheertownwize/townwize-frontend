import { useEffect, useState } from "react";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";

const PRIORITY_CLS = {
  low:      "bg-gray-100 text-gray-600",
  normal:   "bg-blue-100 text-blue-700",
  high:     "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700 font-bold",
};
const PriorityBadge = ({ priority = "normal" }) => (
  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs capitalize ${PRIORITY_CLS[priority] || PRIORITY_CLS.normal}`}>
    {priority}
  </span>
);
import {
  createSupportTicket,
  fetchSupportTicketDetail,
  fetchSupportTickets,
} from "../../../api/adminApi";
import SidePanel from "../../components/panels/SidePanel";
import TicketDetailPanel from "./TicketDetailPanel";

export default function TicketsList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [createForm, setCreateForm] = useState({
    subject: "",
    description: "",
    category: "general",
    priority: "normal",
  });

  const loadList = async () => {
    const json = await fetchSupportTickets({
      q: query,
      status,
      page: String(page),
      limit: "20",
    });
    setItems(json?.data?.items || []);
    setMeta({
      page: json?.data?.page || 1,
      totalPages: json?.data?.totalPages || 1,
      total: json?.data?.total || 0,
    });
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const json = await fetchSupportTickets({ q: query, status, page: String(page), limit: "20" });
        if (!mounted) return;
        setItems(json?.data?.items || []);
        setMeta({
          page: json?.data?.page || 1,
          totalPages: json?.data?.totalPages || 1,
          total: json?.data?.total || 0,
        });
      } catch (e) {
        if (!mounted) return;
        setError(e.message || "Failed to load tickets");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => (mounted = false);
  }, [query, status, page]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    let mounted = true;
    const run = async () => {
      setDetailLoading(true);
      try {
        const json = await fetchSupportTicketDetail(selectedId);
        if (!mounted) return;
        setSelected(json?.data || null);
      } catch {
        if (!mounted) return;
        setSelected(null);
      } finally {
        if (mounted) setDetailLoading(false);
      }
    };
    run();
    return () => (mounted = false);
  }, [selectedId]);

  const refreshDetailAndList = async () => {
    await loadList();
    if (selectedId) {
      const json = await fetchSupportTicketDetail(selectedId);
      setSelected(json?.data || null);
    }
  };

  const submitCreate = async () => {
    setError("");
    setOk("");
    try {
      const json = await createSupportTicket(createForm);
      setOk(json?.message || "Support ticket created.");
      setCreateForm({ subject: "", description: "", category: "general", priority: "normal" });
      setPage(1);
      await loadList();
    } catch (e) {
      setError(e.message || "Failed to create ticket");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="dark:text-white text-xl font-semibold">Support Tickets</h1>

      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div> : null}
      {ok ? <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-green-700">{ok}</div> : null}

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <h2 className="dark:text-white text-sm font-semibold">Create Ticket</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="md:col-span-2 rounded-md border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
            placeholder="Subject"
            value={createForm.subject}
            onChange={(e) => setCreateForm((p) => ({ ...p, subject: e.target.value }))}
          />
          <select
            className="rounded-md border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
            value={createForm.category}
            onChange={(e) => setCreateForm((p) => ({ ...p, category: e.target.value }))}
          >
            <option value="general">General</option>
            <option value="ride_issue">Ride Issue</option>
            <option value="payment">Payment</option>
            <option value="refund">Refund</option>
            <option value="safety">Safety</option>
          </select>
          <select
            className="rounded-md border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
            value={createForm.priority}
            onChange={(e) => setCreateForm((p) => ({ ...p, priority: e.target.value }))}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <textarea
            className="md:col-span-3 rounded-md border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
            rows={2}
            placeholder="Description (optional)"
            value={createForm.description}
            onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
          />
          <button
            type="button"
            className="rounded-md bg-townwize-primary px-3 py-2 text-white disabled:opacity-50"
            disabled={createForm.subject.trim().length < 3}
            onClick={submitCreate}
          >
            Create
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <select
            className="rounded-md border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <input
            className="w-full rounded-md border px-3 py-2 text-sm md:w-96 dark:bg-gray-800 dark:text-white dark:border-gray-600"
            placeholder="Search tickets"
            value={query}
            onChange={(e) => {
              setPage(1);
              setQuery(e.target.value);
            }}
          />
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <EmptyState title="No tickets found" description="Try adjusting filters." />
          </div>
        ) : (
          items.map((t) => (
            <button
              key={t._id}
              type="button"
              className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left"
              onClick={() => setSelectedId(t._id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">Ticket</div>
                  <div className="text-sm font-medium break-all">{t.ticketNo || t._id}</div>
                </div>
                <StatusBadge status={t.status || "-"} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500">Category</div>
                  <div className="break-words">{t.category || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Requester</div>
                  <div className="break-words">{t.requesterEmail || "Unknown"}</div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full table-fixed text-sm min-w-[900px]">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left w-[20%]">Ticket</th>
              <th className="px-4 py-3 text-left w-[12%]">Status</th>
              <th className="px-4 py-3 text-left w-[12%]">Priority</th>
              <th className="px-4 py-3 text-left w-[16%]">Category</th>
              <th className="px-4 py-3 text-left w-[20%]">Requester</th>
              <th className="px-4 py-3 text-left w-[20%]">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-10 text-center text-gray-500" colSpan={6}>
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="p-8" colSpan={6}>
                  <EmptyState title="No tickets found" description="Try adjusting filters." />
                </td>
              </tr>
            ) : (
              items.map((t) => (
                <tr key={t._id} className="cursor-pointer border-t hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setSelectedId(t._id)}>
                  <td className="px-4 py-3 break-all">{t.ticketNo || t._id}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status || "-"} />
                  </td>
                  <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-4 py-3 break-words">{t.category || "-"}</td>
                  <td className="px-4 py-3 break-words">{t.requesterEmail || "Unknown"}</td>
                  <td className="px-4 py-3 break-words">{t.updatedAt ? new Date(t.updatedAt).toLocaleString() : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span>Total: {meta.total}</span>
        <div className="flex items-center gap-2">
          <button className="rounded border px-3 py-1 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </button>
          <span>
            Page {meta.page} / {meta.totalPages}
          </span>
          <button className="rounded border px-3 py-1 disabled:opacity-50" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </div>

      <SidePanel open={!!selectedId} title={`Ticket ${selected?.ticketNo || selectedId || ""}`} onClose={() => setSelectedId(null)}>
        {detailLoading ? (
          <div className="py-6 text-sm text-gray-500">Loading ticket details...</div>
        ) : selected ? (
          <TicketDetailPanel ticket={selected} onUpdated={refreshDetailAndList} />
        ) : (
          <EmptyState title="Ticket not found" description="This ticket may have been removed." />
        )}
      </SidePanel>
    </div>
  );
}
