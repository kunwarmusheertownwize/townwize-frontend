import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// This page is orphaned — phone OTP is handled inline in Register.jsx.
// Redirect anyone who lands here directly back to registration.
const OTPVerify = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/register", { replace: true });
  }, [navigate]);
  return null;
};

export default OTPVerify;
