import { FaWallet } from "react-icons/fa";

const WalletSummary = () => {
    return (
        <div className="bg-white dark:bg-townwize-primaryDark border-t-4 border-townwize-primary rounded-xl shadow-md p-5 space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-townwize-primary dark:text-townwize-accent">
                    Wallet
                </h2>
                <FaWallet className="text-townwize-primary dark:text-townwize-accent text-xl" />
            </div>
            <div className="flex flex-col items-center justify-center py-4 gap-2 text-gray-400 dark:text-gray-500">
                <p className="text-sm font-medium">Wallet coming soon</p>
                <p className="text-xs text-center">
                    Top-ups and transaction history will appear here.
                </p>
            </div>
        </div>
    );
};

export default WalletSummary;
