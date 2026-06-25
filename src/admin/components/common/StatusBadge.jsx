const COLORS = {
    active: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    verified: "bg-blue-100 text-blue-700",
    suspended: "bg-red-100 text-red-700",
    flagged: "bg-red-100 text-red-700",
    open: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    closed: "bg-gray-100 text-gray-700",
    escalated: "bg-purple-100 text-purple-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    requested: "bg-blue-100 text-blue-700",
    driver_assigned: "bg-indigo-100 text-indigo-700",
    en_route: "bg-indigo-100 text-indigo-700",
    arrived: "bg-teal-100 text-teal-700",
    on_trip: "bg-purple-100 text-purple-700",
    completed: "bg-green-100 text-green-700",
    canceled: "bg-red-100 text-red-700",
    cancelled: "bg-red-100 text-red-700",
};

const prettify = (status) =>
    String(status || "")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (ch) => ch.toUpperCase());

export default function StatusBadge({ status }) {
    const key = status?.toLowerCase();
    const color = COLORS[key] || "bg-gray-100 text-gray-600";

    return (
        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${color}`}>
            {prettify(status) || "-"}
        </span>
    );
}
