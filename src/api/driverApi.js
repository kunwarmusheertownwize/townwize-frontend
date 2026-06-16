// townwize-frontend\src\api\driverApi.js
import api from "../services/api";

const unwrap = (res) => res?.data?.data ?? res?.data ?? null;

export async function fetchDriverTrips() {
  const res = await api.get("/driver/trips");
  return unwrap(res) || [];
}

export async function fetchDriverEarnings() {
  const res = await api.get("/driver/earnings");
  return (
    unwrap(res) || {
      today: 0,
      week: 0,
      month: 0,
      breakdown: [],
    }
  );
}

export async function fetchPayoutRequests() {
  const res = await api.get("/driver/payout/requests");
  return unwrap(res)?.requests || [];
}

export async function submitPayoutRequest(amount, note = "") {
  const res = await api.post("/driver/payout/request", { amount, note });
  return unwrap(res)?.request || null;
}
