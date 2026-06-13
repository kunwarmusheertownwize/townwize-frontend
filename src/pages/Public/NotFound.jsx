import { useNavigate } from "react-router-dom";

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
            <h1 className="text-4xl font-bold mb-4">404</h1>
            <p className="text-gray-600 mb-6">
                The page you’re looking for doesn’t exist or was moved.
            </p>

            <button
                onClick={() => navigate("/")}
                className="px-6 py-2 rounded bg-townwize-primary text-white hover:opacity-90 transition"
            >
                Go to Home
            </button>
        </div>
    );
};

export default NotFound;
