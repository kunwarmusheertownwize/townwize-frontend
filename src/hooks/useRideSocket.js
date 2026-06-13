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
} = {}) {
  const rideRequestedRef = useRef(onRideRequested);
  const rideUpdatedRef = useRef(onRideUpdated);
  const rideAcceptedRef = useRef(onRideAccepted);
  const driverLocationRef = useRef(onDriverLocation);

  useEffect(() => {
    rideRequestedRef.current = onRideRequested;
    rideUpdatedRef.current = onRideUpdated;
    rideAcceptedRef.current = onRideAccepted;
    driverLocationRef.current = onDriverLocation;
  }, [onRideRequested, onRideUpdated, onRideAccepted, onDriverLocation]);

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

    const onConnect = () => {
      joinRooms();
    };

    const onRideRequestedSocket = (payload) => {
      rideRequestedRef.current?.(payload);
    };

    const onRideUpdatedSocket = (payload) => {
      rideUpdatedRef.current?.(payload);
    };

    const onRideAcceptedSocket = (payload) => {
      rideAcceptedRef.current?.(payload);
    };

    const onDriverLocationSocket = (payload) => {
      driverLocationRef.current?.(payload);
    };

    socket.on("connect", onConnect);
    socket.on("ride:requested", onRideRequestedSocket);
    socket.on("ride:updated", onRideUpdatedSocket);
    socket.on("ride:accepted", onRideAcceptedSocket);
    socket.on("driver:location", onDriverLocationSocket);
    window.addEventListener("storage", joinRooms);

    return () => {
      socket.off("connect", onConnect);
      socket.off("ride:requested", onRideRequestedSocket);
      socket.off("ride:updated", onRideUpdatedSocket);
      socket.off("ride:accepted", onRideAcceptedSocket);
      socket.off("driver:location", onDriverLocationSocket);
      window.removeEventListener("storage", joinRooms);
    };
  }, [joinRideId]);
}
