import React, { useContext } from "react";
import ActiveRideCard from "./sections/ActiveRideCard";
import QuickActions from "./sections/QuickActions";
import RecentTrips from "./sections/RecentTrips";
import WalletSummary from "./sections/WalletSummary";
import NotificationsPreview from "./sections/NotificationsPreview";
import AuthContext from "../../../contexts/AuthContext";

const PassengerDashboard = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="space-y-6 px-4 md:px-8 py-6">
      {/* Header */}
      <div className="text-start mb-4">
        <h1 className="text-2xl font-bold text-townwize-primary dark:text-townwize-accent">
          Welcome back{user?.name ? `, ${user.name}` : ""}!
        </h1>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Here’s an overview of your activity and account.
        </p>
      </div>

      {/* Dashboard Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <ActiveRideCard />
          <QuickActions />
          <RecentTrips />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <WalletSummary />
          <NotificationsPreview />
        </div>
      </div>
    </div>
  );
};

export default PassengerDashboard;
