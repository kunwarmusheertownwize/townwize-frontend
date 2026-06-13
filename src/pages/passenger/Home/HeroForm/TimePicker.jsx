// File: src/pages/passenger/Home/HeroForm/TimePicker.jsx
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from "@headlessui/react";
import { FaClock } from "react-icons/fa";
import { useTranslation } from "react-i18next";

const TimePicker = ({ pickupTime, setPickupTime, timeSlots }) => {
  const { t } = useTranslation();

  return (
    <Listbox value={pickupTime} onChange={setPickupTime}>
      <div className="relative w-full">
        <ListboxButton className="flex items-center px-4 py-3 rounded-md bg-gray-100 dark:bg-gray-900 w-full text-sm text-townwize-textPrimary dark:text-white cursor-pointer">
          <FaClock className="text-townwize-primary dark:text-townwize-bgLight text-base mr-3 ml-2" />
          {timeSlots.find((s) => s.value === pickupTime)?.label || t("now")}
        </ListboxButton>

        <ListboxOptions className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-townwize-primaryDark py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none text-sm">
          {timeSlots.map((s) => (
            <ListboxOption
              key={s.value}
              value={s.value}
              className={({ active, selected }) =>
                `cursor-pointer select-none relative py-2 pl-10 pr-4
                ${active ? "bg-townwize-accent text-townwize-primary" : "text-gray-900 dark:text-white"}
                ${selected ? "font-semibold" : "font-normal"}`
              }
            >
              {s.label}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
};

export default TimePicker;
