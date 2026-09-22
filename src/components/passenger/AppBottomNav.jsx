import { NavLink } from "react-router-dom";
import { FiHome, FiMap, FiBell, FiUser } from "react-icons/fi";

const linkBase =
    "flex flex-col items-center justify-center text-xs gap-1";
const active =
    "text-townwize-primary font-semibold";
const inactive =
    "text-gray-500 dark:text-gray-400";

export default function AppBottomNav() {
    return (
        <nav className="fixed bottom-0 start-0 end-0 w-screen z-50 bg-white dark:bg-townwize-bgDark border-t border-gray-200 dark:border-gray-700">

            <div className="max-w-6xl mx-auto grid grid-cols-4 h-16">
                <NavLink
                    to="/app/passenger/dashboard"
                    className={({ isActive }) =>
                        `${linkBase} ${isActive ? active : inactive}`
                    }
                >
                    <FiHome size={20} />
                    <span>Home</span>
                </NavLink>

                <NavLink
                    to="/app/passenger/select-ride"
                    className={({ isActive }) =>
                        `${linkBase} ${isActive ? active : inactive}`
                    }
                >
                    <FiMap size={20} />
                    <span>Ride</span>
                </NavLink>

                <NavLink
                    to="/app/passenger/notifications"
                    className={({ isActive }) =>
                        `${linkBase} ${isActive ? active : inactive}`
                    }
                >
                    <FiBell size={20} />
                    <span>Alerts</span>
                </NavLink>

                <NavLink
                    to="/app/passenger/profile"
                    className={({ isActive }) =>
                        `${linkBase} ${isActive ? active : inactive}`
                    }
                >
                    <FiUser size={20} />
                    <span>Profile</span>
                </NavLink>
            </div>
        </nav>
    );
}
