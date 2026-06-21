// townwize-frontend/src/hooks/useRideSocket.js

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const socket = io(
  import.meta.env.VITE_API_BASE_URL?.replace("/api/v1.2", ""),
  { autoConnect: false }
);

export const getSocket = () => socket;

const getAuth = () => {
  try {
    return JSON.parse(localStorage.getItem("auth"));
  } catch {
    return null;
  }
};

export function useRideSocket({
  joinRideId,
  onRideRequested,
  onRideUpdated,
  onRideAccepted,
  onDriverLocation,
  onPoolMatched,
  onPoolArrivedPrimary,
  onPoolCollectingSecondary,
  onPoolPrimaryBoarded,
  onPoolEnRouteSecondary,
  onPoolArrivedSecondary,
  onPoolAllAboard,
  onPoolExited,
  onPoolRequeued,
} = {}) {
  const rideRequestedRef = useRef(onRideRequested);
  const rideUpdatedRef = useRef(onRideUpdated);
  const rideAcceptedRef = useRef(onRideAccepted);
  const driverLocationRef = useRef(onDriverLocation);
  const poolMatchedRef = useRef(onPoolMatched);
  const poolArrivedPrimaryRef = useRef(onPoolArrivedPrimary);
  const poolCollectingSecondaryRef = useRef(onPoolCollectingSecondary);
  const poolPrimaryBoardedRef = useRef(onPoolPrimaryBoarded);
  const poolEnRouteSecondaryRef = useRef(onPoolEnRouteSecondary);
  const poolArrivedSecondaryRef = useRef(onPoolArrivedSecondary);
  const poolAllAboardRef = useRef(onPoolAllAboard);
  const poolExitedRef = useRef(onPoolExited);
  const poolRequeuedRef = useRef(onPoolRequeued);

  useEffect(() => {
    rideRequestedRef.current = onRideRequested;
    rideUpdatedRef.current = onRideUpdated;
    rideAcceptedRef.current = onRideAccepted;
    driverLocationRef.current = onDriverLocation;
    poolMatchedRef.current = onPoolMatched;
    poolArrivedPrimaryRef.current = onPoolArrivedPrimary;
    poolCollectingSecondaryRef.current = onPoolCollectingSecondary;
    poolPrimaryBoardedRef.current = onPoolPrimaryBoarded;
    poolEnRouteSecondaryRef.current = onPoolEnRouteSecondary;
    poolArrivedSecondaryRef.current = onPoolArrivedSecondary;
    poolAllAboardRef.current = onPoolAllAboard;
    poolExitedRef.current = onPoolExited;
    poolRequeuedRef.current = onPoolRequeued;
  }, [
    onRideRequested, onRideUpdated, onRideAccepted, onDriverLocation,
    onPoolMatched, onPoolArrivedPrimary, onPoolCollectingSecondary,
    onPoolPrimaryBoarded, onPoolEnRouteSecondary, onPoolArrivedSecondary,
    onPoolAllAboard, onPoolExited, onPoolRequeued,
  ]);

  useEffect(() => {
    const joinRooms = () => {
      const auth = getAuth();
      if (!auth?.user) return;

      if (auth.user.role === "passenger") {
        socket.emit("join", `passenger:${auth.user.id}`);
      }

      if (auth.user.role === "driver") {
        socket.emit("join", `driver:${auth.user.id}`);
        socket.emit("join", "drivers:online");
      }

      if (joinRideId) {
        socket.emit("join", `ride:${joinRideId}`);
      }
    };

    if (!socket.connected) socket.connect();
    joinRooms();

    const onConnect = () => { joinRooms(); };

    const wrap = (ref) => (payload) => ref.current?.(payload);

    const handlers = {
      "connect":                    onConnect,
      "ride:requested":             wrap(rideRequestedRef),
      "ride:updated":               wrap(rideUpdatedRef),
      "ride:accepted":              wrap(rideAcceptedRef),
      "driver:location":            wrap(driverLocationRef),
      "ride:pool_matched":          wrap(poolMatchedRef),
      "ride:pool_arrived_primary":  wrap(poolArrivedPrimaryRef),
      "ride:pool_collecting_secondary": wrap(poolCollectingSecondaryRef),
      "ride:pool_primary_boarded":  wrap(poolPrimaryBoardedRef),
      "ride:pool_en_route_secondary": wrap(poolEnRouteSecondaryRef),
      "ride:pool_arrived_secondary": wrap(poolArrivedSecondaryRef),
      "ride:pool_all_aboard":       wrap(poolAllAboardRef),
      "ride:pool_exited":           wrap(poolExitedRef),
      "ride:pool_requeued":         wrap(poolRequeuedRef),
    };

    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
    window.addEventListener("storage", joinRooms);

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
      window.removeEventListener("storage", joinRooms);
    };
  }, [joinRideId]);
}
