// File: src/pages/passenger/Profile/Profile.jsx
import { useState, useContext, useEffect, useCallback } from "react";
import {
  FaUser,
  FaIdCard,
  FaHistory,
  FaWallet,
  FaCog,
  FaSignOutAlt,
  FaChevronRight,
  FaGift,
  FaCopy,
  FaShareAlt,
  FaUsers,
  FaTicketAlt,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { AuthContext } from "../../../contexts/AuthContextBase";
import { ThemeContext } from "../../../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { isNative } from "../../../utils/platform";
import api from "../../../services/api";

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

  const [referralData, setReferralData] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [guestInvites, setGuestInvites] = useState([]);
  const [guestSlotsRemaining, setGuestSlotsRemaining] = useState(6);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  const fetchReferral = useCallback(async () => {
    try {
      const [codeRes, couponsRes, invitesRes] = await Promise.all([
        api.get("/referral/my-code"),
        api.get("/coupons/my"),
        api.get("/referral/guest-invites"),
      ]);
      if (codeRes.data?.success) setReferralData(codeRes.data.data);
      if (couponsRes.data?.success) setCoupons(couponsRes.data.data.coupons || []);
      if (invitesRes.data?.success) {
        const d = invitesRes.data.data;
        setGuestInvites(d.invites || []);
        setGuestSlotsRemaining(d.slotsRemaining ?? 6);
      }
    } catch {
      // non-critical — silently ignore
    }
  }, []);

  useEffect(() => { fetchReferral(); }, [fetchReferral]);

  const handleCopyCode = () => {
    if (!referralData?.code) return;
    navigator.clipboard.writeText(referralData.inviteLink || referralData.code);
    toast.success("Referral link copied!");
  };

  const handleShareCode = async () => {
    if (!referralData?.inviteLink) return;
    if (navigator.share) {
      await navigator.share({ title: "Join Townwize", url: referralData.inviteLink, text: "Join me on Townwize!" });
    } else {
      handleCopyCode();
    }
  };

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);
    try {
      const res = await api.post("/referral/guest-invite");
      if (res.data?.success) {
        toast.success("GuestTowner invite code generated!");
        fetchReferral();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not generate invite");
    } finally {
      setGeneratingInvite(false);
    }
  };

  const tabs = [
    { key: "personal", label: "Personal Info", icon: <FaUser /> },
    { key: "verification", label: "Verification Docs", icon: <FaIdCard /> },
    { key: "history", label: "Ride History", icon: <FaHistory /> },
    { key: "referral", label: "Referral & Rewards", icon: <FaGift /> },
    { key: "wallet", label: "Wallet Balance", icon: <FaWallet /> },
    { key: "settings", label: "Settings", icon: <FaCog /> },
  ];

  // ─── Mobile (Capacitor) — settings-list style with accordion sections ────
  if (isNative()) {
    const handleLogout = () => {
      toast.info("Logging you out...", { autoClose: 800 });
      setTimeout(() => {
        logout();
        toast.success("You've been logged out safely.");
        navigate("/login");
      }, 900);
    };

    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
        {/* Profile header */}
        <div className="bg-townwize-primary px-5 pt-6 pb-6 space-y-4">
          <div className="flex items-center gap-4">
            <img
              src={
                user?.profilePicture ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=103139&color=fff&size=120`
              }
              alt="Avatar"
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20"
            />
            <div>
              <h2 className="text-lg font-bold text-white">{displayName}</h2>
              <p className="text-xs text-white/50 mt-0.5">{passengerId}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 bg-white/15 text-white rounded-full">
                  {user?.ridesCompleted || 0} rides
                </span>
                {user?.rating && (
                  <span className="text-[10px] px-2 py-0.5 bg-white/15 text-white rounded-full">
                    {user.rating} ⭐
                  </span>
                )}
                <span className="text-[10px] px-2 py-0.5 bg-green-500/30 text-green-200 rounded-full">
                  Verified Rider
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Accordion sections */}
        <div className="mt-3 bg-white dark:bg-gray-900 rounded-2xl mx-3 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
          {tabs.map((tab) => (
            <div key={tab.key}>
              <button
                onClick={() => setActiveTab(activeTab === tab.key ? null : tab.key)}
                className="w-full flex items-center justify-between px-5 py-4 touch-manipulation active:bg-gray-50 dark:active:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <span className="text-townwize-primary dark:text-townwize-accent">
                    {tab.icon}
                  </span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    {tab.label}
                  </span>
                </div>
                <FaChevronRight
                  className={`text-gray-300 dark:text-gray-600 text-xs transition-transform duration-200 ${
                    activeTab === tab.key ? "rotate-90" : ""
                  }`}
                />
              </button>

              {activeTab === tab.key && (
                <div className="px-5 pb-5 pt-1 bg-gray-50 dark:bg-gray-800/50">
                  {tab.key === "personal" && (
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <p><span className="font-medium">Name:</span> {displayName}</p>
                      <p><span className="font-medium">Phone:</span> {displayPhone}</p>
                      <p><span className="font-medium">Email:</span> {displayEmail}</p>
                    </div>
                  )}

                  {tab.key === "verification" && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Upload CNIC, BTK Proof, and Selfie Verification.
                      </p>
                      <button className="px-4 py-2.5 bg-townwize-primary text-white text-sm font-semibold rounded-xl">
                        Upload Documents
                      </button>
                    </div>
                  )}

                  {tab.key === "history" && (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-medium">
                              Precinct 01 → BTK Head Office
                            </span>
                            <span className="text-xs text-gray-400 shrink-0 ml-2">Oct 10</span>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="font-semibold text-green-600 dark:text-green-400 text-sm">
                              PKR 380
                            </span>
                            <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full">
                              Completed
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {tab.key === "referral" && (
                    <div className="rounded-2xl bg-white dark:bg-townwize-primaryDark border border-gray-100 dark:border-gray-700 overflow-hidden -mx-1">

                      {/* Hero: Code Card */}
                      <div className="bg-gradient-to-br from-townwize-primary to-townwize-primaryDark p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-[9px] font-bold text-white/50 uppercase tracking-[0.15em]">Refer a Towner</p>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-white/15 text-white/80 uppercase tracking-wide">For BTK residents</span>
                        </div>
                        <p className="text-[11px] text-white/65 mb-1.5 leading-relaxed">
                          Share with a <span className="text-white font-semibold">BTK resident</span> joining Townwize.
                        </p>
                        <div className="flex items-center gap-2 text-[10px] mb-4">
                          <span className="text-green-300 font-semibold">↑ You earn a discount</span>
                          <span className="text-white/30">·</span>
                          <span className="text-green-300 font-semibold">↑ They earn a discount</span>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3 mb-3">
                          <p className="text-[9px] text-white/50 uppercase tracking-widest mb-1.5">Your Referral Code</p>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-2xl font-black tracking-[0.1em] font-mono text-white">
                              {referralData?.code || "——"}
                            </span>
                            <div className="flex gap-1.5">
                              <button onClick={handleCopyCode} title="Copy"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[10px] font-semibold transition">
                                <FaCopy size={10} /> Copy
                              </button>
                              <button onClick={handleShareCode} title="Share"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[10px] font-semibold transition">
                                <FaShareAlt size={10} /> Share
                              </button>
                            </div>
                          </div>
                        </div>
                        {/* Stats strip */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-white/10 rounded-xl py-2 text-center">
                            <p className="text-lg font-black text-white">{referralData?.totalUses ?? 0}</p>
                            <p className="text-[9px] text-white/50 uppercase tracking-wide">Referred</p>
                          </div>
                          <div className="bg-white/10 rounded-xl py-2 text-center">
                            <p className="text-lg font-black text-white">{referralData?.rewardsEarned ?? 0}</p>
                            <p className="text-[9px] text-white/50 uppercase tracking-wide">Rewarded</p>
                          </div>
                          <div className="bg-white/10 rounded-xl py-2 text-center">
                            <p className="text-lg font-black text-yellow-300">{referralData?.pendingRewards ?? 0}</p>
                            <p className="text-[9px] text-white/50 uppercase tracking-wide">Pending</p>
                          </div>
                        </div>
                      </div>

                      {/* Discount Coupons */}
                      <div className="px-4 py-3.5 border-b border-gray-100 dark:border-gray-700/60">
                        <div className="flex items-center justify-between mb-2.5">
                          <p className="text-xs font-bold text-gray-900 dark:text-white">Discount Coupons</p>
                          {coupons.length > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                              {coupons.length} active
                            </span>
                          )}
                        </div>
                        {coupons.length === 0 ? (
                          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700">
                            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                              <FaTicketAlt className="text-gray-400" size={11} />
                            </div>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500">No coupons yet. Refer a Towner to earn one.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {coupons.map((c, i) => (
                              <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/60">
                                <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/60 flex items-center justify-center shrink-0">
                                  <FaTicketAlt className="text-green-600 dark:text-green-400" size={11} />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-green-700 dark:text-green-300">
                                    {c.discountPct}% off {c.type === "FARE_DISCOUNT" ? "next fare" : "commission"}
                                  </p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">Expires {new Date(c.expiresAt).toLocaleDateString()}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Guest Invites */}
                      <div className="px-4 py-3.5">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-bold text-gray-900 dark:text-white">Guest Invites</p>
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 uppercase tracking-wide">For Karachi friends</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                              {6 - guestSlotsRemaining}/6
                            </span>
                          </div>
                          {guestSlotsRemaining > 0 && (
                            <button
                              onClick={handleGenerateInvite}
                              disabled={generatingInvite}
                              className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg disabled:opacity-60 transition"
                            >
                              <FaUsers size={9} />
                              {generatingInvite ? "…" : "New Invite"}
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2.5 leading-relaxed">
                          Non-BTK residents — <span className="font-semibold text-gray-700 dark:text-gray-200">Karachi ↔ BTK only</span>. No rewards — you vouch for them.
                        </p>
                        {guestInvites.length === 0 ? (
                          <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/10 border border-dashed border-amber-200 dark:border-amber-800/40">
                            <p className="text-[11px] text-gray-400 dark:text-gray-500">No guest invites yet — up to 6 total.</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {guestInvites.map((inv, i) => (
                              <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/40">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-[9px] font-black flex items-center justify-center shrink-0">
                                    {i + 1}
                                  </span>
                                  <span className="font-mono font-bold text-xs text-gray-800 dark:text-gray-100 tracking-wider">{inv.code}</span>
                                  {inv.isUsed && (
                                    <span className="text-[9px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">✓</span>
                                  )}
                                </div>
                                {inv.isUsed ? (
                                  <span className="text-[10px] text-gray-400">{inv.usedAt ? new Date(inv.usedAt).toLocaleDateString() : "Used"}</span>
                                ) : (
                                  <button
                                    onClick={() => { navigator.clipboard.writeText(inv.inviteLink); toast.success("Invite link copied!"); }}
                                    className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 transition"
                                  >
                                    <FaCopy size={9} /> Copy
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {guestSlotsRemaining <= 0 && (
                          <p className="text-[10px] text-gray-400 mt-2">All 6 guest invite slots used.</p>
                        )}
                      </div>

                    </div>
                  )}

                  {tab.key === "wallet" && (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-townwize-primary text-white">
                        <p className="text-xs text-white/70">Current Balance</p>
                        <h4 className="text-2xl font-bold mt-1">
                          PKR {user?.walletBalance?.toLocaleString() || "0.00"}
                        </h4>
                      </div>
                      <button className="w-full py-3 bg-townwize-primary text-white text-sm font-semibold rounded-xl">
                        Add Funds
                      </button>
                    </div>
                  )}

                  {tab.key === "settings" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Dark Mode</span>
                        <button
                          onClick={toggleTheme}
                          className={`relative w-12 h-6 rounded-full transition-all ${
                            darkMode ? "bg-green-600" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                              darkMode ? "translate-x-6" : ""
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Logout row */}
        <div className="mt-3 bg-white dark:bg-gray-900 rounded-2xl mx-3 overflow-hidden mb-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-4 text-red-500 touch-manipulation active:bg-red-50 dark:active:bg-red-950"
          >
            <FaSignOutAlt />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>
    );
  }

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

        {activeTab === "referral" && (
          <div className="rounded-2xl bg-white dark:bg-townwize-primaryDark border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">

            {/* ── Hero: Referral Code Card ─────────────────────────────────── */}
            <div className="bg-gradient-to-br from-townwize-primary to-townwize-primaryDark p-6">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.15em]">Refer a Towner</p>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-white/80 uppercase tracking-wide">For BTK residents</span>
              </div>
              <p className="text-sm text-white/70 mb-2">
                Share with a <span className="text-white font-semibold">BTK resident</span> joining Townwize.
              </p>
              <div className="flex items-center gap-3 text-xs mb-5">
                <span className="flex items-center gap-1 text-green-300 font-semibold">
                  <span className="text-base leading-none">↑</span> You earn a discount
                </span>
                <span className="text-white/30">·</span>
                <span className="flex items-center gap-1 text-green-300 font-semibold">
                  <span className="text-base leading-none">↑</span> They earn a discount
                </span>
              </div>
              <div className="bg-white/10 rounded-2xl p-4 mb-4">
                <p className="text-[10px] text-white/50 uppercase tracking-widest mb-2">Your Referral Code</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-4xl font-black tracking-[0.12em] font-mono text-white">
                    {referralData?.code || "——"}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={handleCopyCode} title="Copy link"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition">
                      <FaCopy size={11} /> Copy
                    </button>
                    <button onClick={handleShareCode} title="Share"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition">
                      <FaShareAlt size={11} /> Share
                    </button>
                  </div>
                </div>
                {referralData?.inviteLink && (
                  <p className="text-[10px] text-white/35 font-mono mt-2 truncate">{referralData.inviteLink}</p>
                )}
              </div>
              {/* Stats strip */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/10 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-2xl font-black text-white">{referralData?.totalUses ?? 0}</p>
                  <p className="text-[10px] text-white/50 uppercase tracking-wide mt-0.5">Referred</p>
                </div>
                <div className="bg-white/10 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-2xl font-black text-white">{referralData?.rewardsEarned ?? 0}</p>
                  <p className="text-[10px] text-white/50 uppercase tracking-wide mt-0.5">Rewarded</p>
                </div>
                <div className="bg-white/10 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-2xl font-black text-yellow-300">{referralData?.pendingRewards ?? 0}</p>
                  <p className="text-[10px] text-white/50 uppercase tracking-wide mt-0.5">Pending</p>
                </div>
              </div>
            </div>

            {/* ── Discount Coupons ─────────────────────────────────────────── */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/60">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Discount Coupons</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Unlocked when your referral completes their first ride</p>
                </div>
                {coupons.length > 0 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                    {coupons.length} active
                  </span>
                )}
              </div>
              {coupons.length === 0 ? (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                    <FaTicketAlt className="text-gray-400" size={12} />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">No coupons yet. Refer a Towner to earn your first discount.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {coupons.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/60">
                      <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/60 flex items-center justify-center shrink-0">
                        <FaTicketAlt className="text-green-600 dark:text-green-400" size={13} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-green-700 dark:text-green-300">
                          {c.discountPct}% off {c.type === "FARE_DISCOUNT" ? "next fare" : "commission"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Expires {new Date(c.expiresAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Guest Invites ─────────────────────────────────────────────── */}
            <div className="px-6 py-5">
              <div className="flex items-start justify-between gap-4 mb-1">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Guest Invites</h3>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 uppercase tracking-wide">For Karachi friends</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      {6 - guestSlotsRemaining} / 6
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Non-BTK residents — <span className="font-semibold text-gray-700 dark:text-gray-200">Karachi ↔ BTK routes only</span>. No rewards — you vouch for them.
                  </p>
                </div>
                {guestSlotsRemaining > 0 && (
                  <button
                    onClick={handleGenerateInvite}
                    disabled={generatingInvite}
                    className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl disabled:opacity-60 transition shadow-sm"
                  >
                    <FaUsers size={10} />
                    {generatingInvite ? "…" : "New Invite"}
                  </button>
                )}
              </div>

              {guestInvites.length === 0 ? (
                <div className="flex items-center gap-3 p-3.5 mt-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/10 border border-dashed border-amber-200 dark:border-amber-800/40">
                  <p className="text-xs text-gray-400 dark:text-gray-500">No guest invites yet — you can invite up to 6 people.</p>
                </div>
              ) : (
                <div className="space-y-2 mt-3">
                  {guestInvites.map((inv, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/40">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-[10px] font-black flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="font-mono font-bold text-sm text-gray-800 dark:text-gray-100 tracking-wider">{inv.code}</span>
                        {inv.isUsed && (
                          <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">✓ Accepted</span>
                        )}
                      </div>
                      {inv.isUsed ? (
                        <span className="text-xs text-gray-400">{inv.usedAt ? new Date(inv.usedAt).toLocaleDateString() : "Used"}</span>
                      ) : (
                        <button
                          onClick={() => { navigator.clipboard.writeText(inv.inviteLink); toast.success("Invite link copied!"); }}
                          className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 transition"
                        >
                          <FaCopy size={10} /> Copy
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {guestSlotsRemaining <= 0 && (
                <p className="text-xs text-gray-400 mt-3">All 6 guest invite slots have been used.</p>
              )}
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
