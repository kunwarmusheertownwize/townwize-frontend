// 📄 src/layouts/DriverLayout.jsx

import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/shared/Navbar";
import { toast } from "react-toastify";
import { FaFacebookF, FaTwitter, FaInstagram } from "react-icons/fa";
import { useDriverMode } from "../contexts/useDriverMode";
import { DRIVER_MODES } from "../contexts/driverModes";
import GlobalIncomingRequest from "../components/driver/GlobalIncomingRequest";
import api from "../services/api";


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
        }

        setDriverEligibility({
          registrationComplete,
          documentsSubmitted,
          verificationStatus: vehicleVerification,
          conditionStatus,
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

      setDriverMode(DRIVER_MODES.OFFLINE);
      navigate("/driver/profile", { replace: true });
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

          sessionStorage.setItem("activeDriverTrip", JSON.stringify(activeTrip));
          setDriverMode(DRIVER_MODES.ACTIVE_TRIP);

          if (location.pathname !== "/driver/live-tracking") {
            navigate("/driver/live-tracking", {
              replace: true,
              state: { request: activeTrip },
            });
          }
          return;
        }

        sessionStorage.removeItem("activeDriverTrip");
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

    const activeTrip = sessionStorage.getItem("activeDriverTrip");

    // ACTIVE TRIP always wins
    if (activeTrip) {
      if (driverMode !== DRIVER_MODES.ACTIVE_TRIP) {
        setDriverMode(DRIVER_MODES.ACTIVE_TRIP);
      }
      if (location.pathname !== "/driver/live-tracking") {
        navigate("/driver/live-tracking", { replace: true });
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

    const activeTrip = sessionStorage.getItem("activeDriverTrip");

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


      {/* Footer */}
      <footer className="footer mt-12 w-full">
        <div>
          {/* Logo → always back to Landing */}
          <Link to="/" className="inline-block mx-16">
            <img
              src="/images/logo-dark.png"
              alt="Townwize Logo"
              className="h-15 footer-logo"
            />
          </Link>

          <div className="container mx-auto px-6 max-w-6xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
              {/* Drive */}
              <div>
                <h4 className="font-semibold mb-3">Drive</h4>
                <ul className="space-y-2">
                  <li>
                    <Link to="/driver/home" className="link-secondary">
                      Driver Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link to="/driver/earnings" className="link-secondary">
                      Earnings Overview
                    </Link>
                  </li>
                  <li>
                    <Link to="/driver/safety" className="link-secondary">
                      Safety Standards
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Community */}
              <div>
                <h4 className="font-semibold mb-3">Community</h4>
                <ul className="space-y-2">
                  <li>
                    <Link to="/about" className="link-secondary">
                      About Townwize
                    </Link>
                  </li>
                  <li>
                    <Link to="/community" className="link-secondary">
                      Driver Stories
                    </Link>
                  </li>
                  <li>
                    <Link to="/careers" className="link-secondary">
                      Careers
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Help */}
              <div>
                <h4 className="font-semibold mb-3">Help & Support</h4>
                <ul className="space-y-2">
                  <li>
                    <Link to="/driver/support" className="link-secondary">
                      Driver Support
                    </Link>
                  </li>
                  <li>
                    <Link to="/driver/faqs" className="link-secondary">
                      FAQs
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Social */}
              <div>
                <h4 className="font-semibold mb-3">Stay Connected</h4>
                <ul className="flex space-x-4">
                  <li>
                    <a
                      href="https://facebook.com/townwize"
                      aria-label="Facebook"
                      className="link-secondary"
                    >
                      <FaFacebookF />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://twitter.com/townwize"
                      aria-label="Twitter"
                      className="link-secondary"
                    >
                      <FaTwitter />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://instagram.com/townwize"
                      aria-label="Instagram"
                      className="link-secondary"
                    >
                      <FaInstagram />
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <hr className="border-gray-300 mt-10 w-full" />
            <div className="text-center text-gray-400 text-xs mt-2 w-full">
              © {new Date().getFullYear()} Townwize. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DriverLayout;

