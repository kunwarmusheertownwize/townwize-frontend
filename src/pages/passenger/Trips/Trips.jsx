// src/pages/passenger/Trips/Trips.jsx

const PassengerTrips = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-2">Ride History</h1>
      <p className="text-sm text-gray-500">
        Your past rides will appear here.
      </p>

      <div className="mt-6 bg-white dark:bg-townwize-primaryDark rounded-xl p-6 text-sm text-gray-400">
        No trips yet.
      </div>
    </div>
  );
};

export default PassengerTrips;
