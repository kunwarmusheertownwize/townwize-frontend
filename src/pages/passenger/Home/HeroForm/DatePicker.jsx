// File: src/pages/passenger/Home/HeroForm/DatePicker.jsx
import { Popover } from "@headlessui/react";
import { FaCalendarAlt } from "react-icons/fa";
import { format, subMonths, addMonths, isBefore, isSameDay } from "date-fns";
import { useTranslation } from "react-i18next";

const DatePicker = ({ pickupDate, setPickupDate, month, setMonth, generateCalendar }) => {
  const { t } = useTranslation();

  return (
    <Popover className="relative w-full">
      <Popover.Button className="flex items-center px-4 py-3 rounded-md bg-gray-100 dark:bg-gray-900 w-full text-sm text-townwize-textPrimary dark:text-white cursor-pointer">
        <FaCalendarAlt className="text-townwize-primary dark:text-townwize-bgLight text-base mr-3 ml-2" />
        {format(pickupDate, "MMM d, yyyy")}
      </Popover.Button>

      <Popover.Panel className="absolute z-10 mt-2 bg-white dark:bg-townwize-primaryDark rounded-xl shadow-lg p-4">
        {/* Calendar header */}
        <div className="flex justify-between items-center mb-2">
          <button
            type="button"
            onClick={() => setMonth(subMonths(month, 1))}
            className="px-2 text-townwize-primary dark:text-townwize-accent"
          >
            ‹
          </button>
          <span className="font-semibold text-townwize-primary dark:text-townwize-accent">
            {format(month, "MMMM yyyy")}
          </span>
          <button
            type="button"
            onClick={() => setMonth(addMonths(month, 1))}
            className="px-2 text-townwize-primary dark:text-townwize-accent"
          >
            ›
          </button>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {t("weekdays", { returnObjects: true }).map((d, i) => (
            <div key={i} className="text-xs font-medium text-townwize-accent">
              {d}
            </div>
          ))}

          {generateCalendar(month).map((day, i) => {
            const disabled = isBefore(day, new Date().setHours(0, 0, 0, 0));
            const selected = isSameDay(day, pickupDate);
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => setPickupDate(day)}
                className={`w-9 h-9 rounded-full text-sm flex items-center justify-center
                  ${disabled
                    ? "text-gray-400 cursor-not-allowed"
                    : selected
                      ? "bg-townwize-primary text-white"
                      : "hover:bg-townwize-accent hover:text-townwize-primary"
                  }`}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </Popover.Panel>
    </Popover>
  );
};

export default DatePicker;
