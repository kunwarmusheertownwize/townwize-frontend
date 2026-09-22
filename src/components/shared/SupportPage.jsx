import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { FaHeadset, FaChevronDown, FaChevronUp, FaPaperPlane, FaPlus } from "react-icons/fa";
import api from "../../services/api";

const STATUS_META = {
  open:        { label: "Open",        cls: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In Progress", cls: "bg-amber-100 text-amber-700" },
  escalated:   { label: "Escalated",   cls: "bg-orange-100 text-orange-700" },
  resolved:    { label: "Resolved",    cls: "bg-green-100 text-green-700" },
  closed:      { label: "Closed",      cls: "bg-gray-100 text-gray-500" },
};

const CATEGORIES = [
  { value: "general",  label: "General inquiry" },
  { value: "ride",     label: "Ride issue" },
  { value: "payment",  label: "Payment / fare" },
  { value: "account",  label: "Account" },
  { value: "safety",   label: "Safety concern" },
  { value: "driver",   label: "Driver feedback" },
];

const formatTime = (iso) => {
  const d = new Date(iso);
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
};

const TicketThread = ({ ticketId, onBack }) => {
  const [ticket, setTicket]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply]     = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    api.get(`/support/${ticketId}`)
      .then((r) => setTicket(r?.data?.data))
      .catch(() => setError("Could not load ticket."))
      .finally(() => setLoading(false));
  }, [ticketId]);

  const sendReply = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      await api.post(`/support/${ticketId}/reply`, { message: reply.trim() });
      setTicket((prev) => ({
        ...prev,
        replies: [...(prev.replies || []), { authorRole: "passenger", message: reply.trim(), createdAt: new Date().toISOString() }],
      }));
      setReply("");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to send reply.");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />;

  if (!ticket) return <p className="text-sm text-red-500">{error}</p>;

  const meta = STATUS_META[ticket.status] || STATUS_META.open;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs text-townwize-accent hover:underline flex items-center gap-1">
        ← Back to tickets
      </button>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-townwize-primaryDark p-4 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-gray-400 font-mono">{ticket.ticketNo}</p>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white">{ticket.subject}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{ticket.description}</p>
        <p className="text-xs text-gray-400 pt-1">Submitted {formatTime(ticket.createdAt)}</p>
      </div>

      {/* Reply thread */}
      <div className="space-y-2">
        {(ticket.replies || []).map((r, i) => {
          const isUser = r.authorRole !== "admin";
          return (
            <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                isUser
                  ? "bg-townwize-primary text-white rounded-br-sm"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm"
              }`}>
                <p>{r.message}</p>
                <p className={`text-xs mt-1 ${isUser ? "text-white/60" : "text-gray-400"}`}>
                  {isUser ? "You" : "Support"} · {formatTime(r.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        {(ticket.replies || []).length === 0 && (
          <p className="text-center text-xs text-gray-400 py-4">No replies yet. Our team will respond shortly.</p>
        )}
      </div>

      {/* Reply input */}
      {ticket.status !== "closed" && (
        <div className="flex gap-2 pt-1">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply…"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-townwize-accent"
          />
          <button
            onClick={sendReply}
            disabled={!reply.trim() || sending}
            className="self-end rounded-xl bg-townwize-primary px-4 py-2 text-white disabled:opacity-40 hover:brightness-110"
          >
            <FaPaperPlane />
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

const SupportPage = () => {
  const location = useLocation();
  const [tickets, setTickets]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [activeId, setActiveId]     = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState("");
  const [form, setForm] = useState({ subject: "", description: "", category: "general" });

  useEffect(() => {
    const linkedRideId = location.state?.linkedRideId;
    if (linkedRideId) {
      setShowForm(true);
      setForm({
        subject: "Issue during active trip",
        description: `Ride ID: ${linkedRideId}\n\nPlease describe the issue:`,
        category: "ride",
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTickets = useCallback(() => {
    setLoading(true);
    api.get("/support")
      .then((r) => setTickets(r?.data?.data?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setFormError("");
    setSubmitting(true);
    try {
      await api.post("/support", form);
      setForm({ subject: "", description: "", category: "general" });
      setShowForm(false);
      fetchTickets();
    } catch (err) {
      setFormError(err?.response?.data?.message || "Failed to submit ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  if (activeId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <TicketThread ticketId={activeId} onBack={() => { setActiveId(null); fetchTickets(); }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-townwize-primary dark:text-white">Support</h1>
          <p className="text-xs text-gray-400 mt-0.5">Submit a ticket — our team usually replies within 24 hours.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl bg-townwize-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
        >
          <FaPlus className="text-xs" />
          New ticket
        </button>
      </div>

      {/* New ticket form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-townwize-accent/30 bg-white dark:bg-townwize-primaryDark p-5 space-y-4 shadow-sm">
          <h2 className="font-semibold text-townwize-primary dark:text-townwize-accent">New support ticket</h2>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-townwize-accent"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Subject</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={120}
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Brief summary of the issue"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-townwize-accent"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Description</label>
            <textarea
              required
              minLength={10}
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe your issue in detail…"
              className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-townwize-accent"
            />
          </div>

          {formError && <p className="text-xs text-red-500">{formError}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-townwize-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:brightness-110"
            >
              {submitting ? "Submitting…" : "Submit ticket"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(""); }}
              className="rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Ticket list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-townwize-primaryDark py-16 text-gray-400">
          <FaHeadset className="text-4xl" />
          <p className="text-sm">No tickets yet. We're here if you need help.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => {
            const meta = STATUS_META[t.status] || STATUS_META.open;
            const unread = (t.replies || []).filter((r) => r.authorRole === "admin").length;
            return (
              <button
                key={t._id}
                type="button"
                onClick={() => setActiveId(t._id)}
                className="w-full text-start rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-townwize-primaryDark px-4 py-3 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-400 font-mono">{t.ticketNo}</p>
                  <div className="flex items-center gap-2">
                    {unread > 0 && (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">{unread} reply</span>
                    )}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
                  </div>
                </div>
                <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{t.subject}</p>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">{t.category} · {formatTime(t.createdAt)}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SupportPage;
