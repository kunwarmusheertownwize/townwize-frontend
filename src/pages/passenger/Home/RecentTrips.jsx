// File: townwize-frontend/src/pages/passenger/Home/RecentTrips.jsx

import React from "react";
import { useTranslation } from "react-i18next";

const RecentTrips = () => {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-none space-y-1 mt-6">
      <h2 className="text-md font-semibold">{t("recentTripsTitle")}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {t("noRecentTrips")}
      </p>
    </div>
  );
};

export default RecentTrips;
