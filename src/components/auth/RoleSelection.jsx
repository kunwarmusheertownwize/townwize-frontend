// /src/components/auth/RoleSelection.jsx
import { UserIcon } from "@heroicons/react/24/solid";
import { FaCarSide } from "react-icons/fa";

export default function RoleSelection({ role, setRole, mode }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      <button
        type="button"
        onClick={() => setRole("passenger")}
        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border font-medium ${role === "passenger"
          ? "bg-townwize-primary text-white border-townwize-primary"
          : "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"
          }`}
      >
        <UserIcon
          className={`w-5 h-5 ${role === "passenger"
            ? "text-white"
            : "text-gray-700 dark:text-gray-200"
            }`}
        />
        Passenger
      </button>

      <button
        type="button"
        onClick={() => setRole("driver")}
        disabled={mode === "referral"}
        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border font-medium ${role === "driver"
            ? "bg-townwize-primary text-white border-townwize-primary"
            : "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"
          } ${mode === "referral" ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <FaCarSide
          className={`w-5 h-5 ${role === "driver"
              ? "text-white"
              : "text-gray-700 dark:text-gray-200"
            }`}
        />
        Driver
      </button>
    </div>
  );
}
