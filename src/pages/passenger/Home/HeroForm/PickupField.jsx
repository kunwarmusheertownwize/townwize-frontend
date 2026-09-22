import { FaCrosshairs, FaHistory, FaTimes } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const PickupField = ({
  pickup,
  setPickup,
  pickupSuggestions,
  fetchPickupSuggestions,
  resolvePlace,
  setPickupSuggestions,
  dropoffRef,
  handleGetCurrentLocation,
  locating,
  recentPickups,
  showRecentPickups,
  setShowRecentPickups,
  onPickupFocus,
  onSelectRecentPickup,
  onRemoveRecentPickup,
  onClearRecentPickups,
}) => {
  const { t } = useTranslation();
  const pickupWrapperRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    function handleClickOutside(e) {
      if (pickupWrapperRef.current && !pickupWrapperRef.current.contains(e.target)) {
        setPickupSuggestions([]);
        setActiveIndex(-1);
        setShowRecentPickups?.(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setPickupSuggestions, setShowRecentPickups]);

  const handleKeyDown = (e) => {
    if (!pickupSuggestions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, pickupSuggestions.length - 1));
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }

    if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const p = pickupSuggestions[activeIndex];
      resolvePlace(p, setPickup);
      setPickupSuggestions([]);
      setActiveIndex(-1);
      if (dropoffRef.current) dropoffRef.current.focus();
    }

    if (e.key === "Escape") {
      setPickupSuggestions([]);
      setActiveIndex(-1);
      setShowRecentPickups?.(false);
    }
  };

  // Show autocomplete suggestions when typing; hide recent when autocomplete is active
  const showAutocomplete = pickupSuggestions.length > 0;
  const showRecent = showRecentPickups && !showAutocomplete && Array.isArray(recentPickups) && recentPickups.length > 0;

  return (
    <div className="relative" ref={pickupWrapperRef}>
      <span className="absolute start-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-townwize-primary z-20 dark:bg-townwize-bgLight" />

      <input
        type="text"
        placeholder={t("pickupPlaceholder")}
        value={pickup}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (onPickupFocus) onPickupFocus();
        }}
        onChange={(e) => {
          const value = e.target.value;
          setPickup(value);
          setActiveIndex(-1);
          // Hide recent when user starts typing (let autocomplete take over)
          if (value.trim().length > 0) {
            setShowRecentPickups?.(false);
          }

          clearTimeout(window.__tw_pickup_timer);
          window.__tw_pickup_timer = setTimeout(() => {
            fetchPickupSuggestions(value);
          }, 1000);
        }}
        className="w-full ps-8 pe-10 py-3 rounded-md bg-gray-100 dark:bg-gray-900 text-sm text-townwize-textPrimary dark:text-white placeholder-gray-500 outline-none transition
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-townwize-primary
                        focus-visible:ring-offset-2"
      />

      <button
        type="button"
        onClick={handleGetCurrentLocation}
        className="absolute end-3 top-1/2 -translate-y-1/2 text-townwize-primary hover:text-townwize-primaryDark"
        title={t("useCurrentLocation")}
      >
        <FaCrosshairs className={`dark:text-townwize-bgLight text-base ${locating ? "animate-spin" : ""}`} />
      </button>

      {/* Autocomplete suggestions */}
      {showAutocomplete && (
        <ul className="absolute z-50 start-0 end-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg mt-1 max-h-60 overflow-y-auto">
          {pickupSuggestions.map((p, idx) => (
            <li
              key={p?.placePrediction?.placeId || p.place_id || idx}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => {
                resolvePlace(p, setPickup);
                setPickupSuggestions([]);
                setActiveIndex(-1);
                setShowRecentPickups?.(false);
                if (dropoffRef.current) dropoffRef.current.focus();
              }}
              className={`px-4 py-2 cursor-pointer text-sm ${idx === activeIndex
                ? "bg-townwize-accent text-townwize-primary"
                : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                }`}
            >
              {p?.placePrediction?.text?.text || p.description || p.text}
            </li>
          ))}
        </ul>
      )}

      {/* Recent pickups dropdown */}
      {showRecent && (
        <div className="absolute z-50 start-0 end-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg mt-1 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500">
              Recent pickups
            </p>
          </div>
          <ul className="max-h-56 overflow-y-auto">
            {recentPickups.map((entry) => (
              <li
                key={entry.address}
                onClick={() => onSelectRecentPickup?.(entry)}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 group transition"
              >
                <FaHistory className="shrink-0 text-townwize-primary text-sm" />
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 leading-snug line-clamp-1">
                  {entry.address}
                </span>
                <button
                  type="button"
                  onClick={(e) => onRemoveRecentPickup?.(entry.address, e)}
                  className="shrink-0 p-1 rounded-full opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition"
                  aria-label="Remove"
                >
                  <FaTimes className="text-xs" />
                </button>
              </li>
            ))}
          </ul>
          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClearRecentPickups}
              className="text-xs text-townwize-primary dark:text-townwize-accent hover:underline font-medium"
            >
              Clear history
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PickupField;
