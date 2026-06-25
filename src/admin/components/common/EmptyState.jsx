export default function EmptyState({ title, description }) {
    return (
        <div className="text-center text-gray-500 dark:text-gray-400 py-10">
            <p className="font-semibold">{title}</p>
            {description && (
                <p className="text-sm mt-1">{description}</p>
            )}
        </div>
    );
}
