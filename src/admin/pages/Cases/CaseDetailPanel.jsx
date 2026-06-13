import { useEffect, useMemo, useState } from "react";
import StatusBadge from "../../components/common/StatusBadge";
import { updateCase } from "../../../api/adminApi";

const STATUSES = ["open", "approved", "rejected", "closed"];
const PRIORITIES = ["low", "normal", "high", "critical"];

export default function CaseDetailPanel({ item, onUpdated }) {
  const [status, setStatus] = useState(item.status || "open");
  const [priority, setPriority] = useState(item.priority || "normal");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    setStatus(item.status || "open");
    setPriority(item.priority || "normal");
    setError("");
    setOk("");
  }, [item.caseId, item._id, item.status, item.priority]);

  const canSave = useMemo(
    () => status !== item.status || priority !== item.priority,
    [status, priority, item.status, item.priority]
  );

  const save = async () => {
    setSaving(true);
    setError("");
    setOk("");
    try {
      await updateCase(item.caseId || item._id, { status, priority });
      setOk("Case updated successfully.");
      onUpdated?.();
    } catch (e) {
      setError(e.message || "Failed to update case");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 text-sm">
      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div> : null}
      {ok ? <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-green-700">{ok}</div> : null}

      <div className="rounded-xl border border-gray-200 p-3">
        <div className="mb-2 flex items-center justify-between">
          <strong>{item.caseId || item._id}</strong>
          <StatusBadge status={item.status || "-"} />
        </div>
        <div>Entity: {item.entityType || "-"}</div>
        <div>Name: {item.name || "-"}</div>
        <div>Phone: {item.phone || "-"}</div>
        <div>Assigned To: {item.assigneeEmail || "Unassigned"}</div>
        <div className="mt-1 text-gray-600">Updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "-"}</div>
      </div>

      <div className="rounded-xl border border-gray-200 p-3">
        <h4 className="mb-2 font-semibold">Case Action</h4>
        <p className="mb-2 text-xs text-gray-500">
          Update status/priority. Changes are saved immediately to case workflow.
        </p>
        <label className="mb-1 block text-xs text-gray-500">Status</label>
        <select className="w-full rounded border px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="mb-1 mt-3 block text-xs text-gray-500">Priority</label>
        <select className="w-full rounded border px-3 py-2" value={priority} onChange={(e) => setPriority(e.target.value)}>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          className="mt-3 rounded-md bg-townwize-primary px-3 py-2 text-white disabled:opacity-50"
          onClick={save}
          disabled={saving || !canSave}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
