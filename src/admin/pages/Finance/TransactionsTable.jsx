import { useEffect, useState } from "react";
import EmptyState from "../../components/common/EmptyState";
import { fetchFinanceTransactions } from "../../../api/adminApi";

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
      <h1 className="text-xl font-semibold">Transactions</h1>
      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <select className="rounded-md border px-3 py-2 text-sm" value={type} onChange={(e) => { setPage(1); setType(e.target.value); }}>
            <option value="all">All Types</option>
            <option value="ride">Ride</option>
            <option value="refund">Refund</option>
          </select>
          <input className="w-full rounded-md border px-3 py-2 text-sm md:w-96" placeholder="Search transactions" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Txn ID</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Ride</th>
              <th className="px-4 py-3 text-left">Driver</th>
              <th className="px-4 py-3 text-left">Gross</th>
              <th className="px-4 py-3 text-left">Tax</th>
              <th className="px-4 py-3 text-left">Platform Fee</th>
              <th className="px-4 py-3 text-left">Commission</th>
              <th className="px-4 py-3 text-left">Townwize Revenue</th>
              <th className="px-4 py-3 text-left">Driver Earning</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-10 text-center text-gray-500" colSpan={12}>Loading...</td></tr>
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
        <div className="flex items-center gap-2">
          <button className="rounded border px-3 py-1 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <span>Page {meta.page} / {meta.totalPages}</span>
          <button className="rounded border px-3 py-1 disabled:opacity-50" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
