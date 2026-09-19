// 📄 src/routes/AppRoutes.jsx
import { Routes, Route } from "react-router-dom";
import Landing from "../pages/Landing";
import NotFound from "../pages/Public/NotFound";
import Unauthorized from "../pages/Public/Unauthorized";
import About from "../pages/Public/About";
import Support from "../pages/Public/Support";
import Guidelines from "../pages/Public/Guidelines";
import Privacy from "../pages/Public/Privacy";
import Terms from "../pages/Public/Terms";
import Refunds from "../pages/Public/Refunds";
import Pricing from "../pages/Public/Pricing";
import DeleteAccount from "../pages/Public/DeleteAccount";
import PaymentReturn from "../pages/passenger/Payment/PaymentReturn";
import PaymentComplete from "../pages/Public/PaymentComplete";
import ConfirmPrecinct from "../pages/Public/ConfirmPrecinct";
import Careers from "../pages/Public/Careers";
import Community from "../pages/Public/Community";

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
import FaceVerifyHandoff from "../pages/auth/FaceVerifyHandoff";
import Booking from "../pages/passenger/Booking/Booking";
import PassengerDashboard from "../pages/passenger/Dashboard/PassengerDashboard";
import PassengerAccount from "../pages/passenger/Account/Account";
import PassengerSettings from "../pages/passenger/Settings/Settings";
import PassengerTripReceipt from "../pages/passenger/TripSummary/PassengerTripReceipt";
import PassengerSupport from "../pages/passenger/Support/Support";
import ScheduledRides from "../pages/passenger/ScheduledRides/ScheduledRides";

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

import ErrorBoundary from "../components/common/ErrorBoundary";

// Live tracking is the highest-stakes screen in the product: it runs for the
// whole trip, on the most varied data, on the device most likely to be offline
// or low on memory. It gets its own boundary so a crash there cannot take the
// rest of the app down with it, and offers a trip-appropriate recovery message.
const TrackingBoundary = ({ children, homePath }) => (
  <ErrorBoundary
    title="Live tracking hit a problem"
    message="Your trip is still active and your fare is unaffected. Tap Try again to reload the map."
    homePath={homePath}
  >
    {children}
  </ErrorBoundary>
);


const AppRoutes = () => {
  return (
    <DriverModeProvider>
      <Routes>

        {/* Landing */}
        <Route path="/" element={<Landing />} />

        {/* Public pages */}
        <Route path="/about"      element={<About />} />
        <Route path="/support"    element={<Support />} />
        <Route path="/guidelines" element={<Guidelines />} />
        <Route path="/privacy"    element={<Privacy />} />
        <Route path="/terms"      element={<Terms />} />
        {/* Both must stay public and unguarded — a payment-provider or app-store
            reviewer checks these without an account. */}
        <Route path="/refunds"    element={<Refunds />} />
        <Route path="/pricing"    element={<Pricing />} />
        {/* Google Play requires a PUBLIC account-deletion URL, reachable without
            reinstalling the app, and it is submitted in the Data safety form.
            Must stay unguarded: a reviewer opens it signed out. */}
        <Route path="/delete-account" element={<DeleteAccount />} />
        {/* Where Safepay's checkout returns to. MUST stay public — the payment
            tab has no session, so a guarded route sends a passenger who just
            paid to the login screen. */}
        {/* Safepay appends its own return params with "?" WITHOUT checking for an
            existing query string, so a redirect_url of
            /payment-complete?ride=<id> comes back as
            /payment-complete?ride=<id>?order_id=... — two question marks, and
            the ride id parses with the rest glued onto it. Carrying the ride in
            the PATH leaves our URL query-free, so their "?" appends cleanly.
            The bare path stays for links already in flight. */}
        <Route path="/payment-complete" element={<PaymentComplete />} />
        <Route path="/payment-complete/:rideId" element={<PaymentComplete />} />
        <Route path="/payment-complete/:rideId/:state" element={<PaymentComplete />} />

        {/* Signed link from the waitlist "confirm your precinct" email. Public on
            purpose: the signature in the link is the authorisation, and asking
            someone to log in to fix one field is why the July email failed. */}
        <Route path="/confirm-precinct" element={<ConfirmPrecinct />} />
        <Route path="/careers"    element={<Careers />} />
        <Route path="/community"  element={<Community />} />

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
          {/* Landing spots after Safepay hosted checkout. Both just poll our
              own backend — the redirect itself is never treated as payment. */}
          <Route path="/passenger/payment/return" element={<PaymentReturn />} />
          <Route path="/passenger/payment/cancelled" element={<PaymentReturn />} />
          <Route
            path="/passenger/live-tracking/:rideId"
            element={
              <TrackingBoundary homePath="/passenger/home">
                <LiveTracking />
              </TrackingBoundary>
            }
          />
          <Route path="/passenger/booking" element={<Booking />} />
          <Route path="/passenger/trips" element={<PassengerTrips />} />
          <Route path="/passenger/support" element={<PassengerSupport />} />
          <Route path="/passenger/scheduled-rides" element={<ScheduledRides />} />
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
        {/* Face verification hand-off — opened by scanning the QR on desktop.
            Public: it runs before the account exists. */}
        <Route path="/face-verify/:token" element={<FaceVerifyHandoff />} />

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
          <Route
            path="live-tracking"
            element={
              <TrackingBoundary homePath="/driver/home">
                <DriverLiveTracking />
              </TrackingBoundary>
            }
          />
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
