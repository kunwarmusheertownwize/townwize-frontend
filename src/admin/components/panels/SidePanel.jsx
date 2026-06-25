export default function SidePanel({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />

      <aside className="w-full md:w-[42%] md:min-w-[380px] bg-white dark:bg-townwize-primary dark:text-white shadow-xl p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="dark:text-white font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            ×
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}
