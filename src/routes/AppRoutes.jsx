// 📄 src/routes/AppRoutes.jsx
import { Routes, Route } from "react-router-dom";
import Landing from "../pages/Landing";
import NotFound from "../pages/Public/NotFound";
import Unauthorized from "../pages/Public/Unauthorized";

// Layouts
import PassengerLayout from "../layouts/PassengerLayout";
import PassengerAppLayout from "../layouts/PassengerAppLayout";
import { isNative } from "../utils/platform";
import MobileHome from "../pages/passenger/Home/MobileHome";
import DriverLayout from "../layouts/DriverLayout";
import AuthGuard from "../components/auth/AuthHeader";

// Admin
import AdminRoutes from "../admin/routes/AdminRoutes";
import AdminGuard from "../admin/guards/AdminGuard";

// Passenger Screens
import Home from "../pages/passenger/Home/Home";
import Register from "../pages/auth/Register";
import SelectRide from "../pages/passenger/Booking/SelectRide";
import RideTogether from "../pages/passenger/RideTogether/RideTogether";
import TripSummary from "../pages/passenger/TripSummary/TripSummary";
import LiveTracking from "../pages/passenger/LiveTracking/LiveTracking";
import PassengerTrips from "../pages/passenger/Trips/Trips";
import Notifications from "../pages/passenger/Notifications/Notifications";
import Wallet from "../pages/passenger/Wallet/Wallet";
import Profile from "../pages/passenger/Profile/Profile";
import TripRequest from "../pages/passenger/TripRequest/TripRequest";
import Login from "../pages/auth/Login";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import OTPVerify from "../pages/auth/OTPVerify";
import VerifyEmail from "../pages/auth/VerifyEmail";
import Booking from "../pages/passenger/Booking/Booking";
import PassengerDashboard from "../pages/passenger/Dashboard/PassengerDashboard";
import PassengerAccount from "../pages/passenger/Account/Account";
import PassengerSettings from "../pages/passenger/Settings/Settings";
import PassengerTripReceipt from "../pages/passenger/TripSummary/PassengerTripReceipt";
import PassengerSupport from "../pages/passenger/Support/Support";

// Driver Screens
import DriverHome from "../pages/driver/Home/Home";
import DriverRegister from "../pages/driver/Register/Register";
import TripRequests from "../pages/driver/TripRequests/TripRequests";
import DriverLiveTracking from "../pages/driver/LiveTracking/DriverLiveTracking";
import DriverEarnings from "../pages/driver/Earnings/Earnings";
import DriverSupport from "../pages/driver/Support/Support";
import Trips from "../pages/driver/Trips/Trips";
import DriverNotifications from "../pages/driver/Notifications/Notifications";
import DriverProfile from "../pages/driver/Profile/Profile";
import DriverSettings from "../pages/driver/Settings/Settings";
import DriverTripSummary from "../pages/driver/TripSummary/DriverTripSummary";

// Driver Context
import { DriverModeProvider } from "../contexts/DriverModeContext";

// Guards
import DriverGuard from "../guards/DriverGuard";
import PassengerGuard from "../guards/PassengerGuard";
import PassengerToDriverGuard from "../guards/PassengerToDriverGuard";


const AppRoutes = () => {
  return (
    <DriverModeProvider>
      <Routes>

        {/* Landing */}
        <Route path="/" element={<Landing />} />

        {/* ---------------------------- */}
        {/* PASSENGER WEB (Single Layout) */}
        {/* ---------------------------- */}
        <Route
          element={
            <PassengerGuard>
              <PassengerLayout />
            </PassengerGuard>
          }
        >
          <Route path="/passenger/home" element={isNative() ? <MobileHome /> : <Home />} />

          {/* Dashboard pages */}
          <Route path="/passenger/dashboard" element={<PassengerDashboard />} />
          <Route path="/passenger/wallet" element={<Wallet />} />
          <Route path="/passenger/profile" element={<Profile />} />
          <Route path="/passenger/notifications" element={<Notifications />} />
          <Route path="/passenger/account" element={<PassengerAccount />} />
          <Route path="/passenger/settings" element={<PassengerSettings />} />

          {/* Booking flow */}
          <Route path="/passenger/select-ride" element={<SelectRide />} />
          <Route path="/passenger/ride-together" element={<RideTogether />} />
          <Route path="/passenger/trip-summary" element={<TripSummary />} />
          <Route path="/passenger/trip-receipt/:rideId" element={<PassengerTripReceipt />} />
          <Route path="/passenger/trip-request" element={<TripRequest />} />
          <Route path="/passenger/live-tracking/:rideId" element={<LiveTracking />}
          />
          <Route path="/passenger/booking" element={<Booking />} />
          <Route path="/passenger/trips" element={<PassengerTrips />} />
          <Route path="/passenger/support" element={<PassengerSupport />} />
        </Route>

        {/* ---------------------------- */}
        {/* AUTH SCREENS (stand-alone)   */}
        {/* ---------------------------- */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/invite/:code" element={<Register />} />
        <Route path="/verify" element={<OTPVerify />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/*Driver Registration */}
        <Route path="/driver/register" element={<DriverRegister />} />


        {/* ---------------------------- */}
        {/* PASSENGER APP (Mobile / PWA) */}
        {/* ---------------------------- */}
        <Route
          element={
            <PassengerGuard>
              <PassengerAppLayout />
            </PassengerGuard>
          }
        >
          <Route path="/app/passenger/dashboard" element={<PassengerDashboard />} />
          <Route path="/app/passenger/select-ride" element={<SelectRide />} />
          <Route path="/app/passenger/notifications" element={<Notifications />} />
          <Route path="/app/passenger/profile" element={<Profile />} />
          <Route path="/app/passenger/trips" element={<PassengerTrips />} />
        </Route>

        {/* ---------------------------- */}
        {/* DRIVER ROUTES                */}
        {/* ---------------------------- */}
        <Route
          path="/driver"
          element={
            <PassengerToDriverGuard>
              <DriverGuard role="driver">
                <DriverLayout />
              </DriverGuard>
            </PassengerToDriverGuard>
          }
        >

          <Route index element={<DriverHome />} />
          <Route path="home" element={<DriverHome />} />
          <Route path="profile" element={<DriverProfile />} />
          <Route path="earnings" element={<DriverEarnings />} />
          <Route path="trips" element={<Trips />} />
          <Route path="trip-requests" element={<TripRequests />} />
          <Route path="live-tracking" element={<DriverLiveTracking />} />
          <Route path="trip-summary" element={<DriverTripSummary />} />

          <Route path="notifications" element={<DriverNotifications />} />
          <Route path="support" element={<DriverSupport />} />
          <Route path="settings" element={<DriverSettings />} />
        </Route>

        {/* ---------------------------- */}
        {/* ADMIN ROUTES                 */}
        {/* ---------------------------- */}

        <Route path="/admin" element={<AdminGuard />}>
          {AdminRoutes()}
        </Route>


        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* ---------------------------- */}
        {/* 404 — Catch All              */}
        {/* ---------------------------- */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </DriverModeProvider>
  );
};


export default AppRoutes;
