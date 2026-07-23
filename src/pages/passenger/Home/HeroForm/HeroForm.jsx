//File: townwize-frontend/src/pages/passenger/Home/HeroForm.jsx

import React from "react";
import PickupField from "../HeroForm/PickupField";
import DropoffField from "../HeroForm/DropoffField";
import DatePicker from "../HeroForm/DatePicker";
import TimePicker from "../HeroForm/TimePicker";
import ConfirmButton from "../HeroForm/ConfirmButton";
import LoginLink from "../HeroForm/LoginLink";
import { useTranslation } from "react-i18next";

const HeroForm = ({
  pickup,
  setPickup,
  pickupSuggestions,
  setPickupSuggestions,
  fetchPickupSuggestions,
  resolvePlace,
  dropoff,
  setDropoff,
  dropoffSuggestions,
  setDropoffSuggestions,
  fetchDropoffSuggestions,
  dropoffRef,
  handleGetCurrentLocation,
  locating,
  pickupDate,
  setPickupDate,
  pickupTime,
  setPickupTime,
  month,
  setMonth,
  generateCalendar,
  timeSlots,
  rideConfirmed,
  setRideConfirmed,
  handleFindRide,
  handleSwap,
  recentPickups,
  showRecentPickups,
  setShowRecentPickups,
  onPickupFocus,
  onSelectRecentPickup,
  onRemoveRecentPickup,
  onClearRecentPickups,
}) => {
  const { t } = useTranslation();

  return (
    <div id="hero-form" className="flex flex-col justify-center">
      <div className="hidden md:block">
        <span className="text-4xl lg:text-5xl font-extrabold leading-tight">
          {t("heroHeadline")}
        </span>
        <span className="mt-4 mb-4 text-lg text-townwize-textSecondary dark:text-townwize-textContent block">
          {t("heroSubtext")}
        </span>

      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-none space-y-4 max-w-lg border border-gray-200 dark:border-gray-700">
        {/* Pickup + Dropoff */}
        <div className="relative space-y-2">
          <span className="absolute left-[11px] top-[30px] bottom-[22px] w-px bg-black z-20 dark:bg-townwize-bgLight"></span>

          <PickupField
            pickup={pickup}
            setPickup={setPickup}
            pickupSuggestions={pickupSuggestions}
            setPickupSuggestions={setPickupSuggestions}
            fetchPickupSuggestions={fetchPickupSuggestions}
            resolvePlace={resolvePlace}
            dropoffRef={dropoffRef}
            handleGetCurrentLocation={handleGetCurrentLocation}
            locating={locating}
            recentPickups={recentPickups}
            showRecentPickups={showRecentPickups}
            setShowRecentPickups={setShowRecentPickups}
            onPickupFocus={onPickupFocus}
            onSelectRecentPickup={onSelectRecentPickup}
            onRemoveRecentPickup={onRemoveRecentPickup}
            onClearRecentPickups={onClearRecentPickups}
          />

          {/* Swap Button */}
          <div className="w-full flex justify-center my-1">
            <button
              type="button"
              onClick={handleSwap}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              title="Swap pickup & dropoff"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-townwize-primary dark:text-townwize-bgLight"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 7H7m0 0l4-4m-4 4l4 4M7 17h10m0 0l-4 4m4-4l-4-4"
                />
              </svg>
            </button>
          </div>

          <DropoffField
            dropoff={dropoff}
            setDropoff={setDropoff}
            dropoffSuggestions={dropoffSuggestions}
            setDropoffSuggestions={setDropoffSuggestions}
            fetchDropoffSuggestions={fetchDropoffSuggestions}
            dropoffRef={dropoffRef}
            resolvePlace={resolvePlace}
          />
        </div>

        {/* Smart hint for Stop feature */}
        {dropoff && (
          <div className="mt-1">
            <div className="flex items-center gap-2 bg-townwize-primary/8 dark:bg-townwize-primary/15 border border-townwize-primary/20 dark:border-townwize-primary/30 rounded-lg px-3 py-2">
              <span className="text-townwize-primary dark:text-townwize-accent text-base leading-none">+</span>
              <span className="text-xs font-medium text-townwize-primary dark:text-townwize-accent leading-snug">
                You can <span className="font-bold">add a stop</span> on the next screen — if you need to!
              </span>
            </div>
          </div>
        )}

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <DatePicker
            pickupDate={pickupDate}
            setPickupDate={setPickupDate}
            month={month}
            setMonth={setMonth}
            generateCalendar={generateCalendar}
          />
          <TimePicker
            pickupTime={pickupTime}
            setPickupTime={setPickupTime}
            timeSlots={timeSlots}
          />
        </div>

        <ConfirmButton
          dropoff={dropoff}
          handleFindRide={handleFindRide}
          rideConfirmed={rideConfirmed}
          setRideConfirmed={setRideConfirmed}
        />

        <LoginLink />

      </div>
    </div>
  );
};

export default HeroForm;
