import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

// NOTE: There is deliberately no development bypass here.
// A VITE_DEV_ADMIN escape hatch previously existed and was found enabled in
// .env.production — exposing the whole admin panel publicly. Never reintroduce
// an env-controlled path that skips these checks.
export default function AdminGuard() {
    const { isAuthenticated, role } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (role !== "admin") {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
}
