// townwize-frontend\src\api\driverApi.js
import api from "../services/api";

const unwrap = (res) => res?.data?.data ?? res?.data ?? null;

export async function fetchDriverTrips() {
  const res = await api.get("/driver/trips");
  return unwrap(res) || [];
}

export async function fetchDriverEarnings(period = "weekly") {
  const res = await api.get("/driver/earnings", { params: { period } });
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

export async function fetchPayoutDetails() {
  const res = await api.get("/driver/payout/details");
  return unwrap(res) || null;
}

export async function savePayoutDetails(details) {
  const res = await api.put("/driver/payout/details", details);
  return unwrap(res) || null;
}
