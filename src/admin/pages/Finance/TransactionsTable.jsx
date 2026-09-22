import { useEffect, useState } from "react";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";
import { fetchFinanceTransactions } from "../../../api/adminApi";

const exportCsv = (rows) => {
  const headers = ["Date", "Txn ID", "Type", "Ride ID", "Driver", "Gross (PKR)", "Tax (PKR)", "Platform Fee (PKR)", "Commission (PKR)", "Townwize Revenue (PKR)", "Driver Earning (PKR)", "Status"];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "-",
        r.id || r._id || "-",
        r.type || "-",
        r.ride || "-",
        r.driver || "-",
        r.gross || 0,
        r.tax || 0,
        r.platformFee || 0,
        r.commission || 0,
        r.townwizeRevenue || 0,
        r.driverEarning ?? r.net ?? 0,
        r.status || "-",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `townwize-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export default function TransactionsTable() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const json = await fetchFinanceTransactions({ q, type, page: String(page), limit: "20" });
        if (!mounted) return;
        setItems(json?.data?.items || []);
        setMeta({
          page: json?.data?.page || 1,
          totalPages: json?.data?.totalPages || 1,
          total: json?.data?.total || 0,
        });
      } catch (e) {
        if (!mounted) return;
        setError(e.message || "Failed to load transactions");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => (mounted = false);
  }, [q, type, page]);

  const money = (n) => `${Number(n || 0).toLocaleString()} PKR`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="dark:text-white text-xl font-semibold">Transactions</h1>
        <button
          onClick={() => exportCsv(items)}
          disabled={items.length === 0}
          className="rounded-lg border border-townwize-primary px-3 py-1.5 text-sm font-medium text-townwize-primary hover:bg-townwize-primary hover:text-white disabled:opacity-40 transition-colors"
        >
          Export CSV
        </button>
      </div>
      <div className="rounded-xl border bg-white dark:bg-gray-900 p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <select className="rounded-md border px-3 py-2 text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600" value={type} onChange={(e) => { setPage(1); setType(e.target.value); }}>
            <option value="all">All Types</option>
            <option value="ride">Ride</option>
            <option value="refund">Refund</option>
          </select>
          <input className="w-full rounded-md border px-3 py-2 text-sm md:w-96 dark:bg-gray-800 dark:text-white dark:border-gray-600" placeholder="Search transactions" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-start">Txn ID</th>
              <th className="px-4 py-3 text-start">Type</th>
              <th className="px-4 py-3 text-start">Ride</th>
              <th className="px-4 py-3 text-start">Driver</th>
              <th className="px-4 py-3 text-start">Gross</th>
              <th className="px-4 py-3 text-start">Tax</th>
              <th className="px-4 py-3 text-start">Platform Fee</th>
              <th className="px-4 py-3 text-start">Commission</th>
              <th className="px-4 py-3 text-start">Townwize Revenue</th>
              <th className="px-4 py-3 text-start">Driver Earning</th>
              <th className="px-4 py-3 text-start">Status</th>
              <th className="px-4 py-3 text-start">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-10 text-center text-gray-500 dark:text-gray-400" colSpan={12}>Loading...</td></tr>
            ) : error ? (
              <tr><td className="px-4 py-10 text-center text-red-600" colSpan={12}>{error}</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="p-8" colSpan={12}><EmptyState title="No transactions found" description="Try adjusting filters" /></td></tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="px-4 py-3">{it.id}</td>
                  <td className="px-4 py-3">{it.type}</td>
                  <td className="px-4 py-3">{it.ride}</td>
                  <td className="px-4 py-3">{it.driver}</td>
                  <td className="px-4 py-3">{money(it.gross)}</td>
                  <td className="px-4 py-3">{money(it.tax)}</td>
                  <td className="px-4 py-3">{money(it.platformFee)}</td>
                  <td className="px-4 py-3">{money(it.commission)}</td>
                  <td className="px-4 py-3">{money(it.townwizeRevenue)}</td>
                  <td className="px-4 py-3">{money(it.driverEarning ?? it.net)}</td>
                  <td className="px-4 py-3">{it.status}</td>
                  <td className="px-4 py-3">{it.createdAt ? new Date(it.createdAt).toLocaleString() : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span>Total: {meta.total}</span>
        <Pagination page={page} totalPages={meta.totalPages} onPage={setPage} />
      </div>
    </div>
  );
}
