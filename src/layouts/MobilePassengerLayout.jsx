import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { FaHome, FaHistory, FaHeadset, FaUser } from "react-icons/fa";

const TABS = [
  { label: "Home",    icon: FaHome,    path: "/passenger/home" },
  { label: "Rides",   icon: FaHistory, path: "/passenger/trips" },
  { label: "Support", icon: FaHeadset, path: "/passenger/support" },
  { label: "Profile", icon: FaUser,    path: "/passenger/profile" },
];

// Pages that own the full screen — no tab bar, no top padding
const FULLSCREEN_ROUTES = [
  "/passenger/live-tracking",
  "/passenger/select-ride",
  "/passenger/booking",
  "/passenger/trip-request",
  "/passenger/ride-together",
];

export default function MobilePassengerLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const showTabs = !FULLSCREEN_ROUTES.some((p) => location.pathname.startsWith(p));

  return (
    <div
      className="fixed inset-0 flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {/* Scrollable content — bottom padding reserves space for the tab bar */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{
          paddingBottom: showTabs
            ? "calc(64px + env(safe-area-inset-bottom, 0px))"
            : "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <Outlet />
      </div>

      {/* Bottom tab bar */}
      {showTabs && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="flex h-16">
            {TABS.map(({ label, icon: Icon, path }) => {
              const active =
                location.pathname === path ||
                location.pathname.startsWith(path + "/");

              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="relative flex-1 flex flex-col items-center justify-center gap-[3px] touch-manipulation active:scale-95 transition-transform duration-100 outline-none select-none"
                >
                  {/* Active indicator bar */}
                  {active && (
                    <span className="absolute top-0 w-8 h-[3px] rounded-b-full bg-townwize-accent" />
                  )}

                  <Icon
                    size={active ? 23 : 21}
                    className={`transition-colors duration-150 ${
                      active
                        ? "text-townwize-accent"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  />

                  <span
                    className={`text-[10px] font-semibold tracking-wide transition-colors duration-150 ${
                      active
                        ? "text-townwize-accent"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
