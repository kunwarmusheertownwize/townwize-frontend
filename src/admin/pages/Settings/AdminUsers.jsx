import { useEffect, useState } from "react";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import { fetchAdminUsers, updateAdminUser } from "../../../api/adminApi";

export default function AdminUsers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const json = await fetchAdminUsers({ q: query, page: String(page), limit: "20" });
      setItems(json?.data?.items || []);
      setMeta({
        page: json?.data?.page || 1,
        totalPages: json?.data?.totalPages || 1,
        total: json?.data?.total || 0,
      });
    } catch (e) {
      setError(e?.message || "Failed to load admin users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [query, page]);

  const patchUser = async (userId, patch, okText) => {
    setSavingId(userId);
    setError("");
    setMessage("");
    try {
      await updateAdminUser(userId, patch);
      setMessage(okText);
      await load();
    } catch (e) {
      setError(e?.message || "Failed to update admin user");
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="dark:text-white text-xl font-semibold">Admin Users</h1>

      {message ? <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-gray-800 dark:text-white dark:border-gray-600">{message}</div> : null}
      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-gray-800 dark:text-white dark:border-gray-600">{error}</div> : null}

      <div className="bg-white dark:bg-gray-900 dark:bg-townwize-primary rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <input
          value={query}
          onChange={(e) => {
            setPage(1);
            setQuery(e.target.value);
          }}
          placeholder="Search admin email"
          className="w-full md:w-[420px] border rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
        />
      </div>

      <div className="overflow-x-auto bg-white dark:bg-gray-900 dark:bg-townwize-primary rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 dark:bg-townwize-primaryDark">
            <tr>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Admin Level</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Updated</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                  Loading admin users...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8">
                  <EmptyState title="No admin users found" description="No records match your search." />
                </td>
              </tr>
            ) : (
              items.map((row, idx) => (
                <tr key={row._id || idx} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-4 py-3">{row.email || "-"}</td>
                  <td className="px-4 py-3">{row.role || "admin"}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded border px-2 py-1 text-xs"
                      value={row.adminLevel || "reviewer"}
                      disabled={savingId === row._id}
                      onChange={(e) => patchUser(row._id, { adminLevel: e.target.value }, `Admin level updated for ${row.email}.`)}
                    >
                      <option value="reviewer">Reviewer</option>
                      <option value="supervisor">Supervisor</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status || "-"} />
                  </td>
                  <td className="px-4 py-3">{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "-"}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded border px-2 py-1 text-xs"
                      value={row.status || "active"}
                      disabled={savingId === row._id}
                      onChange={(e) => patchUser(row._id, { status: e.target.value }, `Status updated for ${row.email}.`)}
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="blocked">Blocked</option>
                      <option value="banned">Banned</option>
                    </select>
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
