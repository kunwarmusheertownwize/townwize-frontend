import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaWallet, FaMoneyBillWave, FaCreditCard, FaChevronRight } from "react-icons/fa";
import api from "../../../../services/api";

/**
 * Card availability comes from the server, never from a hardcoded promise.
 *
 * This panel said "Digital payments (JazzCash, Easypaisa) coming soon" and a
 * toast on the Profile screen said "Rides are currently cash only" — while
 * card payments were live in production and a passenger could already be
 * charged by card at the end of a trip. The same bug had been fixed once in
 * Wallet.jsx and these two copies were missed.
 *
 * An app contradicting itself about money is the fastest way to lose the
 * benefit of the doubt, so every surface that mentions payment methods asks
 * the same endpoint the booking screen asks.
 */
const WalletSummary = () => {
  const [cardLive, setCardLive] = useState(false);

  useEffect(() => {
    let mounted = true;
    api
      .get("/payments/methods")
      .then((res) => {
        const card = (res?.data?.data?.methods || []).find((m) => m.id === "card");
        if (mounted) setCardLive(Boolean(card?.available));
      })
      // Assume not live. Never promise what we cannot deliver.
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  return (
    <div className="bg-white dark:bg-townwize-primaryDark border-t-4 border-townwize-primary rounded-xl shadow-md p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-townwize-primary dark:text-townwize-accent">
          Payment
        </h2>
        <FaWallet className="text-townwize-primary dark:text-townwize-accent text-xl" />
      </div>

      <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 shrink-0 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
          <FaMoneyBillWave className="text-green-600 dark:text-green-400 text-sm" />
        </div>
        <div>
          <p className="text-xs font-bold text-green-700 dark:text-green-400">Cash on Ride — Active</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pay your Wizer at the end of each ride</p>
        </div>
      </div>

      {cardLive && (
        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <FaCreditCard className="text-blue-600 dark:text-blue-400 text-sm" />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-700 dark:text-blue-400">Card — Active</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pay securely when your trip ends</p>
          </div>
        </div>
      )}

      <Link
        to="/passenger/wallet"
        className="flex items-center justify-between text-xs font-medium text-townwize-primary dark:text-townwize-accent hover:underline pt-1"
      >
        View payment details
        <FaChevronRight className="text-[10px]" />
      </Link>
    </div>
  );
};

export default WalletSummary;
