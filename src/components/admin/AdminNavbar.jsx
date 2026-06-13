// townwize-frontend\src\components\admin\AdminNavbar.jsx
import { FaUserShield } from "react-icons/fa";
import { HiOutlineMenu } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function AdminNavbar({ onOpenSidebar = () => {} }) {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <nav className="sticky top-0 z-50 w-full bg-white dark:bg-townwize-primaryDark border-b border-gray-200 dark:border-gray-700">
            <div className="w-full px-4 md:px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        aria-label="Open sidebar"
                        onClick={onOpenSidebar}
                        className="md:hidden inline-flex items-center justify-center p-2 rounded border border-gray-200 text-gray-700"
                    >
                        <HiOutlineMenu className="text-lg" />
                    </button>
                    <FaUserShield className="text-townwize-primary text-xl" />
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                        Townwize Administration
                    </span>
                </div>

                <button
                    onClick={handleLogout}
                    className="text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                    Logout
                </button>
            </div>
        </nav>
    );
}
