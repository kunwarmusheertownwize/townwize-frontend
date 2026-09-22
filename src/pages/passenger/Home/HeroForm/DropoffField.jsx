import { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const DropoffField = ({
  dropoff,
  setDropoff,
  dropoffSuggestions,
  setDropoffSuggestions,
  fetchDropoffSuggestions,
  dropoffRef,
  resolvePlace,
}) => {
  const { t } = useTranslation();
  const wrapperRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setDropoffSuggestions([]);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setDropoffSuggestions]);

  const handleKeyDown = (e) => {
    if (!dropoffSuggestions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, dropoffSuggestions.length - 1));
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }

    if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const p = dropoffSuggestions[activeIndex];
      resolvePlace(p, setDropoff);
      setDropoffSuggestions([]);
      setActiveIndex(-1);
    }

    if (e.key === "Escape") {
      setDropoffSuggestions([]);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <span className="absolute start-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-townwize-primary z-20 dark:bg-townwize-bgLight" />

      <input
        ref={dropoffRef}
        type="text"
        placeholder={t("dropoffPlaceholder")}
        value={dropoff}
        onKeyDown={handleKeyDown}
        onChange={(e) => {
          const value = e.target.value;
          setDropoff(value);
          setActiveIndex(-1);

          clearTimeout(window.__tw_dropoff_timer);
          window.__tw_dropoff_timer = setTimeout(() => {
            fetchDropoffSuggestions(value);
          }, 200);
        }}
        className="w-full ps-8 pe-3 py-3 rounded-md bg-gray-100 dark:bg-gray-900 text-sm text-townwize-textPrimary dark:text-white placeholder-gray-500 outline-none transition
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-townwize-primary
                        focus-visible:ring-offset-2"
      />

      {dropoffSuggestions.length > 0 && (
        <ul className="absolute z-50 start-0 end-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
          {dropoffSuggestions.map((p, idx) => (
            <li
              key={p?.placePrediction?.placeId || p.place_id || idx}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => {
                resolvePlace(p, setDropoff);
                setDropoffSuggestions([]);
                setActiveIndex(-1);
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

export default DropoffField;
