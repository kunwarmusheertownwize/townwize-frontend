// File: src/pages/passenger/Profile/Profile.jsx
import { useState, useContext } from "react";
import {
  FaUser,
  FaIdCard,
  FaHistory,
  FaWallet,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { AuthContext } from "../../../contexts/AuthContextBase";
import { ThemeContext } from "../../../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const [activeTab, setActiveTab] = useState("personal");
  const { user, logout } = useContext(AuthContext);
  const { darkMode, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const displayName = user?.name || "Guest User";
  const displayEmail = user?.email || "Not available";
  const displayPhone = user?.phone || "Not available";
  const passengerId = user?._id
    ? `#TW-${user._id.slice(-5).toUpperCase()}`
    : "#TW-00000";

  const tabs = [
    { key: "personal", label: "Personal Info", icon: <FaUser /> },
    { key: "verification", label: "Verification Docs", icon: <FaIdCard /> },
    { key: "history", label: "Ride History", icon: <FaHistory /> },
    { key: "wallet", label: "Wallet Balance", icon: <FaWallet /> },
    { key: "settings", label: "Settings", icon: <FaCog /> },
  ];

  return (
    <div className="w-full px-4 sm:px-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6 text-townwize-primary dark:text-white">
        My Profile
      </h2>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-6 mb-8 bg-white dark:bg-townwize-primaryDark border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
        {/* Avatar + Info */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-center text-center sm:text-left w-full sm:w-auto">
          <img
            src={
              user?.profilePicture ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                displayName
              )}&background=103139&color=fff&size=120`
            }
            alt="Avatar"
            className="w-24 h-24 rounded-2xl shadow-md object-cover"
          />
          <div>
            <h3 className="text-xl font-semibold text-townwize-primary dark:text-white">
              {displayName}
            </h3>
            <p className="text-gray-500 dark:text-gray-300 text-sm mb-2">
              Passenger ID {passengerId}
            </p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 text-xs">
              <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full">
                Verified Rider
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                {user?.ridesCompleted || 0} Rides
              </span>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 rounded-full">
                {user?.rating || "—"} ⭐ Rating
              </span>
            </div>
          </div>
        </div>

        {/* Wallet Summary (hide on mobile) */}
        <div className="hidden sm:flex flex-col items-end text-right">
          <p className="text-sm text-gray-500 dark:text-gray-300">
            Wallet Balance
          </p>
          <h4 className="text-2xl font-bold text-townwize-primary dark:text-townwize-accent">
            PKR {user?.walletBalance?.toLocaleString() || "0.00"}
          </h4>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center sm:justify-start gap-4 border-b border-gray-200 dark:border-gray-700 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`relative flex items-center gap-2 px-1 pb-3 font-medium text-sm sm:text-base transition-colors duration-200
        ${activeTab === t.key
                ? "text-townwize-primary dark:text-townwize-accent"
                : "text-gray-600 dark:text-gray-300 hover:text-townwize-primary dark:hover:text-townwize-accent"
              }`}
          >
            {t.icon}
            {t.label}
            {activeTab === t.key && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-townwize-primary dark:bg-townwize-accent rounded-full"></span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fadeIn space-y-6">
        {activeTab === "personal" && (
          <div className="p-6 rounded-2xl bg-white dark:bg-townwize-primaryDark border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-2 mb-3">
              <FaUser className="text-townwize-primary dark:text-townwize-accent text-lg" />
              <h3 className="text-lg font-semibold text-townwize-primary dark:text-white">
                Personal Information
              </h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-y-1.5 text-sm">
              <p className="text-gray-700 dark:text-gray-200">
                <span className="font-medium">Name:</span> {displayName}
              </p>
              <p className="text-gray-700 dark:text-gray-200">
                <span className="font-medium">Phone:</span> {displayPhone}
              </p>
              <p className="text-gray-700 dark:text-gray-200 sm:col-span-2">
                <span className="font-medium">Email:</span> {displayEmail}
              </p>
            </div>
          </div>
        )}

        {activeTab === "verification" && (
          <div className="p-6 rounded-2xl bg-white dark:bg-townwize-primaryDark border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
            <h3 className="text-lg font-semibold mb-2 text-townwize-primary dark:text-white">
              Verification Documents
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Upload CNIC, BTK Proof, and Selfie Verification.
            </p>
            <button className="px-5 py-2.5 bg-townwize-primary text-white rounded-xl hover:bg-townwize-primaryDark transition">
              Upload Documents
            </button>
          </div>
        )}

        {activeTab === "history" && (
          <div className="p-6 rounded-2xl bg-white dark:bg-townwize-primaryDark border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
            <h3 className="text-lg font-semibold mb-3 text-townwize-primary dark:text-white">
              Recent Rides
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow transition-all"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-townwize-primary dark:text-white">
                      Precinct 01 → BTK Head Office
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Oct 10 • 10:45 AM
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-300">
                    Distance • 8.5 km · Duration • 16 min
                  </p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      PKR 380
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full">
                      Completed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "wallet" && (
          <div className="p-6 rounded-2xl bg-white dark:bg-townwize-primaryDark border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
            <h3 className="text-lg font-semibold mb-3 text-townwize-primary dark:text-white">
              Wallet Overview
            </h3>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-townwize-primary border border-gray-200 dark:border-gray-700 shadow-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Current Balance
                </p>
                <h4 className="text-2xl font-bold text-townwize-primary dark:text-townwize-accent">
                  PKR {user?.walletBalance?.toLocaleString() || "0.00"}
                </h4>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Updated just now
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-townwize-primary border border-gray-200 dark:border-gray-700 shadow-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Last Transaction
                </p>
                <h4 className="text-lg font-semibold text-green-600 dark:text-green-400">
                  PKR -350 · Ride Fare
                </h4>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Oct 9 · 12:45 PM
                </p>
              </div>
            </div>
            <div className="text-center mt-6">
              <button className="px-5 py-2.5 bg-townwize-primary text-white rounded-xl hover:bg-townwize-primaryDark transition">
                Add Funds
              </button>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="p-6 rounded-2xl bg-white dark:bg-townwize-primaryDark border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 space-y-6">
            <h3 className="text-lg font-semibold mb-2 text-townwize-primary dark:text-white">
              Settings
            </h3>
            <hr className="border-gray-200 dark:border-gray-700 my-2" />
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Dark Mode
              </span>
              <button
                onClick={toggleTheme}
                className={`relative w-12 h-6 rounded-full transition-all ${darkMode ? "bg-green-600" : "bg-gray-300"
                  }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${darkMode ? "translate-x-6" : ""
                    }`}
                />
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  toast.info("Logging you out...", { autoClose: 800 });
                  setTimeout(() => {
                    logout();
                    toast.success("You’ve been logged out safely.");
                    navigate("/login");
                  }, 900);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                <FaSignOutAlt /> Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
