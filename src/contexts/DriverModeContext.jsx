import { useEffect, useRef, useState } from "react";
import { DRIVER_MODES } from "./driverModes";
import { DriverModeContext } from "./DriverModeContextBase";
import { getSocket } from "../hooks/useRideSocket";
import api from "../services/api";

const MODE_STORAGE_KEY = "townwize_driver_mode";
const ELIGIBILITY_STORAGE_KEY = "townwize_driver_eligibility";

const getInitialDriverMode = () => {
  try {
    const authRaw = localStorage.getItem("auth");
    const auth = authRaw ? JSON.parse(authRaw) : null;
    if (auth?.user?.role !== "driver") {
      sessionStorage.removeItem(MODE_STORAGE_KEY);
      localStorage.removeItem("activeDriverTrip");
      return DRIVER_MODES.OFFLINE;
    }

    // If a persisted trip exists in localStorage (survives native app close),
    // start in ACTIVE_TRIP so DriverLayout immediately routes to live-tracking.
    if (localStorage.getItem("activeDriverTrip")) return DRIVER_MODES.ACTIVE_TRIP;

    const saved = sessionStorage.getItem(MODE_STORAGE_KEY);
    if (saved === DRIVER_MODES.ACTIVE_TRIP) return DRIVER_MODES.OFFLINE;
    return saved || DRIVER_MODES.OFFLINE;
  } catch {
    return DRIVER_MODES.OFFLINE;
  }
};

const getInitialEligibility = () => {
  try {
    const saved = localStorage.getItem(ELIGIBILITY_STORAGE_KEY);
    return saved
      ? JSON.parse(saved)
      : {
          registrationComplete: false,
          documentsSubmitted: false,
          verificationStatus: "PENDING",
          conditionStatus: "pending",
          blockedReason: null,
        };
  } catch {
    return {
      registrationComplete: false,
      documentsSubmitted: false,
      verificationStatus: "PENDING",
      conditionStatus: "pending",
      blockedReason: null,
    };
  }
};

const sameId = (a, b) => String(a || "") === String(b || "");

export const DriverModeProvider = ({ children }) => {
  const [driverMode, setDriverMode] = useState(getInitialDriverMode);
  const [incomingRide, setIncomingRide] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [driverEligibility, setDriverEligibility] = useState(getInitialEligibility);

  const modeRef = useRef(driverMode);
  useEffect(() => {
    modeRef.current = driverMode;
  }, [driverMode]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    if (!socket.connected) socket.connect();

    const joinDriverRoom = () => {
      const authRaw = localStorage.getItem("auth");
      const auth = authRaw ? JSON.parse(authRaw) : null;
      if (auth?.user?.role !== "driver") {
        sessionStorage.removeItem(MODE_STORAGE_KEY);
        localStorage.removeItem("activeDriverTrip");
        setDriverMode(DRIVER_MODES.OFFLINE);
        setIncomingRide(null);
        setActiveRide(null);
        return;
      }
      if (auth?.user?.id) socket.emit("join", `driver:${auth.user.id}`);
    };

    const getCurrentPosition = () =>
      new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          () => resolve(null),
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 }
        );
      });

    const restoreOnlineRegistry = async () => {
      const authRaw = localStorage.getItem("auth");
      const auth = authRaw ? JSON.parse(authRaw) : null;
      if (auth?.user?.role !== "driver") return;

      const mode = modeRef.current;
      if (
        mode !== DRIVER_MODES.ONLINE_IDLE &&
        mode !== DRIVER_MODES.INCOMING_REQUEST
      ) {
        return;
      }

      const socketId = socket.id;
      if (!socketId) return;

      const position = await getCurrentPosition();
      await api
        .post(
          "/driver/online",
          position || {},
          { headers: { "X-Socket-ID": socketId } }
        )
        .catch(() => {});
    };

    joinDriverRoom();

    const onRideRequested = (payload) => {
      // Do not surface requests while driver is offline/blocked.
      if (
        modeRef.current !== DRIVER_MODES.ONLINE_IDLE &&
        modeRef.current !== DRIVER_MODES.INCOMING_REQUEST
      ) {
        return;
      }
      setIncomingRide(payload);
      setDriverMode(DRIVER_MODES.INCOMING_REQUEST);
    };

    const onRideUpdated = (payload) => {
      if (!payload?.rideId || !payload?.status) return;
      const nextStatus = String(payload.status || "").toUpperCase();
      const activeStatuses = ["DRIVER_ASSIGNED", "EN_ROUTE", "ARRIVED", "ON_TRIP"];

      setActiveRide((prev) =>
        prev && sameId(prev.rideId, payload.rideId) ? { ...prev, status: payload.status } : prev
      );
      setIncomingRide((prev) => {
        if (!prev || !sameId(prev.rideId, payload.rideId)) return prev;
        return nextStatus === "REQUESTED" ? { ...prev, status: payload.status } : null;
      });

      const storedRaw = localStorage.getItem("activeDriverTrip");
      const stored = storedRaw ? JSON.parse(storedRaw) : null;
      if (sameId(stored?.rideId, payload.rideId)) {
        if (activeStatuses.includes(nextStatus)) {
          const nextStored = { ...stored, status: payload.status };
          localStorage.setItem("activeDriverTrip", JSON.stringify(nextStored));
          setActiveRide(nextStored);
          setDriverMode(DRIVER_MODES.ACTIVE_TRIP);
        } else {
          localStorage.removeItem("activeDriverTrip");
          setActiveRide(null);
          setDriverMode(DRIVER_MODES.ONLINE_IDLE);
        }
      }
    };

    const onConnect = () => {
      joinDriverRoom();
      restoreOnlineRegistry();
    };

    socket.on("connect", onConnect);
    socket.on("ride:requested", onRideRequested);
    socket.on("ride:updated", onRideUpdated);

    return () => {
      socket.off("connect", onConnect);
      socket.off("ride:requested", onRideRequested);
      socket.off("ride:updated", onRideUpdated);
    };
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(MODE_STORAGE_KEY, driverMode);
      if (driverMode === DRIVER_MODES.OFFLINE) {
        setIncomingRide(null);
        setActiveRide(null);
        localStorage.removeItem("activeDriverTrip");
      }
    } catch {
      // ignore storage exceptions
    }
  }, [driverMode]);

  useEffect(() => {
    localStorage.setItem(ELIGIBILITY_STORAGE_KEY, JSON.stringify(driverEligibility));
  }, [driverEligibility]);

  return (
    <DriverModeContext.Provider
      value={{
        driverMode,
        setDriverMode,
        incomingRide,
        setIncomingRide,
        activeRide,
        setActiveRide,
        driverEligibility,
        setDriverEligibility,
      }}
    >
      {children}
    </DriverModeContext.Provider>
  );
};
