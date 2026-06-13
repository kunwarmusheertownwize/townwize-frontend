import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const DEV_ADMIN_BYPASS = import.meta.env.VITE_DEV_ADMIN === "true";

export default function AdminGuard() {
    const { isAuthenticated, role } = useAuth();

    if (DEV_ADMIN_BYPASS) {
        return <Outlet />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (role !== "admin") {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
}
