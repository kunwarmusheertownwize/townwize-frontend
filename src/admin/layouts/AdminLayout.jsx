// File: src/admin/layouts/AdminLayout.jsx

import { Outlet } from "react-router-dom";
import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminNavbar from "../../components/admin/AdminNavbar";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-townwize-primaryDark">
      {/* Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Admin Top Bar */}
        <AdminNavbar onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
