import { FaCrosshairs } from "react-icons/fa";
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
}) => {
  const { t } = useTranslation();
  const pickupWrapperRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    function handleClickOutside(e) {
      if (pickupWrapperRef.current && !pickupWrapperRef.current.contains(e.target)) {
        setPickupSuggestions([]);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setPickupSuggestions]);

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
    }
  };

  return (
    <div className="relative" ref={pickupWrapperRef}>
      <span className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-townwize-primary z-20 dark:bg-townwize-bgLight" />

      <input
        type="text"
        placeholder={t("pickupPlaceholder")}
        value={pickup}
        onKeyDown={handleKeyDown}
        onChange={(e) => {
          const value = e.target.value;
          setPickup(value);
          setActiveIndex(-1);

          clearTimeout(window.__tw_pickup_timer);
          window.__tw_pickup_timer = setTimeout(() => {
            fetchPickupSuggestions(value);
          }, 1000);
        }}
        className="w-full pl-8 pr-10 py-3 rounded-md bg-gray-100 dark:bg-gray-900 text-sm text-townwize-textPrimary dark:text-white placeholder-gray-500 outline-none transition
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-townwize-primary
                        focus-visible:ring-offset-2"
      />

      <button
        type="button"
        onClick={handleGetCurrentLocation}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-townwize-primary hover:text-townwize-primaryDark"
        title={t("useCurrentLocation")}
      >
        <FaCrosshairs className={`dark:text-townwize-bgLight text-base ${locating ? "animate-spin" : ""}`} />
      </button>

      {pickupSuggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
          {pickupSuggestions.map((p, idx) => (
            <li
              key={p?.placePrediction?.placeId || p.place_id || idx}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => {
                resolvePlace(p, setPickup);
                setPickupSuggestions([]);
                setActiveIndex(-1);
                if (dropoffRef.current) dropoffRef.current.focus();
              }}
              className={`px-4 py-2 cursor-pointer ${idx === activeIndex
                ? "bg-townwize-accent text-townwize-primary"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
            >
              {p?.placePrediction?.text?.text || p.description || p.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PickupField;
