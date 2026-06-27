import { FaMoneyBillWave, FaHistory, FaClock } from "react-icons/fa";

const Wallet = () => {
  return (
    <div className="space-y-4">

      {/* Payment method card */}
      <div className="rounded-2xl bg-gradient-to-br from-townwize-primary to-townwize-primaryDark p-6 text-white">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50 mb-1">Townwize Wallet</p>
        <p className="text-xl font-bold tracking-tight">Payment Method</p>
        <p className="text-xs text-white/60 mt-1">Digital wallet activates when payments go live</p>

        {/* Payment method badge */}
        <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15">
          <FaMoneyBillWave size={12} className="text-green-300" />
          <span className="text-xs font-semibold text-white">Cash on Ride — active</span>
        </div>
      </div>

      {/* Cash notice */}
      <div className="rounded-2xl bg-white dark:bg-townwize-primaryDark border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
            <FaMoneyBillWave className="text-green-600 dark:text-green-400" size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Cash Payment</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Pay your Wizer directly in cash at the end of each ride.
              The fare shown in your booking summary is what you pay — no hidden charges.
            </p>
          </div>
        </div>
      </div>

      {/* Coming soon */}
      <div className="rounded-2xl bg-white dark:bg-townwize-primaryDark border border-dashed border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <FaClock className="text-blue-500 dark:text-blue-400" size={15} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Digital Payments — Coming Soon</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              JazzCash, Easypaisa, and card payments are on the way.
              You'll be able to top up your wallet and pay rides digitally.
            </p>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div className="rounded-2xl bg-white dark:bg-townwize-primaryDark border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <FaHistory className="text-gray-400" size={13} />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Transaction History</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">No wallet transactions yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Wallet top-ups and digital payments will appear here
          </p>
        </div>
      </div>

    </div>
  );
};

export default Wallet;
