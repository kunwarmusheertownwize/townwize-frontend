// 📄 src/pages/auth/ForgotPassword.jsx

import { FaEnvelope } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import React, { useState } from 'react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleReset = () => {
    if (!email) {
      toast.error("Email is required");
      return;
    }

    // Simulated reset logic
    toast.success("Reset link sent to your email");
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-6">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          Forgot Password?
        </h2>

        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          Enter your email to receive a reset link
        </p>

        {/* Email Input */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email</label>
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded px-3 py-2">
            <FaEnvelope className="mr-2 text-gray-500" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              className="w-full bg-transparent outline-none text-sm text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleReset}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold shadow"
        >
          Send Reset Link
        </button>

        {/* Back to Login */}
        <div className="text-sm text-center">
          Remembered your password?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-blue-600 hover:underline font-medium"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
