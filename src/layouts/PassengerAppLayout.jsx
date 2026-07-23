// src/layouts/PassengerAppLayout.jsx

import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { getSocket } from "../hooks/useRideSocket";

const ACTIVE_RIDE_STATUSES = new Set([
  "REQUESTED",
  "DRIVER_ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "ON_TRIP",
]);

export default function PassengerAppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
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

        if (
          location.pathname.startsWith("/passenger") &&
          !location.pathname.startsWith("/passenger/live-tracking")
        ) {
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

  // When a simulation starts the backend emits sim:started to the passenger's socket room.
  // This listener auto-navigates the passenger app to LiveTracking — no manual action needed.
  useEffect(() => {
    let auth;
    try { auth = JSON.parse(localStorage.getItem("auth")); } catch { /* no-op */ }
    const userId = auth?.user?.id;
    if (!userId) return;

    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socket.emit("join", `passenger:${userId}`);

    const onSimStarted = ({ rideId }) => {
      if (!rideId) return;
      localStorage.setItem("activePassengerRideId", rideId);
      navigate(`/passenger/live-tracking/${rideId}`, { replace: true });
    };

    socket.on("sim:started", onSimStarted);
    return () => socket.off("sim:started", onSimStarted);
  }, [navigate]);

  return <Outlet />;
}
