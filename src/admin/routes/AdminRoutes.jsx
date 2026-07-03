// File: townwize-frontend\src\admin\routes\AdminRoutes.jsx

import { Route } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";

import AdminDashboard from "../pages/Dashboard/AdminDashboard";
import RidesList from "../pages/Rides/RidesList";
import DriversList from "../pages/Drivers/DriversList";
import PassengersList from "../pages/Passengers/PassengersList";
import CasesList from "../pages/Cases/CasesList";
import TicketsList from "../pages/Support/TicketsList";
import NotificationsList from "../pages/Notifications/NotificationsList";
import FinanceDashboard from "../pages/Finance/FinanceDashboard";
import AdminUsers from "../pages/Settings/AdminUsers";
import AuditLogs from "../pages/Audit/AuditLogs";

import TransactionsTable from "../pages/Finance/TransactionsTable";
import PayoutBatches from "../pages/Finance/PayoutBatches";
import DriverPayoutRequests from "../pages/Finance/DriverPayoutRequests";
import FeatureFlags from "../pages/Settings/FeatureFlags";
import Zones from "../pages/Settings/Zones";
import PricingSettings from "../pages/Settings/PricingSettings";
import CancellationPolicy from "../pages/Settings/CancellationPolicy";
import ReferralDashboard from "../pages/Referral/ReferralDashboard";
import WaitlistPage from "../pages/Waitlist/WaitlistPage";

export default function AdminRoutes() {
    return (
        <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />

            <Route path="rides" element={<RidesList />} />
            <Route path="cases" element={<CasesList />} />
            <Route path="drivers" element={<DriversList />} />
            <Route path="passengers" element={<PassengersList />} />
            <Route path="support" element={<TicketsList />} />
            <Route path="notifications" element={<NotificationsList />} />

            <Route path="finance" element={<FinanceDashboard />} />
            <Route path="finance/transactions" element={<TransactionsTable />} />
            <Route path="finance/payouts" element={<PayoutBatches />} />
            <Route path="finance/driver-payouts" element={<DriverPayoutRequests />} />

            <Route path="settings/users" element={<AdminUsers />} />
            <Route path="settings/features" element={<FeatureFlags />} />
            <Route path="settings/zones" element={<Zones />} />
            <Route path="settings/pricing" element={<PricingSettings />} />
            <Route path="settings/cancellation" element={<CancellationPolicy />} />

            <Route path="referral" element={<ReferralDashboard />} />
            <Route path="waitlist" element={<WaitlistPage />} />

            <Route path="audit" element={<AuditLogs />} />
        </Route>
    );
}
