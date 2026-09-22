// File: src/components/common/ProfileTabs.jsx
import React from "react";

export default function ProfileTabs({ tabs, activeTab, onChange }) {
  return (
    <div className="flex flex-wrap gap-3 mb-6 border-b border-gray-200 dark:border-gray-700 pb-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`relative flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all duration-200
            ${activeTab === t.key
              ? "text-townwize-primary dark:text-townwize-accent bg-transparent"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
        >
          {t.icon}
          {t.label}
          {activeTab === t.key && (
            <span className="absolute bottom-0 start-2 end-0 h-[2px] bg-townwize-primary rounded-full"></span>
          )}
        </button>
      ))}
    </div>
  );
}
