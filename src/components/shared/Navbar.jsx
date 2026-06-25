
//src/components/shared/Navbar.jsx

import React, { useState, useEffect, useRef } from "react";

import { FaSun, FaMoon, FaUserCircle, FaChevronDown, FaBell } from "react-icons/fa";
import { useTheme } from "../../hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { FaBars } from "react-icons/fa";
import { useLocation } from "react-router-dom";
// 
import AdminNavbar from "../admin/AdminNavbar";
//
import { useLanguage } from "../../hooks/useLanguage";
import LanguageModal from "../common/LanguageModal";

import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import api from "../../services/api";
import { getSocket } from "../../hooks/useRideSocket";


const Navbar = () => {

  const location = useLocation();
  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  // Hooks & Contexts
  const { darkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
 /*  console.log("NAVBAR STATE", {
    user,
    isAuthenticated: !!user,
  }); */

  const isAuthenticated = !!user;

  let variant = "public";

  if (isAuthenticated && user?.role === "driver") {
    variant = "driver";
  } else if (isAuthenticated && user?.role === "passenger") {
    variant = "passenger";
  }
  else if (isAuthenticated && user?.role === "admin") {
    variant = "admin"
  }

  const navigate = useNavigate();

  // Notification unread count
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadIntervalRef = useRef(null);

  useEffect(() => {
    if (!user || (user.role !== "passenger" && user.role !== "driver")) return;

    const fetchCount = () => {
      api.get("/notifications/unread-count")
        .then((res) => setUnreadCount(res?.data?.data?.count || 0))
        .catch(() => {});
    };

    fetchCount();
    unreadIntervalRef.current = setInterval(fetchCount, 60000);

    // Real-time: increment badge when a notification arrives via socket
    const socket = getSocket();
    const onNew = () => setUnreadCount((c) => c + 1);
    socket.on("notification:new", onNew);

    return () => {
      clearInterval(unreadIntervalRef.current);
      socket.off("notification:new", onNew);
    };
  }, [user]);

  const notifPath = user?.role === "driver" ? "/driver/notifications" : "/passenger/notifications";

  const handleBellClick = () => {
    setUnreadCount(0);
    handleNav(notifPath);
  };

  // Dropdown States
  const [aboutOpen, setAboutOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  // Mobile Menu State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Helper to Close Mobile Menu
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setAboutOpen(false);
    setAccountOpen(false);
  };

  // Language Context
  const { language } = useLanguage();
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const { t } = useTranslation();

  // keep language in sync with i18n
  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  const handleLogoClick = () => {
    if (user?.role === "driver") {
      navigate("/driver/home");
      return;
    }

    if (user?.role === "passenger") {
      navigate("/passenger/home");
      return;
    }
    if (user?.role === "admin") {
      return <AdminNavbar />;
    }

    navigate("/"); // logged out
  };

  // Handlers
  const handleNav = (path) => navigate(path);
  // Logout Handler
  const handleLogout = () => {
    logout();
    setAccountOpen(false);
    navigate("/");
  };

  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-white dark:bg-townwize-primaryDark  dark:border-gray-700 dark:shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* LEFT — Logo + Center Nav */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-2 group cursor-pointer"
            >

              <img
                src={darkMode ? "/images/logo-light.png" : "/images/logo-dark.png"}
                alt="Townwize Logo"
                className="h-9 w-auto transition-transform duration-300 group-hover:scale-105"
              />
            </button>

            {/* Center Nav */}
            <div className="hidden md:flex items-center gap-6 text-sm font-medium">

              {/* PASSENGER MENU */}
              {variant === "passenger" && (
                <>
                  <button
                    onClick={() => handleNav("/passenger/home")}
                    className={`transition cursor-pointer ${location.pathname.startsWith("/passenger")
                      ? "text-townwize-primary dark:text-townwize-accent font-semibold"
                      : "text-gray-700 dark:text-gray-300 hover:text-townwize-primary dark:hover:text-townwize-accent"
                      }`}

                  >
                    {t("ride")}
                  </button>

                  <button
                    onClick={() => handleNav("/driver/register")}
                    className="text-gray-700 dark:text-gray-300 hover:text-townwize-primary dark:hover:text-townwize-accent transition cursor-pointer"
                  >
                    {t("drive")}
                  </button>

                  <button
                    onClick={() => handleNav("/passenger/scheduled-rides")}
                    className={`transition cursor-pointer ${isActive("/passenger/scheduled-rides")
                      ? "text-townwize-primary dark:text-townwize-accent font-semibold"
                      : "text-gray-700 dark:text-gray-300 hover:text-townwize-primary dark:hover:text-townwize-accent"
                    }`}
                  >
                    Scheduled
                  </button>

                  {/* About Dropdown (UNCHANGED) */}
                  <div className="relative">
                    <button
                      onClick={() => setAboutOpen(!aboutOpen)}
                      className="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-townwize-primary dark:hover:text-townwize-accent transition cursor-pointer"
                    >
                      {t("about")} <FaChevronDown className="text-xs mt-[1px] ms-1" />
                    </button>

                    {aboutOpen && (
                      <div
                        onMouseLeave={() => setAboutOpen(false)}
                        className={`absolute ${document.documentElement.dir === "rtl" ? "right-0" : "left-0"} mt-2 w-48 bg-white dark:bg-gray-800 shadow-xl rounded-lg py-2 border border-gray-100 dark:border-gray-700`}
                      >
                        {[
                          { label: t("aboutTownwize"), path: "/about" },
                          { label: t("offerings"), path: "/offerings" },
                          { label: t("howItWorks"), path: "/how-it-works" },
                          { label: t("communityStories"), path: "/community" },
                          { label: t("careers"), path: "/careers" },
                        ].map((item) => (
                          <button
                            key={item.path}
                            onClick={() => {
                              handleNav(item.path);
                              setAboutOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* DRIVER MENU */}
              {variant === "driver" && (
                <>
                  <button
                    onClick={() => handleNav("/driver/home")}
                    className={`transition cursor-pointer ${isActive("/driver/home")
                      ? "text-townwize-primary dark:text-townwize-accent font-semibold"
                      : "text-gray-700 dark:text-gray-300 hover:text-townwize-primary dark:hover:text-townwize-accent"
                      }`}
                  >
                    Dashboard
                  </button>

                  <button
                    onClick={() => handleNav("/driver/trips")}
                    className={`transition cursor-pointer ${isActive("/driver/trips")
                      ? "text-townwize-primary dark:text-townwize-accent font-semibold"
                      : "text-gray-700 dark:text-gray-300 hover:text-townwize-primary dark:hover:text-townwize-accent"
                      }`}
                  >
                    Trips
                  </button>

                  <button
                    onClick={() => handleNav("/driver/earnings")}
                    className={`transition cursor-pointer ${isActive("/driver/earnings")
                      ? "text-townwize-primary dark:text-townwize-accent font-semibold"
                      : "text-gray-700 dark:text-gray-300 hover:text-townwize-primary dark:hover:text-townwize-accent"
                      }`}
                  >
                    Earnings
                  </button>

                </>
              )}
            </div>

          </div>

          {/* RIGHT — Language, Help, Profile, Theme */}
          <div className="flex items-center gap-3 text-sm font-medium">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
              aria-label="Open menu"
            >
              <FaBars className="text-xl" />
            </button>

            {/* Notification bell — passenger & driver only */}
            {user && (user.role === "passenger" || user.role === "driver") && (
              <button
                onClick={handleBellClick}
                className="relative hidden md:flex items-center justify-center p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
                aria-label="Notifications"
              >
                <FaBell className="text-lg" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => handleNav("/help")}
              className="hidden md:block text-gray-700 dark:text-gray-300 hover:text-townwize-primary dark:hover:text-townwize-accent transition cursor-pointer"
            >
              {t("help")}
            </button>


            {/* Account Dropdown */}
            <div className="relative hidden md:block">
              {!user ? (
                <>
                  <button
                    onClick={() => {
                      handleNav("/login");
                      setAccountOpen(false);
                    }}
                    className="text-gray-700 dark:text-gray-300 hover:text-townwize-primary dark:hover:text-townwize-accent transition cursor-pointer"
                  >
                    {t("login")}
                  </button>
                  <button
                    onClick={() => {
                      handleNav("/register");
                      setAccountOpen(false);
                    }}
                    className="ml-4 px-4 py-2 mr-3 rounded-lg items-center bg-townwize-primary text-white text-sm font-medium hover:opacity-90 transition cursor-pointer"
                  >
                    {t("register")}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setAccountOpen(!accountOpen)}
                    className="flex items-center gap-1"
                  >
                    <FaUserCircle className="text-2xl text-gray-700 dark:text-gray-300 me-1" />
                    <FaChevronDown className="text-xs mt-[1px] text-gray-700 dark:text-gray-300" />
                  </button>

                  {accountOpen && (
                    <div
                      onMouseLeave={() => setAccountOpen(false)}
                      className={`absolute ${document.documentElement.dir === "rtl" ? "left-0" : "right-0"} mt-2 w-48 bg-white dark:bg-gray-800 shadow-xl rounded-lg py-2 border border-gray-100 dark:border-gray-700`}
                    >
                      {/* PASSENGER ACCOUNT MENU */}
                      {variant === "passenger" && (
                        <>
                          {[
                            { label: t("dashboard"), path: "/passenger/dashboard" },
                            { label: t("rideHistory"), path: "/passenger/trips" },
                            { label: t("wallet"), path: "/passenger/wallet" },
                            { label: "Profile & Referral", path: "/passenger/profile" },
                            { label: t("account"), path: "/passenger/account" },
                            { label: t("settings"), path: "/passenger/settings" },
                            { label: "Support", path: "/passenger/support" },
                          ].map((item) => (
                            <button
                              key={item.path}
                              onClick={() => {
                                handleNav(item.path);
                                setAccountOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm transition cursor-pointer ${isActive(item.path)
                                ? "bg-gray-100 dark:bg-gray-700 font-semibold"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </>
                      )}

                      {/* DRIVER ACCOUNT MENU */}
                      {variant === "driver" && (
                        <>
                          {[
                            { label: "Profile", path: "/driver/profile" },
                            { label: "Earnings", path: "/driver/earnings" },
                            { label: "Settings", path: "/driver/settings" },
                          ].map((item) => (
                            <button
                              key={item.path}
                              onClick={() => {
                                handleNav(item.path);
                                setAccountOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm transition cursor-pointer ${isActive(item.path)
                                ? "bg-gray-100 dark:bg-gray-700 font-semibold"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </>
                      )}

                      <hr className="my-1 border-gray-200 dark:border-gray-700" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                      >
                        {t("logout")}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            <button
              onClick={() => setLanguageModalOpen(true)}
              className="hidden md:block bg-townwize-primary/60 hover:bg-townwize-primary text-townwize-textContent px-3 py-2 rounded-lg dark:text-gray-300 hover:text-townwize-textContent dark:hover:text-townwize-accent transition cursor-pointer"
            >
              {language === "en" ? "EN" : "اردو"}
            </button>




            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="hidden md:flex items-center justify-center p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
            >
              {darkMode ? <FaSun /> : <FaMoon />}
            </button>

          </div>
        </div>

        {/* Mobile Menu Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={closeMobileMenu}
              aria-hidden
            />

            {/* Panel */}
            <div className="relative bg-white dark:bg-townwize-primaryDark shadow-xl">
              <div className="px-4 py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Menu
                </span>
                <button
                  onClick={closeMobileMenu}
                  className="text-sm text-townwize-primary dark:text-townwize-accent"
                >
                  Close
                </button>
              </div>

              <div className="px-4 py-3 space-y-2">

                {/* PASSENGER MOBILE MENU */}
                {variant === "passenger" && (
                  <>
                    <button
                      onClick={() => {
                        handleNav("/passenger/home");
                        closeMobileMenu();
                      }}
                      className={`w-full text-left px-3 py-3 rounded-lg transition cursor-pointer ${isActive("/passenger/home")
                        ? "bg-gray-100 dark:bg-gray-700 font-semibold text-townwize-primary dark:text-townwize-accent"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                        }`}
                    >
                      {t("ride")}
                    </button>


                  </>
                )}

                {/* DRIVER MOBILE MENU */}
                {variant === "driver" && (
                  <>
                    <button
                      onClick={() => {
                        handleNav("/driver/home");
                        closeMobileMenu();
                      }}
                      className={`w-full text-left px-3 py-3 rounded-lg transition ${isActive("/driver/home")
                        ? "bg-gray-100 dark:bg-gray-700 font-semibold text-townwize-primary dark:text-townwize-accent"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                    >
                      Dashboard
                    </button>

                    <button
                      onClick={() => {
                        handleNav("/driver/trips");
                        closeMobileMenu();
                      }}
                      className={`w-full text-left px-3 py-3 rounded-lg transition ${isActive("/driver/trips")
                        ? "bg-gray-100 dark:bg-gray-700 font-semibold text-townwize-primary dark:text-townwize-accent"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                    >
                      Trips
                    </button>

                    <button
                      onClick={() => {
                        handleNav("/driver/earnings");
                        closeMobileMenu();
                      }}
                      className={`w-full text-left px-3 py-3 rounded-lg transition ${isActive("/driver/earnings")
                        ? "bg-gray-100 dark:bg-gray-700 font-semibold text-townwize-primary dark:text-townwize-accent"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                    >
                      Earnings
                    </button>
                  </>
                )}

                {/* About */}
                <button
                  onClick={() => setAboutOpen(!aboutOpen)}
                  className="w-full text-left px-3 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t("about")}
                </button>

                {aboutOpen && (
                  <div className="ml-3 space-y-1">
                    {[
                      { label: t("aboutTownwize"), path: "/about" },
                      { label: t("offerings"), path: "/offerings" },
                      { label: t("howItWorks"), path: "/how-it-works" },
                      { label: t("communityStories"), path: "/community" },
                      { label: t("careers"), path: "/careers" },
                    ].map((item) => (
                      <button
                        key={item.path}
                        onClick={() => {
                          handleNav(item.path);
                          closeMobileMenu();
                        }}
                        className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Help */}
                <button
                  onClick={() => {
                    handleNav("/help");
                    closeMobileMenu();
                  }}
                  className="w-full text-left px-3 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t("help")}
                </button>

                <hr className="border-gray-200 dark:border-gray-700" />

                {/* Auth */}
                {!user ? (
                  <>
                    <button
                      onClick={() => {
                        handleNav("/login");
                        closeMobileMenu();
                      }}
                      className="w-full text-left px-3 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {t("login")}
                    </button>
                    <button
                      onClick={() => {
                        handleNav("/register");
                        closeMobileMenu();
                      }}
                      className="w-full text-left px-3 py-3 rounded-lg bg-townwize-primary text-white"
                    >
                      {t("register")}
                    </button>
                  </>
                ) : (
                  <>
                    {/* PASSENGER ACCOUNT */}
                    {variant === "passenger" && (
                      <>
                        {[
                          //{ label: t("dashboard"), path: "/passenger/dashboard" },
                          { label: t("rideHistory"), path: "/passenger/trips" },
                          { label: "Profile & Referral", path: "/passenger/profile" },
                          { label: t("account"), path: "/passenger/account" },
                          { label: t("settings"), path: "/passenger/settings" },
                          { label: "Support", path: "/passenger/support" },
                          { label: t("drive"), path: "/driver/register" },
                        ].map((item) => (
                          <button
                            key={item.path}
                            onClick={() => {
                              handleNav(item.path);
                              closeMobileMenu();
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition cursor-pointer ${isActive(item.path)
                              ? "bg-gray-100 dark:bg-gray-700 font-semibold"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </>
                    )}

                    {/* DRIVER ACCOUNT */}
                    {variant === "driver" && (
                      <>
                        {[
                          { label: "Dashboard", path: "/driver/home" },
                          { label: "Profile", path: "/driver/profile" },
                          { label: "Earnings", path: "/driver/earnings" },
                          { label: "Support", path: "/driver/support" },
                          { label: "Settings", path: "/driver/settings" },
                        ].map((item) => (
                          <button
                            key={item.path}
                            onClick={() => {
                              handleNav(item.path);
                              closeMobileMenu();
                            }}
                            className="w-full text-left px-3 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            {item.label}
                          </button>
                        ))}
                      </>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {t("logout")}
                    </button>
                  </>
                )}

                <hr className="border-gray-200 dark:border-gray-700" />

                {/* Language + Theme */}
                <div className="flex items-center justify-end gap-4 px-3 py-4">
                  {/* Language */}
                  <button
                    onClick={() => setLanguageModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-townwize-primary/80 text-white font-semibold"
                  >
                    {language === "en" ? "EN" : "اردو"}
                  </button>

                  {/* Theme */}
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"

                    aria-label="Toggle Theme"
                  >
                    {darkMode ? <FaSun /> : <FaMoon />}
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}
      </nav>

      <LanguageModal
        open={languageModalOpen}
        onClose={() => setLanguageModalOpen(false)}
      />
    </>
  );

};

export default Navbar;
