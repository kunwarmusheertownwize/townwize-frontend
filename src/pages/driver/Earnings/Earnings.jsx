import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { fetchDriverEarnings } from "../../../api/driverApi";

const toMoney = (n) => `${Number(n || 0).toLocaleString()} PKR`;

const Earnings = () => {
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState({
    today: 0,
    week: 0,
    month: 0,
    breakdown: [],
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchDriverEarnings();
      setEarnings({
        today: Number(data?.today || 0),
        week: Number(data?.week || 0),
        month: Number(data?.month || 0),
        breakdown: Array.isArray(data?.breakdown) ? data.breakdown : [],
      });
    } catch {
      toast.error("Unable to load earnings right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto mt-8 px-4">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Earnings</h1>
          <p className="text-sm text-gray-500">Your income overview</p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-500">Loading earnings...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-white dark:bg-townwize-primaryDark rounded-xl shadow-sm">
              <p className="text-sm text-gray-500">Today</p>
              <p className="text-xl font-semibold">{toMoney(earnings.today)}</p>
            </div>
            <div className="p-4 bg-white dark:bg-townwize-primaryDark rounded-xl shadow-sm">
              <p className="text-sm text-gray-500">This Week</p>
              <p className="text-xl font-semibold">{toMoney(earnings.week)}</p>
            </div>
            <div className="p-4 bg-white dark:bg-townwize-primaryDark rounded-xl shadow-sm">
              <p className="text-sm text-gray-500">This Month</p>
              <p className="text-xl font-semibold">{toMoney(earnings.month)}</p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Recent Daily Breakdown</h2>

            {earnings.breakdown.length === 0 ? (
              <div className="text-gray-500 py-8">No completed trips yet.</div>
            ) : (
              <div className="space-y-3">
                {earnings.breakdown.map((row) => (
                  <div
                    key={row.date}
                    className="flex items-center justify-between p-4 bg-white dark:bg-townwize-primaryDark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
                  >
                    <div>
                      <p className="text-sm font-medium">{row.date}</p>
                      <p className="text-xs text-gray-500">{Number(row.trips || 0)} trips</p>
                    </div>
                    <div className="font-semibold">{toMoney(row.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Earnings;

