// File: townwize-frontend/src/pages/passenger/Home/ReferralNotice.jsx

import React from "react";
import { useTranslation } from "react-i18next";

const ReferralNotice = () => {
  const { t } = useTranslation();
  return (
    <div className="text-base text-townwize-textPrimary dark:text-townwize-textContent text-center mt-6 font-medium">
      {t("referralNoticeText")}{" "}
      <span className="link-sub-secondary dark:link-secondary font-semibold underline cursor-not-allowed">
        {t("useReferralLink")}
      </span>
    </div>
  );
};

export default ReferralNotice;
