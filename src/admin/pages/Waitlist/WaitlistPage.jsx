import { useEffect, useState } from "react";
import { deleteWaitlistEntry, fetchWaitlist, fetchWaitlistStats, updateWaitlistEntry } from "../../../api/adminApi";
import EmptyState from "../../components/common/EmptyState";

const TYPE_LABELS   = { passenger: "Towner", driver: "Wizer" };
const STATUS_COLORS = {
  pending:  "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  invited:  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  rejected: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
};
const TYPE_COLORS = {
  passenger: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  driver:    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

function Badge({ cls, label }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>{label}</span>;
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-townwize-accent bg-teal-50 dark:bg-teal-900/20" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${accent ? "text-townwize-accent" : "text-gray-900 dark:text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function DetailPanel({ entry, onClose, onSaved }) {
  const [status, setStatus] = useState(entry.status);
  const [notes,  setNotes]  = useState(entry.notes || "");
  const [saving, setSaving] = useState(false);
  const [ok,     setOk]     = useState("");
  const [err,    setErr]    = useState("");

  const save = async () => {
    setSaving(true); setOk(""); setErr("");
    try {
      await updateWaitlistEntry(entry._id, { status, notes });
      setOk("Saved.");
      onSaved?.();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!window.confirm("Remove this entry from the waitlist?")) return;
    try {
      await deleteWaitlistEntry(entry._id);
      onSaved?.();
      onClose();
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white">Waitlist Entry</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
        </div>

        {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
        {ok  && <p className="text-xs text-green-600 dark:text-green-400">{ok}</p>}

        <div className="space-y-1 text-sm">
          <p className="font-semibold dark:text-white">{entry.email}</p>
          {entry.name  && <p className="text-gray-500 dark:text-gray-400">{entry.name}</p>}
          {entry.phone && <p className="text-gray-500 dark:text-gray-400">{entry.phone}</p>}
          <div className="flex gap-2 mt-2">
            <Badge cls={TYPE_COLORS[entry.type]}   label={TYPE_LABELS[entry.type] || entry.type} />
            <Badge cls={STATUS_COLORS[entry.status]} label={entry.status} />
          </div>
          <p className="text-xs text-gray-400 mt-1">Signed up: {new Date(entry.createdAt).toLocaleString()}</p>
          {entry.invitedAt  && <p className="text-xs text-gray-400">Invited: {new Date(entry.invitedAt).toLocaleString()}</p>}
          {entry.approvedAt && <p className="text-xs text-gray-400">Approved: {new Date(entry.approvedAt).toLocaleString()}</p>}
          <p className="text-xs text-gray-400">Source: {entry.source || "landing"}</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm">
              {["pending","invited","approved","rejected"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Admin notes</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal note about this subscriber..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm resize-none" />
          </div>
          <button onClick={save} disabled={saving}
            className="w-full rounded-lg bg-townwize-primary py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button onClick={remove}
            className="w-full rounded-lg border border-red-300 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            Remove from waitlist
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WaitlistPage() {
  const [items,   setItems]   = useState([]);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [q,       setQ]       = useState("");
  const [page,    setPage]    = useState(1);
  const [meta,    setMeta]    = useState({ total: 0, totalPages: 1 });
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [listRes, statsRes] = await Promise.all([
        fetchWaitlist({ type: typeFilter, status: statusFilter, q, page, limit: 50 }),
        fetchWaitlistStats(),
      ]);
      setItems(listRes?.data?.items || []);
      setMeta({ total: listRes?.data?.total || 0, totalPages: listRes?.data?.totalPages || 1 });
      setStats(statsRes?.data || null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [typeFilter, statusFilter, q, page]);

  const P_LIMIT = 500; const D_LIMIT = 100;
  const pTotal  = stats?.passenger?.total || 0;
  const dTotal  = stats?.driver?.total    || 0;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold dark:text-white">Early Access Waitlist</h1>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total signups"        value={stats.totals?.all     || 0} />
          <StatCard label="Pending"              value={stats.totals?.pending  || 0} />
          <StatCard label="Invited"              value={stats.totals?.invited  || 0} />
          <StatCard label="Approved"             value={stats.totals?.approved || 0} />
          <StatCard label="Passengers (Towners)" value={`${pTotal} / ${P_LIMIT}`}
            sub={`${P_LIMIT - pTotal} spots remaining`} accent={pTotal >= P_LIMIT * 0.8} />
          <StatCard label="Drivers (Wizers)"     value={`${dTotal} / ${D_LIMIT}`}
            sub={`${D_LIMIT - dTotal} spots remaining`} accent={dTotal >= D_LIMIT * 0.8} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm">
          <option value="all">All Types</option>
          <option value="passenger">Passengers</option>
          <option value="driver">Drivers</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="invited">Invited</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search email / name"
          className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm w-64" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Signed Up</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="p-8"><EmptyState title="No entries found" description="No waitlist signups match these filters." /></td></tr>
            ) : items.map((item) => (
              <tr key={item._id} onClick={() => setSelected(item)}
                className="border-t border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-medium dark:text-white">{item.email}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.name || "—"}</td>
                <td className="px-4 py-3"><Badge cls={TYPE_COLORS[item.type]}   label={TYPE_LABELS[item.type] || item.type} /></td>
                <td className="px-4 py-3"><Badge cls={STATUS_COLORS[item.status]} label={item.status} /></td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm dark:text-gray-300">
        <span>Total: {meta.total}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="rounded border px-3 py-1 disabled:opacity-40 dark:border-gray-600">Prev</button>
          <span className="px-2">Page {page} / {meta.totalPages}</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}
            className="rounded border px-3 py-1 disabled:opacity-40 dark:border-gray-600">Next</button>
        </div>
      </div>

      {selected && (
        <DetailPanel
          entry={selected}
          onClose={() => setSelected(null)}
          onSaved={() => { load(); setSelected(null); }}
        />
      )}
    </div>
  );
}
