import { useEffect, useMemo, useState } from "react";
import StatusBadge from "../../components/common/StatusBadge";
import { replySupportTicket, updateSupportTicket } from "../../../api/adminApi";

const STATUS_OPTIONS = ["open", "in_progress", "escalated", "resolved", "closed"];
const PRIORITY_OPTIONS = ["low", "normal", "high", "critical"];

export default function TicketDetailPanel({ ticket, onUpdated }) {
  const [status, setStatus] = useState(ticket.status || "open");
  const [priority, setPriority] = useState(ticket.priority || "normal");
  const [assigneeId, setAssigneeId] = useState(ticket.assigneeId || "");
  const [note, setNote] = useState("");
  const [resolutionNote, setResolutionNote] = useState(ticket.resolutionNote || "");
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);
  const [replying, setReplying] = useState(false);
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
      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div> : null}
      {ok ? <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-green-700">{ok}</div> : null}

      <div className="rounded-xl border border-gray-200 p-3">
        <div className="mb-1 flex items-center justify-between">
          <strong>{ticket.ticketNo || ticket._id}</strong>
          <StatusBadge status={ticket.status || "-"} />
        </div>
        <div>Subject: {ticket.subject || "-"}</div>
        <div>Category: {ticket.category || "-"}</div>
        <div>Priority: {ticket.priority || "normal"}</div>
        <div>Requester: {ticket.requesterEmail || "Unknown"}</div>
        <div>Assigned: {ticket.assigneeEmail || "Unassigned"}</div>
        <div className="mt-1 text-gray-600">Updated: {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : "-"}</div>
      </div>

      <div className="rounded-xl border border-gray-200 p-3 space-y-3">
        <h4 className="font-semibold">Actions</h4>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Status</label>
            <select className="w-full rounded border px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Priority</label>
            <select className="w-full rounded border px-3 py-2" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Assign To (admin user id, blank = unassign)</label>
            <input
              className="w-full rounded border px-3 py-2"
              placeholder="Mongo user id"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            />
          </div>
          {status === "resolved" ? (
            <div>
              <label className="mb-1 block text-xs text-gray-500">Resolution note</label>
              <textarea
                className="w-full rounded border px-3 py-2"
                rows={2}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
              />
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-xs text-gray-500">Internal note</label>
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

      <div className="rounded-xl border border-gray-200 p-3 space-y-3">
        <h4 className="font-semibold">Conversation</h4>
        <div className="max-h-56 space-y-2 overflow-y-auto rounded border bg-gray-50 p-2">
          {(ticket.replies || []).length === 0 ? (
            <div className="text-gray-500">No replies yet.</div>
          ) : (
            ticket.replies.map((r, idx) => (
              <div key={`${r.createdAt || ""}-${idx}`} className="rounded border border-gray-200 bg-white p-2">
                <div className="text-xs text-gray-500">
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

      <div className="rounded-xl border border-gray-200 p-3">
        <h4 className="mb-2 font-semibold">History</h4>
        <div className="max-h-56 space-y-2 overflow-y-auto">
          {(ticket.history || []).length === 0 ? (
            <div className="text-gray-500">No history yet.</div>
          ) : (
            ticket.history
              .slice()
              .reverse()
              .map((h, idx) => (
                <div key={`${h.at || ""}-${idx}`} className="rounded border border-gray-200 p-2">
                  <div className="text-xs text-gray-500">
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
