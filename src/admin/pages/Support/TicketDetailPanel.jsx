import { useEffect, useMemo, useState } from "react";
import StatusBadge from "../../components/common/StatusBadge";
import { replySupportTicket, updateSupportTicket } from "../../../api/adminApi";

const STATUS_OPTIONS = ["open", "in_progress", "escalated", "resolved", "closed"];
const PRIORITY_OPTIONS = ["low", "normal", "high", "critical"];

function EscalateModal({ ticket, onDone, onCancel }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const confirm = async () => {
    if (!note.trim()) { setErr("Escalation reason is required."); return; }
    setBusy(true);
    setErr("");
    try {
      await updateSupportTicket(ticket._id, { status: "escalated", note: note.trim() });
      await onDone?.();
    } catch (e) {
      setErr(e?.message || "Failed to escalate ticket");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Escalate Ticket</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Ticket <strong>{ticket.ticketNo || ticket._id}</strong> will be marked <em>escalated</em>. Describe the reason so the supervisor has context.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Why is this being escalated? (e.g. unresolved billing dispute, safety concern...)"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:border-townwize-primary focus:outline-none"
        />
        {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
        <div className="mt-4 flex gap-3">
          <button onClick={confirm} disabled={busy} className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
            {busy ? "Escalating..." : "Escalate"}
          </button>
          <button onClick={onCancel} disabled={busy} className="flex-1 rounded-lg border dark:border-gray-600 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TicketDetailPanel({ ticket, onUpdated }) {
  const [status, setStatus] = useState(ticket.status || "open");
  const [priority, setPriority] = useState(ticket.priority || "normal");
  const [assigneeId, setAssigneeId] = useState(ticket.assigneeId || "");
  const [note, setNote] = useState("");
  const [resolutionNote, setResolutionNote] = useState(ticket.resolutionNote || "");
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);
  const [replying, setReplying] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    setStatus(ticket.status || "open");
    setPriority(ticket.priority || "normal");
    setAssigneeId(ticket.assigneeId || "");
    setResolutionNote(ticket.resolutionNote || "");
    setReply("");
    setNote("");
    setError("");
    setOk("");
  }, [ticket._id, ticket.status, ticket.priority, ticket.assigneeId, ticket.resolutionNote]);

  const canSave = useMemo(() => {
    return (
      status !== (ticket.status || "open") ||
      priority !== (ticket.priority || "normal") ||
      assigneeId !== (ticket.assigneeId || "") ||
      (status === "resolved" && resolutionNote !== (ticket.resolutionNote || "")) ||
      note.trim().length > 0
    );
  }, [status, priority, assigneeId, resolutionNote, note, ticket]);

  const save = async () => {
    setSaving(true);
    setError("");
    setOk("");
    try {
      await updateSupportTicket(ticket._id, {
        status,
        priority,
        assigneeId,
        resolutionNote,
        note: note.trim(),
      });
      setOk("Ticket updated.");
      setNote("");
      await onUpdated?.();
    } catch (e) {
      setError(e.message || "Failed to update ticket");
    } finally {
      setSaving(false);
    }
  };

  const addReply = async () => {
    setReplying(true);
    setError("");
    setOk("");
    try {
      await replySupportTicket(ticket._id, reply.trim());
      setOk("Reply added.");
      setReply("");
      await onUpdated?.();
    } catch (e) {
      setError(e.message || "Failed to add reply");
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="space-y-4 text-sm">
      {showEscalate && (
        <EscalateModal
          ticket={ticket}
          onDone={async () => { setShowEscalate(false); setOk("Ticket escalated."); await onUpdated?.(); }}
          onCancel={() => setShowEscalate(false)}
        />
      )}
      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div> : null}
      {ok ? <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-green-700">{ok}</div> : null}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
        <div className="mb-1 flex items-center justify-between">
          <strong>{ticket.ticketNo || ticket._id}</strong>
          <StatusBadge status={ticket.status || "-"} />
        </div>
        <div>Subject: {ticket.subject || "-"}</div>
        <div>Category: {ticket.category || "-"}</div>
        <div>Priority: {ticket.priority || "normal"}</div>
        <div>Requester: {ticket.requesterEmail || "Unknown"}</div>
        <div>Assigned: {ticket.assigneeEmail || "Unassigned"}</div>
        <div className="mt-1 text-gray-600 dark:text-gray-400">Updated: {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : "-"}</div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3">
        <h4 className="font-semibold">Actions</h4>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Status</label>
            <select className="w-full rounded border px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Priority</label>
            <select className="w-full rounded border px-3 py-2" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Assignee (admin user ID — leave blank to unassign)</label>
            <input
              className="w-full rounded border dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm"
              placeholder="Admin user ID"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            />
          </div>
          {ticket.status !== "escalated" && (
            <button
              type="button"
              onClick={() => setShowEscalate(true)}
              className="w-full rounded-lg border-2 border-amber-500 text-amber-700 dark:text-amber-400 px-3 py-2 text-sm font-semibold hover:bg-amber-50 dark:hover:bg-amber-900/20"
            >
              ⚠ Escalate to Supervisor
            </button>
          )}
          {status === "resolved" ? (
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Resolution note</label>
              <textarea
                className="w-full rounded border px-3 py-2"
                rows={2}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
              />
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Internal note</label>
            <textarea className="w-full rounded border px-3 py-2" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <button
          className="rounded-md bg-townwize-primary px-3 py-2 text-white disabled:opacity-50"
          onClick={save}
          disabled={saving || !canSave}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3">
        <h4 className="font-semibold">Conversation</h4>
        <div className="max-h-56 space-y-2 overflow-y-auto rounded border bg-gray-50 dark:bg-gray-800 p-2">
          {(ticket.replies || []).length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400">No replies yet.</div>
          ) : (
            ticket.replies.map((r, idx) => (
              <div key={`${r.createdAt || ""}-${idx}`} className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {(r.authorEmail || "unknown")} - {r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}
                </div>
                <div className="break-words">{r.message}</div>
              </div>
            ))
          )}
        </div>
        <textarea
          className="w-full rounded border px-3 py-2"
          rows={2}
          placeholder="Add reply"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <button
          className="rounded-md bg-gray-800 px-3 py-2 text-white disabled:opacity-50"
          onClick={addReply}
          disabled={replying || reply.trim().length < 2}
        >
          {replying ? "Posting..." : "Post Reply"}
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
        <h4 className="mb-2 font-semibold">History</h4>
        <div className="max-h-56 space-y-2 overflow-y-auto">
          {(ticket.history || []).length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400">No history yet.</div>
          ) : (
            ticket.history
              .slice()
              .reverse()
              .map((h, idx) => (
                <div key={`${h.at || ""}-${idx}`} className="rounded border border-gray-200 dark:border-gray-700 p-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {h.type} - {h.actorEmail || "system"} - {h.at ? new Date(h.at).toLocaleString() : "-"}
                  </div>
                  <div className="break-words">{h.message || "-"}</div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
