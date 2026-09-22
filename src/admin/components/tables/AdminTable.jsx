export default function AdminTable({
    columns,
    data,
    onRowClick,
    footer,
}) {
    return (
        <div className="overflow-x-auto bg-white dark:bg-townwize-primary rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-townwize-primaryDark sticky top-0 z-10">
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className="px-4 py-3 text-start font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="p-8">
                                {footer}
                            </td>
                        </tr>
                    ) : (
                        data.map((row, idx) => (
                            <tr
                                key={idx}
                                onClick={() => onRowClick?.(row)}
                                className={`border-t border-gray-100 dark:border-gray-700
                  ${onRowClick ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" : ""}`}
                            >
                                {columns.map((col) => (
                                    <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                                        {col.render ? col.render(row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
