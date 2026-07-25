import { useEffect, useMemo, useState } from "react";
import StatusBadge from "../../components/common/StatusBadge";
import { fetchRideDetail, replySupportTicket, updateSupportTicket } from "../../../api/adminApi";

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

  const [linkedRide, setLinkedRide] = useState(null);
  const [linkedRideLoading, setLinkedRideLoading] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    setStatus(ticket.status || "open");
    setPriority(ticket.priority || "normal");
    setAssigneeId(ticket.assigneeId || "");
    setResolutionNote(ticket.resolutionNote || "");
    setReply("");
    setNote("");
    setError("");
    setOk("");
    setLinkedRide(null);
    setLinkInput("");
  }, [ticket._id, ticket.status, ticket.priority, ticket.assigneeId, ticket.resolutionNote]);

  useEffect(() => {
    if (ticket.linkedType !== "ride" || !ticket.linkedId) return;
    let mounted = true;
    setLinkedRideLoading(true);
    fetchRideDetail(ticket.linkedId)
      .then((res) => { if (mounted) setLinkedRide(res?.data || null); })
      .catch(() => { if (mounted) setLinkedRide(null); })
      .finally(() => { if (mounted) setLinkedRideLoading(false); });
    return () => { mounted = false; };
  }, [ticket._id, ticket.linkedType, ticket.linkedId]);

  const handleLinkRide = async () => {
    const rideId = linkInput.trim();
    if (!rideId) return;
    setLinking(true);
    setError("");
    setOk("");
    try {
      await updateSupportTicket(ticket._id, { linkedRideId: rideId });
      setOk("Ride linked.");
      setLinkInput("");
      await onUpdated?.();
    } catch (e) {
      setError(e?.message || "Failed to link ride");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkRide = async () => {
    setLinking(true);
    setError("");
    setOk("");
    try {
      await updateSupportTicket(ticket._id, { linkedRideId: "" });
      setOk("Ride unlinked.");
      setLinkedRide(null);
      await onUpdated?.();
    } catch (e) {
      setError(e?.message || "Failed to unlink ride");
    } finally {
      setLinking(false);
    }
  };

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
        <div className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
          <div><span className="text-xs text-gray-400 mr-1">Subject:</span>{ticket.subject || "-"}</div>
          <div><span className="text-xs text-gray-400 mr-1">Category:</span>{ticket.category || "-"}</div>
          <div className="flex items-center gap-2"><span className="text-xs text-gray-400">Priority:</span><PriorityBadge priority={ticket.priority} /></div>
          <div><span className="text-xs text-gray-400 mr-1">Requester:</span>{ticket.requesterEmail || "Unknown"}</div>
          <div><span className="text-xs text-gray-400 mr-1">Assigned to:</span>{ticket.assigneeEmail || <span className="text-gray-400 italic">Unassigned</span>}</div>
          {ticket.status === "escalated" && (
            <div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              ⚠ This ticket has been escalated. Assign it to a supervisor and update the status to <strong>in_progress</strong> to begin resolution.
            </div>
          )}
        </div>
        <div className="mt-2 text-xs text-gray-400">Updated: {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : "-"}</div>
      </div>

      {/* ── Linked Ride ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
        <h4 className="font-semibold text-sm">Linked Ride</h4>
        {ticket.linkedType === "ride" && ticket.linkedId ? (
          <div className="space-y-2">
            {linkedRideLoading ? (
              <div className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
            ) : linkedRide ? (
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-2.5 text-xs space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-gray-400 dark:text-gray-500">…{ticket.linkedId.slice(-8)}</span>
                  <StatusBadge status={linkedRide.status || "-"} />
                  {(linkedRide.fareEstimate || linkedRide.fare?.final) && (
                    <span className="ml-auto font-semibold text-gray-700 dark:text-gray-300">
                      PKR {Number(linkedRide.fare?.final ?? linkedRide.fareEstimate ?? 0).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  <span className="text-townwize-accent">↑</span> {linkedRide.pickup?.address || "—"}
                </div>
                <div className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  <span className="text-red-400">↓</span> {linkedRide.dropoff?.address || "—"}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Could not load ride details</p>
            )}
            <button
              onClick={handleUnlinkRide}
              disabled={linking}
              className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
            >
              {linking ? "Unlinking…" : "× Unlink ride"}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Link this ticket to a ride for dispute or investigation context.
            </p>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded border dark:border-gray-600 dark:bg-gray-800 dark:text-white px-2 py-1.5 text-xs font-mono"
                placeholder="Paste Ride ID (_id from Rides list)"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLinkRide()}
              />
              <button
                onClick={handleLinkRide}
                disabled={linking || !linkInput.trim()}
                className="rounded bg-townwize-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 shrink-0"
              >
                {linking ? "Linking…" : "Link"}
              </button>
            </div>
          </div>
        )}
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
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              Assign to admin
              <span className="ml-1 text-gray-400">(paste admin user ID from Admin Users page)</span>
            </label>
            <input
              className="w-full rounded border dark:border-gray-600 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm font-mono"
              placeholder="e.g. 6a30199325..."
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            />
            {ticket.assigneeEmail && (
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">Currently: {ticket.assigneeEmail}</p>
            )}
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
