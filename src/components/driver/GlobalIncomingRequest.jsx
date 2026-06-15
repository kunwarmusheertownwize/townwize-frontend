// src/components/driver/GlobalIncomingRequest.jsx

import { useEffect, useState } from "react";
//import { useNavigate } from "react-router-dom";
import { useDriverMode } from "../../contexts/useDriverMode";
import { DRIVER_MODES } from "../../contexts/driverModes";
//import { useRideSocket } from "../../hooks/useRideSocket";

/**
 * GlobalIncomingRequest
 * ---------------------
 * Persistent, layout-level incoming request banner.
 * Reacts ONLY to DriverModeContext.
 */
export default function GlobalIncomingRequest() {
    //const navigate = useNavigate();
    const { driverMode, setDriverMode, incomingRide, setIncomingRide } = useDriverMode();
    // const socket = useRideSocket();


    const [secondsLeft, setSecondsLeft] = useState(0);

    // Start countdown when incoming request mode is set
    useEffect(() => {
        if (driverMode === DRIVER_MODES.INCOMING_REQUEST) {
            setSecondsLeft(15); // same as TripRequests
        }
    }, [driverMode]);

    // Listen for real incoming ride from backend
    useEffect(() => {
        const socket = window.__townwizeSocket;
        if (!socket) return;

        const onRideRequested = (payload) => {
            setIncomingRide(payload);                 // ✅ STORE RIDE
            setDriverMode(DRIVER_MODES.INCOMING_REQUEST);
        };

        socket.on("ride:requested", onRideRequested);

        return () => {
            socket.off("ride:requested", onRideRequested);
        };
    }, [setDriverMode, setIncomingRide]);


    // Countdown timer
    useEffect(() => {
        if (driverMode !== DRIVER_MODES.INCOMING_REQUEST) return;
        if (secondsLeft <= 0) {
            // timeout → reset back to idle
            setDriverMode(DRIVER_MODES.ONLINE_IDLE);
            return;
        }

        const t = setTimeout(() => {
            setSecondsLeft((s) => s - 1);
        }, 1000);

        return () => clearTimeout(t);
    }, [secondsLeft, driverMode, setDriverMode]);

    // Only visible during incoming request
    if (driverMode !== DRIVER_MODES.INCOMING_REQUEST || !incomingRide) {
        return null;
    }

    return (
        <div className="fixed top-0 inset-x-0 z-50 bg-townwize-primary text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                {/* Left */}
                <div className="flex flex-col">
                    <span className="font-semibold text-sm">
                        New Ride Request
                    </span>
                    <span className="text-xs opacity-90">
                        Respond within {secondsLeft}s
                    </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            if (!incomingRide?.rideId) return;

                            setDriverMode(DRIVER_MODES.INCOMING_REQUEST);
                            window.location.href = "/driver/trip-requests";
                        }}
                        className="px-3 py-1 text-sm rounded-md bg-white text-townwize-primary font-semibold"
                    >
                        View
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setIncomingRide(null);
                            setDriverMode(DRIVER_MODES.ONLINE_IDLE);
                        }}
                        className="px-3 py-1 text-sm rounded-md bg-red-500 hover:bg-red-600"
                    >
                        Reject
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-white/30">
                <div
                    className="h-1 bg-white transition-all"
                    style={{ width: `${(secondsLeft / 15) * 100}%` }}
                />
            </div>
        </div>
    );
}
