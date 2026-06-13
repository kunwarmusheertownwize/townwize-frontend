// File: src/pages/passenger/Home/HeroForm/ConfirmButton.jsx
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

const ConfirmButton = ({ dropoff, handleFindRide, rideConfirmed, setRideConfirmed }) => {
    const { t } = useTranslation();
    return (
        <button
            onClick={() => {
                if (!dropoff.trim()) {
                    toast.error(t("enterDropoffWarning"));
                    return;
                }
                handleFindRide();
                setRideConfirmed(true);
            }}
            className={`w-full py-3 rounded-md font-medium transition
        ${rideConfirmed ? "btn-success" : "bg-townwize-primary hover:bg-townwize-primaryDark text-white"}`}
        >
            {rideConfirmed ? t("rideConfirmed") : t("findRides")}
        </button>
    );
};

export default ConfirmButton;
