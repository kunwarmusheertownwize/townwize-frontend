import React from "react";
import { FaWallet, FaArrowUp, FaArrowDown } from "react-icons/fa";

const WalletSummary = () => {
    const balance = 1450; // mock balance
    const recentTransactions = [
        { id: 1, type: "Ride Payment", amount: -450 },
        { id: 2, type: "Wallet Top-up", amount: +1000 },
    ];

    return (
        <div className="bg-white dark:bg-townwize-primaryDark border-t-4 border-townwize-primary rounded-xl shadow-md p-5 space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-townwize-primary dark:text-townwize-accent">
                    Wallet Summary
                </h2>
                <FaWallet className="text-townwize-primary dark:text-townwize-accent text-xl" />
            </div>

            <div className="text-2xl font-bold text-townwize-primary dark:text-townwize-accent">
                {balance.toLocaleString()} PKR
            </div>

            <div className="space-y-2 mt-2">
                {recentTransactions.map((tx) => (
                    <div
                        key={tx.id}
                        className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1"
                    >
                        <span className="flex items-center gap-2">
                            {tx.amount > 0 ? (
                                <FaArrowDown className="text-green-500" />
                            ) : (
                                <FaArrowUp className="text-red-500" />
                            )}
                            {tx.type}
                        </span>
                        <span
                            className={`font-semibold ${tx.amount > 0 ? "text-green-500" : "text-red-500"
                                }`}
                        >
                            {tx.amount > 0 ? "+" : ""}
                            {tx.amount} PKR
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WalletSummary;
