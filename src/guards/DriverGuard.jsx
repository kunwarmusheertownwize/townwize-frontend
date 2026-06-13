// src/guards/DriverGuard.jsx

import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const DriverGuard = ({ children }) => {
    const { user, isAuthenticated, loading } = useAuth();

    if (loading) return null;

    if (!user && !isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user && user.role !== "driver") {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default DriverGuard;

