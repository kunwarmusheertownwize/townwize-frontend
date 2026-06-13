import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const PUBLIC_PASSENGER_ROUTES = [
    "/passenger/home",
    "/passenger/select-ride",
];

const PassengerGuard = ({ children }) => {
    const { user, isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) return null;

    // Logged-in but wrong role → NEVER allow passenger area
    if (user && user.role !== "passenger") {
        return <Navigate to="/unauthorized" replace />;
    }

    // Public passenger pages (only for guests)
    if (!user && PUBLIC_PASSENGER_ROUTES.includes(location.pathname)) {
        return children;
    }

    // Passenger-only pages require login
    if (!user && !isAuthenticated) {
        return <Navigate to="/login" replace />;
    }


    // Valid passenger
    return children;
};

export default PassengerGuard;
