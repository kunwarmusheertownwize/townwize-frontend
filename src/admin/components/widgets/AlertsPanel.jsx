export default function AlertsPanel({ alerts = [] }) {
    return (
        <div className="bg-white dark:bg-townwize-primary rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-4">Critical Alerts</h3>

            {alerts.length === 0 ? (
                <p className="text-sm text-gray-500">No active alerts</p>
            ) : (
                <ul className="space-y-3 text-sm">
                    {alerts.map((a, idx) => (
                        <li
                            key={idx}
                            className={`flex items-center justify-between p-3 rounded-lg
                ${a.level === "high"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-yellow-50 text-yellow-700"
                                }`}
                        >
                            <span>{a.text}</span>
                            <span className="text-xs font-semibold uppercase">
                                {a.level}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
