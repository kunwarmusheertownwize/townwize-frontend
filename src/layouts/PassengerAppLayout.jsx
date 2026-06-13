// src/layouts/PassengerAppLayout.jsx

import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

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

  return <Outlet />;
}
