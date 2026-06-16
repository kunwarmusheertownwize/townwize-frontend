// File: townwize-frontend/src/admin/layouts/AdminSidebar.jsx

import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/admin", label: "Dashboard", end: true },

  { to: "/admin/rides", label: "Rides" },
  { to: "/admin/cases", label: "Cases" },
  { to: "/admin/drivers", label: "Drivers" },
  { to: "/admin/passengers", label: "Passengers" },
  { to: "/admin/support", label: "Support" },
  { to: "/admin/notifications", label: "Notifications" },

  { to: "/admin/finance", label: "Finance" },
  { to: "/admin/finance/transactions", label: "Transactions" },
  { to: "/admin/finance/payouts", label: "Payouts" },

  { to: "/admin/settings/users", label: "Admin Users" },
  { to: "/admin/settings/features", label: "Feature Flags" },
  { to: "/admin/settings/zones", label: "Zones" },
  { to: "/admin/settings/pricing", label: "Pricing" },
  { to: "/admin/settings/cancellation", label: "Cancellation Policy" },

  { to: "/admin/audit", label: "Audit" },
];

export default function AdminSidebar({ isOpen = false, onClose = () => {} }) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
        />
      )}

      <aside
        className={[
          "fixed md:static inset-y-0 left-0 z-50 md:z-auto",
          "w-64 shrink-0 bg-white dark:bg-townwize-primary border-r border-gray-200 dark:border-gray-700",
          "transform transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
        ].join(" ")}
      >
        <div className="p-5 font-bold text-lg text-townwize-primary dark:text-white">
          Townwize Admin
        </div>

        <nav className="flex flex-col gap-1 px-3 pb-4 overflow-y-auto h-[calc(100vh-84px)]">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition
               ${
                 isActive
                   ? "bg-townwize-primary !text-white"
                   : "text-gray-700 dark:text-gray-300 hover:!text-white hover:bg-townwize-primary dark:hover:bg-gray-700"
               }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
