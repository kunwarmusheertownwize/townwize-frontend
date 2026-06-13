import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const Unauthorized = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const goHome = () => {
        if (user?.role === "driver") navigate("/driver/home");
        else if (user?.role === "passenger") navigate("/passenger/home");
        else navigate("/");
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
            <h1 className="text-4xl font-bold mb-3">Access denied</h1>
            <p className="text-gray-600 mb-6">
                You don’t have permission to view this page.
            </p>

            <button
                onClick={goHome}
                className="px-6 py-2 rounded bg-townwize-primary text-white hover:opacity-90 transition"
            >
                Go to your home
            </button>
        </div>
    );
};

export default Unauthorized;
