import { useMemo } from "react";
import { useAuth } from "../../../hooks/useAuth";

export default function Account() {
  const { user } = useAuth();

  const rows = useMemo(
    () => [
      { label: "Name", value: user?.name || "-" },
      { label: "Email", value: user?.email || "-" },
      { label: "Phone", value: user?.phone || "-" },
      { label: "Role", value: user?.role || "passenger" },
      { label: "Status", value: user?.status || "-" },
      { label: "Email Verified", value: user?.emailVerified ? "Yes" : "No" },
    ],
    [user]
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold text-townwize-primary">Account</h1>
      <div className="bg-white dark:bg-townwize-primaryDark rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((row) => (
            <div key={row.label} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">{row.label}</p>
              <p className="mt-1 text-sm font-medium break-words">{row.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
