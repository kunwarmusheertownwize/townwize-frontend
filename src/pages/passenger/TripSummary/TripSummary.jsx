// File: townwize-frontend\src\pages\passenger\TripSummary\TripSummary.jsx

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSocket } from "../../../hooks/useRideSocket";
import { authFetch } from "../../../utils/authFetch";
import { toast } from "react-toastify";

const getRideCreateErrorMessage = (payload, status) => {
  const code = payload?.error?.code || payload?.code || "";
  const apiMessage = payload?.error?.message || payload?.message || "";

  if (code === "PICKUP_OUTSIDE_SERVICE_ZONE") {
    return "Pickup location is outside Townwize service area. Please choose a different pickup point.";
  }
  if (code === "DROPOFF_OUTSIDE_SERVICE_ZONE") {
    return "Dropoff location is outside Townwize service area. Please choose a different dropoff point.";
  }
  if (code === "RIDE_COORDS_INVALID") {
    return "We could not validate your trip coordinates. Please reselect pickup and dropoff.";
  }
  if (code === "ACTIVE_RIDE_EXISTS") {
    return "You already have an active ride. Please complete or cancel it before creating a new one.";
  }
  if (code === "RIDE_CREATE_RATE_LIMIT") {
    return "Please wait a few seconds before requesting another ride.";
  }

  if (apiMessage) return apiMessage;
  if (status === 400) return "Trip request could not be accepted. Please review your locations and try again.";
  return "Unable to create ride right now. Please try again.";
};


const TripSummary = () => {
  const { state } = useLocation();

  const navigate = useNavigate();
  //const socket = useRideSocket();

  const [confirming, setConfirming] = useState(false);
  const [showFareDetails, setShowFareDetails] = useState(false);
  const [quote, setQuote] = useState({
    loading: true,
    finalFare: Number(state?.fare ?? 0),
    fareVersion: "v1",
    fareBreakdown: null,
    message: "",
  });
  const [zoneCheck, setZoneCheck] = useState({
    loading: true,
    eligible: null,
    pickupEligible: null,
    dropoffEligible: null,
    pickupZoneName: "",
    dropoffZoneName: "",
    message: "",
  });

  // Basic required text fields
  const pickup = state?.pickup || "";
  const dropoff = state?.dropoff || "";
  const rideType = state?.rideType || null;
  const carType = state?.carType || state?.vehicleClass || "economy";
  const fare = state?.fare ?? 0;

  const carTypeLabel =
    {
      economy: "Economy",
      comfort: "Comfort",
      xl: "XL",
    }[String(carType).toLowerCase()] || "Economy";

  // REQUIRED backend fields (DO NOT DROP)
  const pickupCoords = state?.pickupCoords;
  const dropoffCoords = state?.dropoffCoords;
  const distanceKm = state?.distanceKm;
  const etaMinutes = state?.etaMinutes;

  // Display-only ETA string (optional)
  const etaLabel = state?.eta || "";

  const fareBreakdownRows = quote?.fareBreakdown
    ? [
        { label: "Base Fare", value: quote.fareBreakdown.baseFare },
        { label: "Distance Fare", value: quote.fareBreakdown.distanceFare },
        { label: "Time Fare", value: quote.fareBreakdown.timeFare },
        { label: "Platform Fee", value: quote.fareBreakdown.platformFee },
        { label: "SST (Sindh Sales Tax)", value: quote.fareBreakdown.taxAmount },
      ]
    : [];

  // Hard guard — redirect immediately if state is broken
  useEffect(() => {
    if (
      !pickup ||
      !dropoff ||
      !rideType ||
      fare == null ||
      !pickupCoords ||
      !dropoffCoords ||
      typeof distanceKm !== "number" ||
      typeof etaMinutes !== "number"
    ) {
      //toast.error("Trip data expired. Please reselect your ride.");
      navigate("/passenger/select-ride", { replace: true });
    }
  }, [
    pickup,
    dropoff,
    rideType,
    fare,
    pickupCoords,
    dropoffCoords,
    distanceKm,
    etaMinutes,
    navigate,
  ]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onRideAccepted = (payload) => {
      const acceptedRideId = payload?.rideId;
      if (!acceptedRideId) return;

      localStorage.setItem("activePassengerRideId", acceptedRideId);
      navigate(`/passenger/live-tracking/${acceptedRideId}`, {
        replace: true,
        state: payload,
      });
    };

    socket.on("ride:accepted", onRideAccepted);

    return () => {
      socket.off("ride:accepted", onRideAccepted);
    };
  }, [navigate]);

  useEffect(() => {
    let mounted = true;
    const runZoneCheck = async () => {
      if (!pickupCoords || !dropoffCoords) return;
      setZoneCheck((prev) => ({ ...prev, loading: true, message: "" }));
      try {
        const res = await authFetch(
          `${import.meta.env.VITE_API_BASE_URL}/rides/zone-eligibility`,
          {
            method: "POST",
            body: JSON.stringify({
              pickupCoords,
              dropoffCoords,
            }),
          }
        );
        const json = await res.json();
        if (!mounted) return;
        if (!res.ok) {
          throw new Error(json?.error?.message || json?.message || "Zone check failed");
        }
        const data = json?.data || {};
        setZoneCheck({
          loading: false,
          eligible: Boolean(data.eligible),
          pickupEligible: Boolean(data.pickup?.eligible),
          dropoffEligible: Boolean(data.dropoff?.eligible),
          pickupZoneName: data.pickup?.zone?.name || "",
          dropoffZoneName: data.dropoff?.zone?.name || "",
          message: "",
        });
      } catch (err) {
        if (!mounted) return;
        setZoneCheck({
          loading: false,
          eligible: null,
          pickupEligible: null,
          dropoffEligible: null,
          pickupZoneName: "",
          dropoffZoneName: "",
          message: err?.message || "Unable to validate zone coverage",
        });
      }
    };
    runZoneCheck();
    return () => {
      mounted = false;
    };
  }, [pickupCoords, dropoffCoords]);

  useEffect(() => {
    let mounted = true;

    const runQuote = async () => {
      if (!pickupCoords || !dropoffCoords || !rideType) return;
      setQuote((prev) => ({ ...prev, loading: true, message: "" }));

      try {
        const res = await authFetch(`${import.meta.env.VITE_API_BASE_URL}/rides/quote`, {
          method: "POST",
          body: JSON.stringify({
            pickupCoords,
            dropoffCoords,
            rideType,
            carType,
            distanceKm,
            etaMinutes,
            requestedFare: Number(fare || 0),
          }),
        });

        const json = await res.json();
        if (!mounted) return;
        if (!res.ok) {
          throw new Error(json?.error?.message || json?.message || "Fare quote failed");
        }

        setQuote({
          loading: false,
          finalFare: Number(json?.data?.finalFare ?? fare ?? 0),
          fareVersion: json?.data?.fareVersion || "v1",
          fareBreakdown: json?.data?.fareBreakdown || null,
          message: "",
        });
      } catch (err) {
        if (!mounted) return;
        setQuote({
          loading: false,
          finalFare: Number(fare || 0),
          fareVersion: "v1",
          fareBreakdown: null,
          message: err?.message || "Unable to fetch fare quote",
        });
      }
    };

    runQuote();
    return () => {
      mounted = false;
    };
  }, [pickupCoords, dropoffCoords, rideType, carType, distanceKm, etaMinutes, fare]);

  if (!rideType) return null;

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-townwize-primaryDark p-6 md:p-8 rounded-2xl shadow-lg space-y-6 text-townwize-textPrimary dark:text-white mt-6 border border-gray-100 dark:border-gray-700">
      <div className="flex items-start justify-between gap-4">
        <div>
      <h2 className="text-2xl font-bold text-townwize-primary dark:text-townwize-accent">
        Confirm Your Ride
      </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Review your trip details before confirming.
      </p>
        </div>
        <span className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
          {rideType === "Private Ride" ? `${rideType} - ${carTypeLabel}` : rideType}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gray-50 dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">Route</p>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-[92px_1fr] gap-3">
              <span className="font-semibold text-gray-700 dark:text-gray-200">Pickup</span>
              <span className="text-gray-800 dark:text-gray-100 break-words">{pickup}</span>
            </div>
            <div className="grid grid-cols-[92px_1fr] gap-3">
              <span className="font-semibold text-gray-700 dark:text-gray-200">Dropoff</span>
              <span className="text-gray-800 dark:text-gray-100 break-words">{dropoff}</span>
            </div>
            <div className="grid grid-cols-[92px_1fr] gap-3">
              <span className="font-semibold text-gray-700 dark:text-gray-200">ETA</span>
              <span>{etaLabel}</span>
            </div>
            {rideType === "Private Ride" ? (
              <div className="grid grid-cols-[92px_1fr] gap-3">
                <span className="font-semibold text-gray-700 dark:text-gray-200">Car Class</span>
                <span>{carTypeLabel}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="bg-townwize-primary text-white p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/80">Estimated Fare</p>
            <p className="text-3xl font-extrabold mt-2">
              {quote.loading ? "..." : Number(quote.finalFare || 0).toLocaleString()}
              <span className="text-base font-semibold ml-1">PKR</span>
            </p>
          </div>
          {quote.loading ? (
            <p className="text-xs text-white/80 mt-3">Calculating pricing...</p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowFareDetails((prev) => !prev)}
                className="mt-3 text-xs text-left text-white/90 underline underline-offset-2 hover:text-white"
              >
                {showFareDetails ? "Hide fare details" : "View fare details"}
              </button>

              {showFareDetails ? (
                <div className="mt-3 rounded-lg bg-white/10 border border-white/15 p-3 space-y-1.5">
                  {fareBreakdownRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between text-xs">
                      <span className="text-white/85">{row.label}</span>
                      <span className="font-semibold text-white">
                        {Number(row.value || 0).toLocaleString()} PKR
                      </span>
                    </div>
                  ))}
                  <div className="my-1 border-t border-white/20" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">Total</span>
                    <span className="font-extrabold">
                      {Number(quote.finalFare || 0).toLocaleString()} PKR
                    </span>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
        <p className="font-semibold">Zone Check</p>
        {zoneCheck.loading ? (
          <p className="text-sm text-gray-500">Checking service zones...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={`rounded-lg border px-3 py-2 text-sm ${zoneCheck.pickupEligible ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>
              <p className="font-semibold">Pickup</p>
              <p>
                {zoneCheck.pickupEligible ? "Inside service zone" : "Outside service zone"}
                {zoneCheck.pickupEligible && zoneCheck.pickupZoneName ? ` (${zoneCheck.pickupZoneName})` : ""}
              </p>
            </div>
            <div className={`rounded-lg border px-3 py-2 text-sm ${zoneCheck.dropoffEligible ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>
              <p className="font-semibold">Dropoff</p>
              <p>
                {zoneCheck.dropoffEligible ? "Inside service zone" : "Outside service zone"}
                {zoneCheck.dropoffEligible && zoneCheck.dropoffZoneName ? ` (${zoneCheck.dropoffZoneName})` : ""}
              </p>
            </div>
          </div>
        )}
        {zoneCheck.eligible === false && (
          <p className="text-sm text-red-700">
            Ride cannot be created because one or more locations are outside active service zones.
          </p>
        )}
        {zoneCheck.message && <p className="text-sm text-red-700">{zoneCheck.message}</p>}
        {quote.message ? <p className="text-sm text-amber-700">{quote.message}</p> : null}
      </div>

      {/* Confirm Button */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          disabled={confirming || zoneCheck.loading || zoneCheck.eligible === false || quote.loading}
          onClick={async () => {
            try {
              setConfirming(true);
              const res = await authFetch(
                `${import.meta.env.VITE_API_BASE_URL}/rides`,
                {
                  method: "POST",
                  body: JSON.stringify({
                    pickup,
                    dropoff,
                    pickupCoords,
                    dropoffCoords,
                    distanceKm,
                    etaMinutes,
                    rideType,
                    carType,
                    fareEstimate: Number(quote.finalFare || fare || 0),
                  }),
                }
              );

              const json = await res.json();

              if (!res.ok) {
                throw new Error(getRideCreateErrorMessage(json, res.status));
              }
              const data = json?.data || {};
              const rideId = data.rideId || json?.rideId || json?._id;

              if (!rideId) {
                throw new Error("Ride creation failed: Missing ride id");
              }

              // RideTogether: route through pooling UI
              if (rideType === "RideTogether") {
                if (data.matched && data.primaryRideId) {
                  // Immediately matched — go straight to tracking on primary ride
                  localStorage.setItem("activePassengerRideId", data.primaryRideId);
                  navigate(`/passenger/live-tracking/${data.primaryRideId}`, { replace: true });
                } else {
                  // Sitting in POOLING — show countdown in Booking.jsx
                  navigate("/passenger/booking", {
                    replace: true,
                    state: {
                      rideId,
                      pooling: true,
                      matchWindowMinutes: data.matchWindowMinutes || 3,
                      pickup: state.pickup,
                      dropoff: state.dropoff,
                      pickupCoords: state.pickupCoords,
                      dropoffCoords: state.dropoffCoords,
                      fare: quote.finalFare || fare,
                      distanceKm: state.distanceKm,
                      etaMinutes: state.etaMinutes,
                      rideType,
                    },
                  });
                }
                return;
              }

              // Private ride — navigate to live tracking directly
              localStorage.setItem("activePassengerRideId", rideId);
              navigate(`/passenger/live-tracking/${rideId}`, { replace: true });

            } catch (err) {
              console.error("Confirm Trip failed:", err);
              toast.error(err?.message || "Unable to create ride right now. Please try again.");
              setConfirming(false);
            }
          }}
          className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 shadow-md ${confirming
            ? "cursor-wait text-white bg-townwize-primaryDark"
            : "text-white bg-townwize-primary hover:bg-townwize-primaryDark"
            }`}
        >
          {confirming
            ? "Creating ride..."
            : zoneCheck.loading
              ? "Checking zones..."
              : quote.loading
                ? "Calculating fare..."
              : "Confirm Trip"}
        </button>
      <button
        onClick={() => {
          sessionStorage.removeItem("selectRideState");
          sessionStorage.removeItem("selectRideStatePersist");
          navigate("/passenger/home", { replace: true });
        }}
        className="w-full py-3 rounded-xl font-semibold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
      >
        Cancel
      </button>
      </div>
    </div>
  );
};

export default TripSummary;
