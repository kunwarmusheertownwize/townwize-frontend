// File: townwize-frontend/src/pages/passenger/Home/AppPromo.jsx

import React from "react";
import { FaApple, FaGooglePlay } from "react-icons/fa";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";

const AppPromo = () => {
  const { t } = useTranslation();

  return (
    <div className="card-app-download mt-10">
      <h2 className="text-2xl font-bold text-townwize-textPrimary dark:text-white mb-2 text-center">
        {t("appPromoTitle")}
      </h2>
      <p className="text-sm text-townwize-textSecondary dark:text-townwize-textContent mb-6 text-center">
        {t("appPromoSubtitle")}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Passenger App */}
        <div className="flex items-center justify-between bg-white dark:bg-townwize-primaryDark rounded-xl p-6 shadow-none">
          <QRCodeSVG value="https://townwize.com/passenger-app" size={150} />
          <div className="flex flex-col items-start ml-4">
            <h3 className="text-lg font-semibold text-townwize-textPrimary dark:text-white">
              {t("passengerAppTitle")}
            </h3>
            <p className="text-sm text-townwize-textSecondary dark:text-gray-300">
              {t("scanToStart")}
            </p>
            <div className="flex gap-2 mt-2">
              <a
                href="https://townwize.com/passenger-ios"
                className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg"
              >
                <FaApple className="text-lg" /> {t("ios")}
              </a>
              <a
                href="https://townwize.com/passenger-android"
                className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg"
              >
                <FaGooglePlay className="text-lg" /> {t("android")}
              </a>
            </div>
          </div>
        </div>

        {/* Driver App */}
        <div className="flex items-center justify-between bg-white dark:bg-townwize-primaryDark rounded-xl p-6 shadow-none">
          <QRCodeSVG value="https://townwize.com/driver-app" size={150} />
          <div className="flex flex-col items-start ml-4">
            <h3 className="text-lg font-semibold text-townwize-textPrimary dark:text-white">
              {t("driverAppTitle")}
            </h3>
            <p className="text-sm text-townwize-textSecondary dark:text-gray-300">
              {t("scanToStart")}
            </p>
            <div className="flex gap-2 mt-2">
              <a
                href="https://townwize.com/driver-ios"
                className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg"
              >
                <FaApple className="text-lg" /> {t("ios")}
              </a>
              <a
                href="https://townwize.com/driver-android"
                className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg"
              >
                <FaGooglePlay className="text-lg" /> {t("android")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

  );
};

export default AppPromo;
