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

/**
 * Starts an in-app commission payment and returns a checkout URL.
 *
 * `amountMinor` is optional — omitted means "settle the whole balance". The
 * SERVER caps it at what is actually owed, so this can never overpay a driver
 * into credit however it is called.
 */
export async function startCommissionPayment(amountMinor) {
  const res = await api.post("/driver/commission/pay", amountMinor ? { amountMinor } : {});
  return unwrap(res) || null;
}

/**
 * Commission the driver has paid — BOTH ways, merged on the server.
 *
 * Not the same as fetchPayoutRequests(), which returns only the manual
 * submissions. Using that for the history meant a Wizer who paid in the app
 * saw "No payments submitted yet" next to a balance that had just cleared.
 */
export async function fetchCommissionHistory() {
  const res = await api.get("/driver/commission/history");
  return unwrap(res)?.requests || [];
}
