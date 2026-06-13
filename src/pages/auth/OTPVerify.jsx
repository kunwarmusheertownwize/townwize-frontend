import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const OTPVerify = () => {
  const navigate = useNavigate();
  const inputRefs = useRef([]);
  const [cooldown, setCooldown] = useState(0);
  const [otp, setOtp] = useState(['', '', '', '']);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) clearInterval(timer);
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus first box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (e, index) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 1); // digits only
    const updated = [...otp];
    updated[index] = val;
    setOtp(updated);

    if (val && index < 3) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!paste) return;
    const chars = paste.split('');
    const updated = ['','','',''];
    chars.forEach((ch, i) => updated[i] = ch);
    setOtp(updated);
    setTimeout(() => {
      inputRefs.current[chars.length - 1]?.focus();
    }, 10);
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    toast.success('OTP has been resent');
    setCooldown(30);
  };

  const handleSubmit = () => {
    const code = otp.join('');
    if (code.length !== 4) return toast.error('Enter 4-digit code');
    // TODO: Verify OTP via backend
    toast.success('Verified!');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-6">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          Verify Your Code
        </h2>

        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          Enter the 4-digit code sent to your phone/email
        </p>

        {/* OTP Boxes */}
        <div onPaste={handlePaste} className="flex justify-between gap-2">
          {[0, 1, 2, 3].map((_, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              value={otp[i]}
              onChange={(e) => handleChange(e, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              type="text"
              maxLength="1"
              inputMode="numeric"
              className="w-12 h-12 text-center text-xl border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          ))}
        </div>

        {/* Verify Button */}
        <button
          onClick={handleSubmit}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold shadow"
        >
          Verify
        </button>

        {/* Resend */}
        <div className="text-sm text-center">
          Didn’t receive it?{' '}
          <button
            onClick={handleResend}
            disabled={cooldown > 0}
            className={`font-medium ${
              cooldown > 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:underline'
            }`}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OTPVerify;
