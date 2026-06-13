// \src\components\auth\RegisterHeader.jsx

import { Link } from "react-router-dom";

export default function RegisterHeader() {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
      <h2 className="text-2xl font-semibold text-townwize-primary dark:text-white">
        Create your Townwize account
      </h2>

      <Link
        to="/login"
        className="text-sm font-medium text-gray-500 hover:!text-townwize-primary whitespace-nowrap"
      >
        Already have an account?
      </Link>
    </div>
  )
}
