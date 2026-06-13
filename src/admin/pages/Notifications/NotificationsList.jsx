import { useEffect, useState } from "react";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import {
  createNotification,
  fetchNotifications,
  updateNotification,
} from "../../../api/adminApi";

const defaultDraft = {
  channel: "in_app",
  audienceType: "all",
  audienceValue: "",
  subject: "",
  body: "",
  publishNow: false,
};

export default function NotificationsList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState("all");
  const [audienceType, setAudienceType] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [draft, setDraft] = useState(defaultDraft);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const json = await fetchNotifications({
        q: query,
        status,
        channel,
        audienceType,
        page: String(page),
        limit: "20",
      });
      setItems(json?.data?.items || []);
      setMeta({
        page: json?.data?.page || 1,
        totalPages: json?.data?.totalPages || 1,
        total: json?.data?.total || 0,
      });
    } catch (e) {
      setError(e?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [query, status, channel, audienceType, page]);

  const onCreate = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await createNotification({
        ...draft,
        subject: draft.subject.trim(),
        body: draft.body.trim(),
        audienceValue: draft.audienceValue.trim(),
      });
      setDraft(defaultDraft);
      setMessage(draft.publishNow ? "Notification published." : "Draft notification created.");
      await load();
    } catch (e) {
      setError(e?.message || "Failed to create notification");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (id, action) => {
    try {
      setError("");
      setMessage("");
      await updateNotification(id, { action });
      if (action === "publish") setMessage("Notification published.");
      if (action === "cancel") setMessage("Notification cancelled.");
      if (action === "retry") setMessage("Notification moved to pending retry.");
      await load();
    } catch (e) {
      setError(e?.message || "Action failed");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Notifications</h1>

      {message ? <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div> : null}
      {error ? <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="bg-white dark:bg-townwize-primary rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <h2 className="text-sm font-semibold">Create Notification</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select className="border rounded-md px-3 py-2 text-sm" value={draft.channel} onChange={(e) => setDraft((p) => ({ ...p, channel: e.target.value }))}>
            <option value="in_app">In-App</option>
            <option value="push">Push</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          <select className="border rounded-md px-3 py-2 text-sm" value={draft.audienceType} onChange={(e) => setDraft((p) => ({ ...p, audienceType: e.target.value }))}>
            <option value="all">All Users</option>
            <option value="passenger">Passengers</option>
            <option value="driver">Drivers</option>
            <option value="admin">Admins</option>
            <option value="user">Single User</option>
          </select>
          <input
            className="border rounded-md px-3 py-2 text-sm"
            placeholder={draft.audienceType === "user" ? "User email or ID" : "Optional audience value"}
            value={draft.audienceValue}
            onChange={(e) => setDraft((p) => ({ ...p, audienceValue: e.target.value }))}
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.publishNow} onChange={(e) => setDraft((p) => ({ ...p, publishNow: e.target.checked }))} />
            Publish now
          </label>
        </div>
        <input
          className="w-full border rounded-md px-3 py-2 text-sm"
          placeholder="Subject"
          value={draft.subject}
          onChange={(e) => setDraft((p) => ({ ...p, subject: e.target.value }))}
        />
        <textarea
          rows={3}
          className="w-full border rounded-md px-3 py-2 text-sm"
          placeholder="Message body"
          value={draft.body}
          onChange={(e) => setDraft((p) => ({ ...p, body: e.target.value }))}
        />
        <button
          className="px-3 py-2 rounded-md bg-townwize-primary text-white text-sm disabled:opacity-50"
          disabled={saving || !draft.subject.trim() || !draft.body.trim() || (draft.audienceType === "user" && !draft.audienceValue.trim())}
          onClick={onCreate}
        >
          {saving ? "Saving..." : draft.publishNow ? "Create & Publish" : "Create Draft"}
        </button>
      </div>

      <div className="bg-white dark:bg-townwize-primary rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={query}
            onChange={(e) => {
              setPage(1);
              setQuery(e.target.value);
            }}
            placeholder="Search by recipient, subject, status"
            className="w-full md:w-96 border rounded-md px-3 py-2 text-sm"
          />
          <select
            value={channel}
            onChange={(e) => {
              setPage(1);
              setChannel(e.target.value);
            }}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Channels</option>
            <option value="in_app">In-App</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="push">Push</option>
          </select>
          <select
            value={audienceType}
            onChange={(e) => {
              setPage(1);
              setAudienceType(e.target.value);
            }}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Audience</option>
            <option value="passenger">Passengers</option>
            <option value="driver">Drivers</option>
            <option value="admin">Admins</option>
            <option value="user">Single User</option>
          </select>
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="PENDING">Pending</option>
            <option value="SENT">Sent</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-townwize-primary rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-townwize-primaryDark">
            <tr>
              <th className="px-4 py-3 text-left">Channel</th>
              <th className="px-4 py-3 text-left">Subject</th>
              <th className="px-4 py-3 text-left">Audience</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-10 text-center text-gray-500" colSpan={6}>
                  Loading notifications...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8">
                  <EmptyState title="No notifications found" description="No records match your search." />
                </td>
              </tr>
            ) : (
              items.map((row, idx) => (
                <tr key={row._id || row.id || idx} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-4 py-3">{row.channel || "-"}</td>
                  <td className="px-4 py-3 max-w-[280px] whitespace-normal break-words">
                    <div className="font-medium">{row.subject || "-"}</div>
                    <div className="text-xs text-gray-500">{row.body || ""}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{row.audienceType || "user"}</div>
                    <div className="text-xs text-gray-500">{row.audienceValue || row.to || "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status || "-"} />
                  </td>
                  <td className="px-4 py-3">{row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {["DRAFT", "PENDING", "FAILED"].includes(String(row.status || "").toUpperCase()) ? (
                        <button className="px-2 py-1 border rounded text-xs" onClick={() => runAction(row._id, "publish")}>
                          Publish
                        </button>
                      ) : null}
                      {String(row.status || "").toUpperCase() !== "CANCELLED" ? (
                        <button className="px-2 py-1 border rounded text-xs" onClick={() => runAction(row._id, "cancel")}>
                          Cancel
                        </button>
                      ) : null}
                      {String(row.status || "").toUpperCase() === "FAILED" ? (
                        <button className="px-2 py-1 border rounded text-xs" onClick={() => runAction(row._id, "retry")}>
                          Retry
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>Total: {meta.total}</span>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </button>
          <span>
            Page {meta.page} / {meta.totalPages}
          </span>
          <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
