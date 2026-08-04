// townwize-frontend/src/layouts/PassengerLayout.jsx

import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/shared/Navbar";
import api from "../services/api";
import MobilePassengerLayout from "./MobilePassengerLayout";
import { isNative } from "../utils/platform";
import { getSocket } from "../hooks/useRideSocket";

const ACTIVE_RIDE_STATUSES = new Set([
  "REQUESTED",
  "DRIVER_ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "ON_TRIP",
]);

const PassengerLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const authRaw = localStorage.getItem("auth");
    if (!authRaw) return;

    let auth;
    try {
      auth = JSON.parse(authRaw);
    } catch {
      localStorage.removeItem("auth");
      return;
    }

    if (!auth?.user || auth.user.role !== "passenger") return;

    const rideId = localStorage.getItem("activePassengerRideId");
    if (!rideId) return;

    const verifyActiveRide = async () => {
      try {
        const res = await api.get(`/rides/${rideId}`);
        if (cancelled) return;

        const ride = res?.data?.data;
        if (!ACTIVE_RIDE_STATUSES.has(ride?.status)) {
          localStorage.removeItem("activePassengerRideId");
          return;
        }

        if (!location.pathname.startsWith("/passenger/live-tracking")) {
          navigate(`/passenger/live-tracking/${rideId}`, { replace: true });
        }
      } catch (err) {
        if (cancelled) return;
        if ([400, 404].includes(err?.response?.status)) {
          localStorage.removeItem("activePassengerRideId");
        }
      }
    };

    verifyActiveRide();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate]);

  // Keep the passenger in their own socket room for the whole session.
  // useRideSocket only joins on ride-related pages, so without this the
  // passenger would miss live notifications while on Profile, Trips, etc.
  useEffect(() => {
    let auth;
    try { auth = JSON.parse(localStorage.getItem("auth")); } catch { /* no-op */ }
    const userId = auth?.user?.id;
    if (!userId || auth?.user?.role !== "passenger") return;

    const socket = getSocket();
    const joinRoom = () => socket.emit("join", `passenger:${userId}`);

    if (!socket.connected) socket.connect();
    joinRoom();
    socket.on("connect", joinRoom); // re-join after a reconnect

    return () => {
      socket.off("connect", joinRoom);
    };
  }, []);

  if (isNative()) {
    return <MobilePassengerLayout />;
  }

  const isMapPage = location.pathname === "/passenger/select-ride";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-townwize-primaryDark text-gray-900 dark:text-white">
      {!isMapPage && (
        <div className="passenger-layout-navbar">
          <Navbar />
        </div>
      )}
      <main className={isMapPage ? "flex-grow" : "passenger-layout-main flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"}>
        <Outlet />
      </main>
      {/* The marketing footer used to render here — logo, "Community",
          "About Townwize", social icons — below every signed-in screen. A
          passenger mid-booking is already a customer; on a phone it was a
          screenful of scrolling past the thing they came for, and apps that
          end in a marketing footer read as websites with a login. Uber, Careem
          and Bolt all end at the working content.

          Terms, Privacy, Refunds and support contact moved to the account
          screen (AppLegalLinks) — the footer was their only route from inside
          the app, and Play and payment providers both check they are
          reachable. */}
    </div>
  );
};

export default PassengerLayout;
