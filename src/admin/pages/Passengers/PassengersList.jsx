import { useEffect, useState } from "react";
import SidePanel from "../../components/panels/SidePanel";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { fetchCaseDetail, fetchCases } from "../../../api/adminApi";
import CaseDetailPanel from "../Cases/CaseDetailPanel";

export default function PassengersList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("all");
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
    const [selectedId, setSelectedId] = useState(null);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        let mounted = true;
        const run = async () => {
            setLoading(true);
            setError("");
            try {
                const json = await fetchCases({
                    entityType: "passenger",
                    q: query,
                    status,
                    page: String(page),
                    limit: "20",
                });
                if (!mounted) return;
                setItems(json?.data?.items || []);
                setMeta({
                    page: json?.data?.page || 1,
                    totalPages: json?.data?.totalPages || 1,
                    total: json?.data?.total || 0,
                });
            } catch (e) {
                if (!mounted) return;
                setError(e.message || "Failed to load passengers");
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
            try {
                const json = await fetchCaseDetail(selectedId);
                if (!mounted) return;
                setSelected(json?.data || null);
            } catch {
                if (!mounted) return;
                setSelected(null);
            }
        };
        run();
        return () => (mounted = false);
    }, [selectedId]);

    const refresh = async () => {
        const json = await fetchCases({
            entityType: "passenger",
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
        if (selectedId) {
            const detail = await fetchCaseDetail(selectedId);
            setSelected(detail?.data || null);
        }
    };

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-semibold">Passenger Verification Cases</h1>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row">
                    <select className="border rounded-md px-3 py-2 text-sm" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
                        <option value="all">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="closed">Closed</option>
                    </select>

                    <input className="w-full md:w-96 border rounded-md px-3 py-2 text-sm" placeholder="Search passengers" value={query} onChange={(e) => { setPage(1); setQuery(e.target.value); }} />
                </div>
            </div>

            <div className="md:hidden space-y-3">
                {loading ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">Loading...</div>
                ) : error ? (
                    <div className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-600">{error}</div>
                ) : items.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <EmptyState title="No passengers found" description="Try adjusting filters" />
                    </div>
                ) : (
                    items.map((it) => (
                        <button
                            key={it.caseId || it._id}
                            type="button"
                            className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left"
                            onClick={() => setSelectedId(it.caseId || it._id)}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-xs text-gray-500">Case ID</div>
                                    <div className="text-sm font-medium break-all">{it.caseId || it._id}</div>
                                </div>
                                <StatusBadge status={it.status || "-"} />
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <div className="text-xs text-gray-500">Name</div>
                                    <div className="break-words">{it.name || "-"}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">Phone</div>
                                    <div className="break-words">{it.phone || "-"}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">Priority</div>
                                    <div>{it.priority || "-"}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">Assigned</div>
                                    <div className="break-words">{it.assigneeEmail || "Unassigned"}</div>
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>

            <div className="hidden md:block overflow-x-auto bg-white rounded-xl border border-gray-200">
                <table className="w-full table-fixed text-sm min-w-[940px]">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left w-[20%]">Case ID</th>
                            <th className="px-4 py-3 text-left w-[14%]">Name</th>
                            <th className="px-4 py-3 text-left w-[14%]">Phone</th>
                            <th className="px-4 py-3 text-left w-[12%]">Status</th>
                            <th className="px-4 py-3 text-left w-[12%]">Priority</th>
                            <th className="px-4 py-3 text-left w-[14%]">Assigned To</th>
                            <th className="px-4 py-3 text-left w-[14%]">Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td className="px-4 py-10 text-center text-gray-500" colSpan={7}>Loading...</td></tr>
                        ) : error ? (
                            <tr><td className="px-4 py-10 text-center text-red-600" colSpan={7}>{error}</td></tr>
                        ) : items.length === 0 ? (
                            <tr><td className="p-8" colSpan={7}><EmptyState title="No passengers found" description="Try adjusting filters" /></td></tr>
                        ) : items.map((it) => (
                            <tr key={it.caseId || it._id} className="cursor-pointer border-t hover:bg-gray-50" onClick={() => setSelectedId(it.caseId || it._id)}>
                                <td className="px-4 py-3 break-all">{it.caseId || it._id}</td>
                                <td className="px-4 py-3 break-words">{it.name || "-"}</td>
                                <td className="px-4 py-3 break-words">{it.phone || "-"}</td>
                                <td className="px-4 py-3"><StatusBadge status={it.status || "-"} /></td>
                                <td className="px-4 py-3 break-words">{it.priority || "-"}</td>
                                <td className="px-4 py-3 break-words">{it.assigneeEmail || "Unassigned"}</td>
                                <td className="px-4 py-3 break-words">{it.updatedAt ? new Date(it.updatedAt).toLocaleString() : "-"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between text-sm">
                <span>Total: {meta.total}</span>
                <div className="flex items-center gap-2">
                    <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
                    <span>Page {meta.page} / {meta.totalPages}</span>
                    <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
            </div>

            <SidePanel open={!!selectedId} title={`Passenger Case ${selectedId || ""}`} onClose={() => setSelectedId(null)}>
                {selected ? <CaseDetailPanel item={selected} onUpdated={refresh} /> : <div className="text-sm text-gray-500">Loading details...</div>}
            </SidePanel>
        </div>
    );
}
