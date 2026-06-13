import PassengerLayout from '../../../layouts/PassengerLayout';

const Notifications = () => {
  const loading = false; // simulate loading
  const notifications = []; // simulate empty

  return (
    <PassengerLayout title="Notifications">
      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet.</p>
      ) : (
        <div className="space-y-4">
          {notifications.map((n, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
              <p className="text-sm text-gray-800 dark:text-gray-200">{n.message}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{n.time}</p>
            </div>
          ))}
        </div>
      )}
    </PassengerLayout>
  );
};

export default Notifications;
