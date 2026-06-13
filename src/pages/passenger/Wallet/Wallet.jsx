// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion"
import { FaPlus, FaWallet, FaArrowDown, FaArrowUp } from "react-icons/fa";
import { useState } from "react";
import confetti from "canvas-confetti";


const Wallet = () => {
  const transactions = []; // mock data or fetched
  const balance = 500
  // Determine wallet state based on balance
  let walletState = "normal";
  if (balance === 0) walletState = "empty";
  else if (balance < 500) walletState = "low";
  else if (balance >= 500 && balance < 2000) walletState = "neutral";
  else if (balance >= 2000) walletState = "high";


  // Map to image
  const walletImage = `/images/wallet-${walletState}.svg`;
  // Modal state
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  return (
    <>
      {/* Header / Balance */}
      <div className="relative rounded-2xl overflow-hidden shadow-md mb-6">
        <div className="bg-townwize-bgLight dark:bg-townwize-primaryDark p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AnimatePresence mode="wait">
                <motion.img
                  key={walletImage}
                  src={walletImage}
                  alt="Wallet status"
                  className="w-10 h-10"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                />
              </AnimatePresence>

              <div>
                <p className="text-sm text-townwize-primary dark:text-townwize-textContent">
                  Available Balance
                </p>
                <motion.h2
                  key={balance}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-townwize-primaryDark text-3xl font-bold tracking-wide"
                >
                  PKR {balance.toLocaleString()}
                </motion.h2>
              </div>
            </div>


            <button
              onClick={() => setShowAddFunds(true)}
              className="flex items-center gap-2 bg-townwize-bgDark hover:bg-townwize-bgDark/90 transition px-4 py-2 rounded-lg text-sm font-semibold"
            >
              <FaPlus /> Add Funds
            </button>

          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white dark:bg-townwize-primaryDark rounded-xl shadow p-5">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
          Recent Transactions
        </h3>

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-gray-500 dark:text-gray-400">
            <img
              src="/images/empty-wallet.svg"
              alt="No transactions"
              className="w-28 mb-4 opacity-80 dark:invert"
            />
            <p className="text-sm mb-1">No transactions yet</p>
            <p className="text-xs mb-4 text-townwize-primary dark:text-townwize-textContent">
              Start your first ride or add funds to see history here
            </p>
            <button className="bg-townwize-primary hover:bg-townwize-primaryDark text-white px-4 py-2 rounded-lg text-sm font-medium">
              Add Funds
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {transactions.map((txn, idx) => (
              <li
                key={idx}
                className="flex justify-between items-center py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 transition rounded-md px-2"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 flex items-center justify-center rounded-full ${txn.type === "credit"
                      ? "bg-green-100 text-green-600"
                      : txn.type === "debit"
                        ? "bg-red-100 text-red-600"
                        : "bg-yellow-100 text-yellow-600"
                      }`}
                  >
                    {txn.type === "credit" ? (
                      <FaArrowDown />
                    ) : txn.type === "debit" ? (
                      <FaArrowUp />
                    ) : (
                      "↺"
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      {txn.label}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {txn.date} • {txn.time}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-semibold ${txn.type === "credit"
                    ? "text-green-500"
                    : txn.type === "debit"
                      ? "text-red-500"
                      : "text-yellow-500"
                    }`}
                >
                  {txn.type === "credit" ? "+" : "-"}PKR {txn.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ✅ Add Funds Bottom Sheet */}
      <AnimatePresence>
        {showAddFunds && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
              className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-w-md p-6 shadow-xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add Funds</h3>
                <button
                  onClick={() => setShowAddFunds(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              {/* Payment selector + amount field */}
              <div className="space-y-4">
                {/* Amount input */}
                <input
                  type="number"
                  placeholder="Enter amount (PKR)"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-townwize-progS"
                />
                {/* Payment methods */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: "card", label: "Debit / Credit Card", icon: "💳" },
                    { id: "wallet", label: "Townwize Wallet", icon: <FaWallet className="text-townwize-progS text-lg" /> },
                    { id: "promo", label: "Promo Code", icon: "🎟️" },
                    { id: "cash", label: "Cash on Ride", icon: "💵" },
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethod(method.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition 
      ${selectedMethod === method.id
                          ? "border-townwize-accent bg-townwize-accent/10"
                          : "border-gray-300 dark:border-gray-700 hover:border-townwize-accent hover:bg-townwize-accent/5"
                        }`}
                    >
                      <span className="text-xl">{method.icon}</span>
                      <span className="font-medium text-sm text-gray-800 dark:text-gray-200">
                        {method.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Proceed button */}
                <button
                  disabled={!selectedMethod}
                  // onClick={() => selectedMethod && setShowSuccess(true)}
                  onClick={() => {
                    if (selectedMethod) {
                      setShowSuccess(true);
                      // 🎉 quick confetti burst
                      confetti({
                        particleCount: 80,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ["#103139", "#F5CB5C", "#00C897"],
                      });
                      // Auto-close after 2 sec
                      setTimeout(() => {
                        setShowSuccess(false);
                        setShowAddFunds(false);
                      }, 2000);
                    }
                  }}

                  className={`w-full py-3 rounded-lg font-semibold mt-2 transition
    ${selectedMethod
                      ? "bg-townwize-primary hover:bg-townwize-primaryDark text-white cursor-pointer"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    }`}
                >
                  {selectedMethod ? "Proceed to Pay" : "Select Payment Method"}
                </button>

              </div>
            </motion.div>
          </motion.div>
        )}

        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 text-center w-[90%] max-w-sm"
            >
              <div className="text-green-500 text-5xl mb-4">✅</div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">
                Payment Successful
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Your funds have been added to Townwize Wallet.
              </p>
              <button
                onClick={() => {
                  setShowSuccess(false);
                  setShowAddFunds(false);
                }}
                className="bg-townwize-primary hover:bg-townwize-primaryDark text-white px-5 py-2 rounded-lg font-medium"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
};

export default Wallet;
