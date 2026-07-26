// Mounts once inside the Router. On auth load, checks backend for an active ride.
// If found in an active status → routes directly to the correct tracking screen.
// Covers: app force-close, crash, re-open mid-trip (P0 #08, #19, #20).

import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import api from "../../utils/api";

const ACTIVE_STATUSES = ["DRIVER_ASSIGNED", "EN_ROUTE", "ARRIVED", "ON_TRIP"];
const TRACKING_PATHS  = ["/passenger/live-tracking", "/driver/live-tracking"];

export default function ActiveRideResume() {
  const { user, loading } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const checked   = useRef(false);

  useEffect(() => {
    if (loading || !user || checked.current) return;
    // Already on a tracking screen — no redirect needed
    if (TRACKING_PATHS.some(p => location.pathname.startsWith(p))) {
      checked.current = true;
      return;
    }
    checked.current = true;

    async function resume() {
      try {
        if (user.role === "passenger") {
          const res = await api.get("/passenger/active-ride");
          const ride = res.data?.data;
          if (ride && ACTIVE_STATUSES.includes(ride.status)) {
            navigate(`/passenger/live-tracking/${ride.rideId}`, { replace: true });
          }
        } else if (user.role === "driver") {
          const res = await api.get("/driver/active-ride");
          const ride = res.data?.data;
          if (ride && ACTIVE_STATUSES.includes(ride.status)) {
            navigate("/driver/live-tracking", { replace: true, state: { request: ride } });
          }
        }
      } catch {
        // Silently ignore — network failure means user lands on normal home screen
      }
    }

    resume();
  }, [loading, user]);

  return null;
}