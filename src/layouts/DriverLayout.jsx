// 📄 src/layouts/DriverLayout.jsx

import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/shared/Navbar";
import { toast } from "react-toastify";
import { FaFacebookF, FaTwitter, FaInstagram, FaHome, FaHistory, FaMoneyBillWave, FaUser } from "react-icons/fa";
import { useDriverMode } from "../contexts/useDriverMode";
import { DRIVER_MODES } from "../contexts/driverModes";
import GlobalIncomingRequest from "../components/driver/GlobalIncomingRequest";
import api from "../services/api";
import { isNative } from "../utils/platform";


const SAFE_PATHS = [
  "/driver/trips",
  "/driver/earnings",
];

const DriverLayout = ({ title }) => {
  const hasWarnedRef = useRef(false);
  const [driverStateChecked, setDriverStateChecked] = useState(false);

  const { driverMode, setDriverMode, driverEligibility, setDriverEligibility } = useDriverMode();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    const syncEligibility = async () => {
      try {
        const res = await api.get("/driver/me");
        if (!mounted) return;

        const p = res?.data?.data?.profile || {};
        const vehicleVerification = String(p?.vehicle?.verification?.status || "PENDING").toUpperCase();
        const conditionStatus = String(p?.vehicle?.conditionStatus || "pending").toLowerCase();

        const documentsSubmitted = Boolean(
          p?.residency?.proofUrl &&
            p?.residency?.btkIdFrontUrl &&
            p?.residency?.btkIdBackUrl &&
            p?.vehicle?.vehicleRegUrl &&
            p?.vehicle?.licenseFrontUrl &&
            p?.vehicle?.licenseBackUrl &&
            p?.identity?.cnicFrontUrl &&
            p?.identity?.cnicBackUrl &&
            p?.faceVerification?.selfieUrl
        );

        const registrationComplete = Boolean(
          p?.phone &&
            p?.vehicle?.type &&
            p?.vehicle?.number &&
            p?.vehicle?.color
        );

        let blockedReason = null;
        if (vehicleVerification === "REJECTED") {
          blockedReason =
            p?.vehicle?.verification?.remarks || "Vehicle verification rejected by admin.";
        } else if (conditionStatus === "fail") {
          blockedReason = "Vehicle condition check failed. Please update vehicle evidence.";
        } else if (conditionStatus === "needs_recheck") {
          blockedReason = "Vehicle requires recheck. Please upload updated condition photos.";
        } else if (vehicleVerification !== "APPROVED") {
          blockedReason = "Vehicle verification is pending approval.";
        } else if (conditionStatus !== "pass") {
          blockedReason = "Vehicle condition review is pending.";
        } else if (p?.hasMTag !== true) {
          // Last in the chain, so a driver is told the bigger problems first and
          // only meets this once everything else is approved. Mirrors the
          // server's getGoOnlineBlock — if these two disagree, the app says one
          // thing and the API says another.
          const mTagStatus = String(p?.mTag?.verification?.status || "").toUpperCase();
          const mTagRemarks = String(p?.mTag?.verification?.remarks || "").trim();
          if (mTagStatus === "REJECTED") {
            blockedReason = mTagRemarks
              ? "M-Tag photo rejected: " + mTagRemarks
              : "M-Tag photo was rejected. Please upload a clear photo.";
          } else if (p?.mTag?.photoUrl) {
            blockedReason = "M-Tag photo is awaiting admin review.";
          } else {
            blockedReason = "Upload a photo of the M-Tag on your windscreen to go online.";
          }
        }

        setDriverEligibility({
          registrationComplete,
          documentsSubmitted,
          verificationStatus: vehicleVerification,
          conditionStatus,
          hasMTag: p?.hasMTag === true,
          blockedReason,
        });
      } catch {
        // Keep last-known eligibility from context/localStorage if API has transient issues.
      }
    };

    syncEligibility();
    return () => {
      mounted = false;
    };
  }, [setDriverEligibility]);

  // 🔒 Eligibility enforcement
  useEffect(() => {
    const {
      registrationComplete,
      documentsSubmitted,
      verificationStatus,
      blockedReason,
    } = driverEligibility;

    const isDriverArea = location.pathname.startsWith("/driver");
    const isProfilePage = location.pathname.startsWith("/driver/profile");

    if (!isDriverArea || isProfilePage) return;

    if (
      !registrationComplete ||
      !documentsSubmitted ||
      verificationStatus !== "APPROVED"
    ) {
      if (!hasWarnedRef.current) {
        toast.error(
          verificationStatus === "REJECTED"
            ? blockedReason || "Verification failed. Update your profile."
            : "Complete verification before using driver features."
        );
        hasWarnedRef.current = true;
      }

      // Keep them offline but don't force-redirect — Home.jsx blocks going online,
      // and drivers should still be able to view their dashboard, trips, and earnings.
      setDriverMode(DRIVER_MODES.OFFLINE);
    }
  }, [driverEligibility, location.pathname, setDriverMode, navigate]);


  useEffect(() => {
    if (!location.pathname.startsWith("/driver")) return;
    if (location.pathname.startsWith("/driver/profile")) {
      setDriverStateChecked(true);
      return;
    }

    let mounted = true;

    const syncActiveRide = async () => {
      try {
        const res = await api.get("/driver/active-ride");
        if (!mounted) return;

        const activeRide = res?.data?.data;
        const activeStatuses = ["DRIVER_ASSIGNED", "EN_ROUTE", "ARRIVED", "ON_TRIP"];

        if (activeRide?.rideId && activeStatuses.includes(String(activeRide.status).toUpperCase())) {
          const activeTrip = {
            rideId: activeRide.rideId,
            status: activeRide.status,
            pickup: activeRide.pickup?.address || activeRide.pickup,
            dropoff: activeRide.dropoff?.address || activeRide.dropoff,
            rideType: activeRide.rideType,
            fare: activeRide.fare,
            distanceKm: activeRide.distanceKm,
            etaMinutes: activeRide.etaMinutes,
          };

          localStorage.setItem("activeDriverTrip", JSON.stringify(activeTrip));
          setDriverMode(DRIVER_MODES.ACTIVE_TRIP);

          if (location.pathname !== "/driver/live-tracking") {
            navigate("/driver/live-tracking", {
              replace: true,
              state: { request: activeTrip },
            });
          }
          return;
        }

        localStorage.removeItem("activeDriverTrip");
        if (driverMode === DRIVER_MODES.ACTIVE_TRIP) {
          setDriverMode(DRIVER_MODES.ONLINE_IDLE);
        }
      } catch {
        // Keep local state if this transiently fails.
      } finally {
        if (mounted) setDriverStateChecked(true);
      }
    };

    syncActiveRide();

    return () => {
      mounted = false;
    };
  }, [driverMode, location.pathname, navigate, setDriverMode]);
  // ♻️ Recovery & route enforcement after refresh
  useEffect(() => {
    if (!location.pathname.startsWith("/driver")) return;
    if (!driverStateChecked) return;

    const activeTrip = localStorage.getItem("activeDriverTrip");

    // ACTIVE TRIP always wins
    if (activeTrip) {
      if (driverMode !== DRIVER_MODES.ACTIVE_TRIP) {
        setDriverMode(DRIVER_MODES.ACTIVE_TRIP);
      }
      if (location.pathname !== "/driver/live-tracking") {
        navigate("/driver/live-tracking", { replace: true, state: { request: JSON.parse(activeTrip) } });
      }
      return;
    }

    // Incoming / idle drivers must stay on trip-requests
    if (
      (driverMode === DRIVER_MODES.INCOMING_REQUEST ||
        driverMode === DRIVER_MODES.ONLINE_IDLE) &&
      location.pathname !== "/driver/trip-requests"
    ) {
      navigate("/driver/trip-requests", { replace: true });
      return;
    }

    // Offline drivers go home
    // Offline drivers: restrict ONLY live / request flows
    if (
      driverMode === DRIVER_MODES.OFFLINE &&
      ["/driver/live-tracking", "/driver/trip-requests"].includes(location.pathname)
    ) {
      navigate("/driver/home", { replace: true });
    }

  }, [driverMode, driverStateChecked, location.pathname, navigate, setDriverMode]);


  // 🚦 Route warnings
  // 🚦 Route warnings
  useEffect(() => {
    if (SAFE_PATHS.includes(location.pathname)) return;

    const activeTrip = localStorage.getItem("activeDriverTrip");

    // ❌ Do NOT warn if trip is already persisted (refresh-safe)
    if (
      driverMode === DRIVER_MODES.ACTIVE_TRIP &&
      !activeTrip &&
      location.pathname !== "/driver/live-tracking"
    ) {
      toast.info("Trip in progress — return to the trip to continue.");
    }

    if (
      driverMode === DRIVER_MODES.INCOMING_REQUEST &&
      location.pathname !== "/driver/trip-requests"
    ) {
      toast.info("Incoming request waiting for your response.");
    }
  }, [driverMode, location.pathname]);

  // ─── Mobile (Capacitor) — bottom tab bar, no Navbar/footer ───────────────
  if (isNative()) {
    const DRIVER_FULLSCREEN = ["/driver/live-tracking", "/driver/trip-requests"];
    const showDriverTabs = !DRIVER_FULLSCREEN.some((p) => location.pathname.startsWith(p));

    const driverTabs = [
      { label: "Home",     icon: FaHome,         path: "/driver/home" },
      { label: "Trips",    icon: FaHistory,      path: "/driver/trips" },
      { label: "Earnings", icon: FaMoneyBillWave, path: "/driver/earnings" },
      { label: "Profile",  icon: FaUser,         path: "/driver/profile" },
    ];

    return (
      <div
        className="fixed inset-0 flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <GlobalIncomingRequest />
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{
            paddingBottom: showDriverTabs
              ? "calc(64px + env(safe-area-inset-bottom, 0px))"
              : "env(safe-area-inset-bottom, 0px)",
          }}
        >
          <Outlet />
        </div>

        {showDriverTabs && (
          <nav
            className="fixed bottom-0 start-0 end-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div className="flex h-16">
              {driverTabs.map(({ label, icon: Icon, path }) => {
                const active =
                  location.pathname === path ||
                  location.pathname.startsWith(path + "/");
                return (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className="relative flex-1 flex flex-col items-center justify-center gap-[3px] touch-manipulation active:scale-95 transition-transform duration-100 outline-none select-none"
                  >
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

  return (
    <div className="min-h-full bg-gray-100 dark:bg-townwize-bgDark text-gray-900 dark:text-white">
      {/* ✅ FULL-WIDTH NAVBAR */}
      <Navbar variant="driver" />
      {/* 🚦 DRIVER STATUS INDICATOR */}
      <div className="w-full border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-2">
          <span
            className={[
              "inline-block w-2.5 h-2.5 rounded-full",
              driverMode === DRIVER_MODES.ACTIVE_TRIP
                ? "bg-blue-500"
                : driverMode === DRIVER_MODES.ONLINE_IDLE ||
                  driverMode === DRIVER_MODES.INCOMING_REQUEST
                  ? "bg-green-500"
                  : "bg-gray-400",
            ].join(" ")}
          />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {driverMode === DRIVER_MODES.ACTIVE_TRIP && "On Trip"}
            {driverMode === DRIVER_MODES.INCOMING_REQUEST && "Incoming Request"}
            {driverMode === DRIVER_MODES.ONLINE_IDLE && "Online"}
            {driverMode === DRIVER_MODES.OFFLINE && "Offline"}
          </span>
        </div>
      </div>

      {title && (
        <div className="w-full p-4 text-lg font-bold">
          {title}
        </div>
      )}
      <main className="max-w-6xl mx-auto px-4 py-2 space-y-6">
        <GlobalIncomingRequest />
        <Outlet />
      </main>


      {/* The marketing footer rendered here — logo, Drive/Community columns,
          social links — below every signed-in driver screen. A Wizer waiting
          for a request does not need a link to About Townwize; on a phone it
          was a screenful of scrolling past the Go Online button, and an app
          that ends in a marketing footer reads as a website with a login.
          Uber, Careem and inDrive all end at the working content.

          Terms, Privacy, Refunds and support contact moved to the account
          screen (AppLegalLinks): this footer was their only route from inside
          the app, and Play and payment providers both check they are
          reachable. */}
    </div>
  );
};

export default DriverLayout;

