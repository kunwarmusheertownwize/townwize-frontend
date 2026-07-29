import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

// NOTE: There is deliberately no development bypass here.
// A VITE_DEV_ADMIN escape hatch previously existed and was found enabled in
// .env.production — exposing the whole admin panel publicly. Never reintroduce
// an env-controlled path that skips these checks.
export default function AdminGuard() {
    const { isAuthenticated, role, loading } = useAuth();

    // AuthContext restores the session from localStorage inside a useEffect,
    // which runs AFTER the first render. Without this the guard sees
    // isAuthenticated as false on that first pass and bounces a signed-in admin
    // to /login on every refresh. PassengerGuard and DriverGuard already do this.
    if (loading) return null;

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (role !== "admin") {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
}
