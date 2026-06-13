// File: townwize-frontend/src/pages/passenger/Home/FeaturesSection.jsx

import React from "react";
import { useTranslation } from "react-i18next";


const FeaturesSection = () => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
      <div className="card text-center hover:shadow-none transition">
        <img src="/images/private-ride.png" alt={t("privateRideAlt")} className="mx-auto h-24 mb-4" />
        <h3 className="font-semibold text-lg text-townwize-textPrimary dark:text-white mb-2">
          {t("privateRidesTitle")}
        </h3>
        <p className="text-sm">{t("privateRidesDesc")}</p>
      </div>

      <div className="card text-center hover:shadow-lg transition">
        <img src="/images/pool-ride.png" alt={t("rideTogetherAlt")} className="mx-auto h-24 mb-4" />
        <h3 className="font-semibold text-lg text-townwize-textPrimary dark:text-white mb-2">
          {t("rideTogetherTitle")}
        </h3>
        <p className="text-sm">{t("rideTogetherDesc")}</p>
      </div>

      <div className="card text-center hover:shadow-lg transition">
        <img src="/images/safety.png" alt={t("safetyAlt")} className="mx-auto h-24 mb-4" />
        <h3 className="font-semibold text-lg text-townwize-textPrimary dark:text-white mb-2">
          {t("safetyTitle")}
        </h3>
        <p className="text-sm">{t("safetyDesc")}</p>
      </div>
    </div>
  );
};

export default FeaturesSection;
