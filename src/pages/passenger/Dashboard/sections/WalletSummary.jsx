import { Link } from "react-router-dom";
import { FaWallet, FaMoneyBillWave, FaChevronRight } from "react-icons/fa";

const WalletSummary = () => {
  return (
    <div className="bg-white dark:bg-townwize-primaryDark border-t-4 border-townwize-primary rounded-xl shadow-md p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-townwize-primary dark:text-townwize-accent">
          Wallet
        </h2>
        <FaWallet className="text-townwize-primary dark:text-townwize-accent text-xl" />
      </div>

      <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 shrink-0 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
          <FaMoneyBillWave className="text-green-600 dark:text-green-400 text-sm" />
        </div>
        <div>
          <p className="text-xs font-bold text-green-700 dark:text-green-400">Cash on Ride — Active</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pay your Wizer at end of each ride</p>
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Digital payments (JazzCash, Easypaisa) coming soon
      </p>

      <Link
        to="/passenger/wallet"
        className="flex items-center justify-between text-xs font-medium text-townwize-primary dark:text-townwize-accent hover:underline pt-1"
      >
        View wallet details
        <FaChevronRight className="text-[10px]" />
      </Link>
    </div>
  );
};

export default WalletSummary;
