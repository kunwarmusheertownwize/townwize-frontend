import { useRef, useEffect, useState } from "react";
import { FaTimes, FaCrosshairs, FaMapMarkerAlt, FaHistory } from "react-icons/fa";

const LocationField = ({
  label,
  value,
  onChange,
  onClear,
  onGPS,
  onMap,
  suggestions,
  setSuggestions,
  onSelect,
  fetchSuggestions,
  onFocus: onFocusProp,
  icon,
}) => {
  const debounceTimeout = useRef(null);
  const wrapperRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    setActiveIndex(-1);

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    debounceTimeout.current = setTimeout(() => {
      if (val.length > 2 && fetchSuggestions) {
        fetchSuggestions(val, setSuggestions);
      } else {
        setSuggestions([]);
      }
    }, 200);
  };

  const handleFocus = () => {
    setActiveIndex(-1);
    if (label.toLowerCase().includes("pickup")) {
      setSuggestions([
        { type: "gps", text: "Use current location" },
        { type: "map", text: "Set location on map" },
      ]);
    } else {
      setSuggestions([{ type: "map", text: "Set location on map" }]);
    }
    onFocusProp?.();
  };

  const handleKeyDown = (e) => {
    if (!suggestions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }

    if (e.key === "Enter") {
      // 🚫 Do nothing unless user explicitly selected a suggestion
      if (activeIndex < 0) return;

      e.preventDefault();
      const s = suggestions[activeIndex];

      if (s.type === "gps") onGPS();
      else if (s.type === "map") onMap();
      else onSelect(s);

      setSuggestions([]);
      setActiveIndex(-1);
    }

    if (e.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
    }
  };

  useEffect(() => {
    const close = (e) => {
      if (!wrapperRef.current?.contains(e.target)) {
        setSuggestions([]);
        setActiveIndex(-1);
      }
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [setSuggestions]);

  return (
    <div className="w-full" ref={wrapperRef}>
      <div className="relative">
        <label className="block text-townwize-textPrimary dark:text-white font-semibold mb-1">
          {label}
        </label>

        <div className="flex items-center bg-white dark:bg-townwize-bgDark px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 focus-within:ring-2 focus-within:ring-townwize-primary transition-all">
          {icon}
          <input
            type="text"
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={`Enter ${label.toLowerCase()}`}
            className="w-full bg-transparent outline-none text-sm text-townwize-textPrimary dark:text-white"
          />
          {value && (
            <FaTimes
              className="ms-2 cursor-pointer text-gray-500 hover:text-gray-700"
              onClick={onClear}
            />
          )}
        </div>
      </div>

      {suggestions.length > 0 && (
        <ul className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
          {suggestions.map((s, idx) => {
            let displayIcon = <FaMapMarkerAlt className="text-gray-500 text-lg" />;
            let subtitle = s.description;

            if (s.type === "gps") {
              displayIcon = <FaCrosshairs className="text-townwize-primary text-lg" />;
              subtitle = "It provides your pickup address";
            } else if (s.type === "map") {
              displayIcon = <FaMapMarkerAlt className="text-townwize-primary text-lg" />;
              subtitle = "Pick location directly from map";
            } else if (s.isRecent) {
              displayIcon = <FaHistory className="text-gray-400 text-base" />;
              subtitle = "Recent pickup";
            }

            return (
              <li
                key={s.placeId || s.text || idx}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => {
                  if (s.type === "gps") onGPS();
                  else if (s.type === "map") onMap();
                  else onSelect(s);
                  setSuggestions([]);
                  setActiveIndex(-1);
                }}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer
                  ${idx === activeIndex
                    ? "bg-townwize-accent text-townwize-primary"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
              >
                <div className="mt-1">{displayIcon}</div>
                <div>
                  <div className="text-sm font-medium text-townwize-textPrimary dark:text-white">
                    {s.text || s.description}
                  </div>
                  {subtitle && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {subtitle}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default LocationField;
