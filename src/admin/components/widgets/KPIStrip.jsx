export default function KPIStrip({ items = [] }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {items.map((item, idx) => (
                <div
                    key={idx}
                    className="bg-white dark:bg-townwize-primary rounded-xl border border-gray-200 dark:border-gray-700 p-4"
                >
                    <div className="text-xs text-gray-500 mb-1">
                        {item.label}
                    </div>
                    <div className="text-lg font-bold">
                        {item.value}
                    </div>
                </div>
            ))}
        </div>
    );
}
