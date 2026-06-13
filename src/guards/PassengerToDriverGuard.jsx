import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const PassengerToDriverGuard = ({ children }) => {
    const { user, isAuthenticated, loading } = useAuth();

    if (loading) return null;

    // Not logged in → login
    if (!user && !isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Passenger must NEVER enter driver area
    if (user && user.role === "passenger") {

        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

export default PassengerToDriverGuard;
