import { useEffect, useState } from "react";
import {
  deleteWaitlistEntry, downloadWaitlistExport,
  fetchWaitlist, fetchWaitlistStats, updateWaitlistEntry,
} from "../../../api/adminApi";
import EmptyState from "../../components/common/EmptyState";

const TYPE_LABELS = { passenger: "Towner", driver: "Wizer" };
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
const GROUP_OPTIONS = [
  { value: "none",     label: "No Grouping" },
  { value: "type",     label: "Group by Type" },
  { value: "status",   label: "Group by Status" },
  { value: "precinct", label: "Group by Precinct" },
];

const toPKT = (d) =>
  d ? new Date(d).toLocaleString("en-US", {
    timeZone: "Asia/Karachi", year: "numeric", month: "short",
    day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
  }) : "—";

function Badge({ cls, label }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>{label}</span>;
}

function StatCard({ label, value, sub, accent, warn }) {
  return (
    <div className={`rounded-xl border p-4 ${
      warn   ? "border-orange-300 bg-orange-50 dark:bg-orange-900/20" :
      accent ? "border-townwize-accent bg-teal-50 dark:bg-teal-900/20" :
               "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
    }`}>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${
        warn ? "text-orange-500" : accent ? "text-townwize-accent" : "text-gray-900 dark:text-white"
      }`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SortTh({ col, label, sortBy, sortOrder, onSort }) {
  const active = sortBy === col;
  return (
    <th onClick={() => onSort(col)}
      className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300 cursor-pointer select-none whitespace-nowrap hover:text-gray-900 dark:hover:text-white">
      <span className="flex items-center gap-1">
        {label}
        <span className="text-[10px] opacity-60">{active ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}</span>
      </span>
    </th>
  );
}

function DetailPanel({ entry: initial, onClose, onSaved }) {
  const [entry,   setEntry]   = useState(initial);
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({
    name:       initial.name       || "",
    phone:      initial.phone      || "",
    precinct:   initial.precinct   || "",
    type:       initial.type,
    status:     initial.status,
    notes:      initial.notes      || "",
    suspicious: initial.suspicious || false,
  });
  const [saving, setSaving] = useState(false);
  const [ok,     setOk]     = useState("");
  const [err,    setErr]    = useState("");

  const field = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const save = async () => {
    setSaving(true); setOk(""); setErr("");
    try {
      const res = await updateWaitlistEntry(entry._id, form);
      setEntry(res.data);
      setOk("Saved.");
      setEditing(false);
      onSaved?.();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const toggleSuspicious = async () => {
    const next = !form.suspicious;
    setForm((f) => ({ ...f, suspicious: next }));
    try {
      const res = await updateWaitlistEntry(entry._id, { suspicious: next });
      setEntry(res.data);
      onSaved?.();
    } catch (e) { setForm((f) => ({ ...f, suspicious: !next })); setErr(e.message); }
  };

  const remove = async () => {
    if (!window.confirm("Remove this entry from the waitlist?")) return;
    try { await deleteWaitlistEntry(entry._id); onSaved?.(); onClose(); }
    catch (e) { setErr(e.message); }
  };

  const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="h-full w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white">Waitlist Entry</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
        </div>

        {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
        {ok  && <p className="text-xs text-green-600 dark:text-green-400">{ok}</p>}

        {/* Suspicious toggle */}
        <button onClick={toggleSuspicious}
          className={`w-full rounded-lg py-2 text-sm font-semibold border transition ${
            form.suspicious
              ? "bg-orange-100 border-orange-400 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
              : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-orange-300 hover:text-orange-600"
          }`}>
          {form.suspicious ? "⚠ Marked Suspicious — click to clear" : "Mark as Suspicious"}
        </button>

        {/* Identity section */}
        <div className="space-y-3">
          {editing ? (
            <>
              {[["name","Name"],["phone","Phone"],["precinct","Precinct"]].map(([k, lbl]) => (
                <div key={k}>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{lbl}</label>
                  <input value={form[k]} onChange={field(k)} className={inputCls} />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Type</label>
                <select value={form.type} onChange={field("type")} className={inputCls}>
                  <option value="passenger">Towner (Passenger)</option>
                  <option value="driver">Wizer (Driver)</option>
                </select>
              </div>
            </>
          ) : (
            <div className="space-y-1 text-sm">
              <p className="font-semibold dark:text-white">{entry.email}</p>
              {entry.name     && <p className="text-gray-500 dark:text-gray-400">{entry.name}</p>}
              {entry.phone    && <p className="text-gray-500 dark:text-gray-400">{entry.phone}</p>}
              {entry.precinct && <p className="text-gray-500 dark:text-gray-400">📍 {entry.precinct}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge cls={TYPE_COLORS[entry.type]}    label={TYPE_LABELS[entry.type] || entry.type} />
                <Badge cls={STATUS_COLORS[entry.status]} label={entry.status} />
                {entry.suspicious && (
                  <Badge cls="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" label="⚠ Suspicious" />
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">Signed up: {toPKT(entry.createdAt)}</p>
              {entry.invitedAt  && <p className="text-xs text-gray-400">Invited: {toPKT(entry.invitedAt)}</p>}
              {entry.approvedAt && <p className="text-xs text-gray-400">Approved: {toPKT(entry.approvedAt)}</p>}
              <p className="text-xs text-gray-400">Source: {entry.source || "landing"} · Lang: {entry.lang || "en"}</p>
            </div>
          )}
          <button onClick={() => { setEditing((v) => !v); setOk(""); setErr(""); }}
            className="text-xs text-townwize-primary dark:text-teal-400 underline">
            {editing ? "Cancel editing" : "Edit details"}
          </button>
        </div>

        {/* Status + Notes */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
            <select value={form.status} onChange={field("status")} className={inputCls}>
              {["pending","invited","approved","rejected"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Admin notes</label>
            <textarea rows={3} value={form.notes} onChange={field("notes")}
              placeholder="Internal note about this subscriber..."
              className={`${inputCls} resize-none`} />
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

function groupItems(items, groupBy) {
  if (groupBy === "none") return [{ key: null, label: null, items }];
  const map = new Map();
  items.forEach((item) => {
    const raw = item[groupBy] || "—";
    const key = groupBy === "type" ? (TYPE_LABELS[raw] || raw) : raw;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });
  return [...map.entries()].map(([label, items]) => ({ key: label, label, items }));
}

export default function WaitlistPage() {
  const [items,         setItems]         = useState([]);
  const [stats,         setStats]         = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [typeFilter,    setTypeFilter]    = useState("all");
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [suspiciousOnly,setSuspiciousOnly]= useState(false);
  const [q,             setQ]             = useState("");
  const [page,          setPage]          = useState(1);
  const [meta,          setMeta]          = useState({ total: 0, totalPages: 1 });
  const [sortBy,        setSortBy]        = useState("createdAt");
  const [sortOrder,     setSortOrder]     = useState("desc");
  const [groupBy,       setGroupBy]       = useState("none");
  const [selected,      setSelected]      = useState(null);
  const [exporting,     setExporting]     = useState(false);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const limitVal = groupBy !== "none" ? 1000 : 50;
      const params = { type: typeFilter, status: statusFilter, q, page, limit: limitVal, sortBy, sortOrder };
      if (suspiciousOnly) params.suspicious = "true";
      const [listRes, statsRes] = await Promise.all([fetchWaitlist(params), fetchWaitlistStats()]);
      setItems(listRes?.data?.items || []);
      setMeta({ total: listRes?.data?.total || 0, totalPages: listRes?.data?.totalPages || 1 });
      setStats(statsRes?.data || null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [typeFilter, statusFilter, suspiciousOnly, q, page, sortBy, sortOrder, groupBy]);

  const handleSort = (col) => {
    if (sortBy === col) setSortOrder((o) => (o === "desc" ? "asc" : "desc"));
    else { setSortBy(col); setSortOrder("asc"); }
    setPage(1);
  };

  const handleExport = async (format = "csv") => {
    setExporting(true);
    try {
      const params = { type: typeFilter, status: statusFilter, q, format };
      if (suspiciousOnly) params.suspicious = "true";
      await downloadWaitlistExport(params);
    } catch (e) { alert("Export failed: " + e.message); }
    finally { setExporting(false); }
  };

  const P_LIMIT = 500; const D_LIMIT = 100;
  const pTotal  = stats?.passenger?.total || 0;
  const dTotal  = stats?.driver?.total    || 0;
  const groups  = groupItems(items, groupBy);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold dark:text-white">Early Access Waitlist</h1>
        <div className="flex gap-2">
          <button onClick={() => handleExport("csv")} disabled={exporting}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
            {exporting ? "Exporting…" : "↓ Export CSV"}
          </button>
          <button onClick={() => handleExport("json")} disabled={exporting}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
            ↓ Export JSON
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total signups"        value={stats.totals?.all      || 0} />
          <StatCard label="Pending"              value={stats.totals?.pending   || 0} />
          <StatCard label="Invited"              value={stats.totals?.invited   || 0} />
          <StatCard label="Approved"             value={stats.totals?.approved  || 0} />
          <StatCard label="Passengers (Towners)" value={`${pTotal} / ${P_LIMIT}`}
            sub={`${P_LIMIT - pTotal} spots remaining`} accent={pTotal >= P_LIMIT * 0.8} />
          <StatCard label="Drivers (Wizers)"     value={`${dTotal} / ${D_LIMIT}`}
            sub={`${D_LIMIT - dTotal} spots remaining`} accent={dTotal >= D_LIMIT * 0.8} />
          {(stats.suspicious > 0) && (
            <StatCard label="Flagged Suspicious" value={stats.suspicious} warn />
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm">
          <option value="all">All Types</option>
          <option value="passenger">Towners</option>
          <option value="driver">Wizers</option>
        </select>

        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="invited">Invited</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm">
          {GROUP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search email / name / precinct…"
          className="rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm w-56" />

        <label className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300 cursor-pointer rounded-lg border border-orange-300 dark:border-orange-700 px-3 py-2 select-none">
          <input type="checkbox" checked={suspiciousOnly} onChange={(e) => { setSuspiciousOnly(e.target.checked); setPage(1); }} />
          ⚠ Suspicious only
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <SortTh col="email"     label="Email"          sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortTh col="name"      label="Name"           sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortTh col="type"      label="Type"           sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortTh col="precinct"  label="Precinct"       sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <SortTh col="status"    label="Status"         sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Flags</th>
              <SortTh col="createdAt" label="Signed Up (PKT)" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="p-8"><EmptyState title="No entries found" description="No waitlist signups match these filters." /></td></tr>
            ) : groups.map((group) => (
              <>{group.label && (
                <tr key={`grp-${group.key}`} className="bg-gray-100 dark:bg-gray-700/60">
                  <td colSpan={7} className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {group.label} <span className="font-normal text-gray-400">({group.items.length})</span>
                  </td>
                </tr>
              )}
              {group.items.map((item) => (
                <tr key={item._id} onClick={() => setSelected(item)}
                  className={`border-t border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    item.suspicious ? "bg-orange-50/40 dark:bg-orange-900/10" : ""
                  }`}>
                  <td className="px-4 py-3 font-medium dark:text-white max-w-[180px] truncate">{item.email}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.name || "—"}</td>
                  <td className="px-4 py-3"><Badge cls={TYPE_COLORS[item.type]} label={TYPE_LABELS[item.type] || item.type} /></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.precinct || "—"}</td>
                  <td className="px-4 py-3"><Badge cls={STATUS_COLORS[item.status]} label={item.status} /></td>
                  <td className="px-4 py-3">
                    {item.suspicious && <span title="Flagged as suspicious" className="text-orange-500">⚠</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">{toPKT(item.createdAt)}</td>
                </tr>
              ))}</>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination — hidden when grouping (all loaded) */}
      {groupBy === "none" && (
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
      )}

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
