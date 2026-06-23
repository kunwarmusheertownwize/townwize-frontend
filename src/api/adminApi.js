import { authFetch } from "../utils/authFetch";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1.2";

async function call(path, options = {}) {
    const res = await authFetch(`${API_BASE}${path}`, options);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error?.message || json?.message || "Request failed");
    return json;
}

export const fetchPendingDrivers = () => call("/admin/drivers/pending");
export const fetchAllDrivers = () => call("/admin/drivers");
export const updateDriverVehicleApproval = (driverUserId, body) =>
    call(`/admin/drivers/${driverUserId}/vehicle-approval`, {
        method: "PATCH",
        body: JSON.stringify(body || {}),
    });
export const fetchPriorityAlerts = () => call("/admin/drivers/priority-alerts");
export const unblockDriver = (driverUserId) =>
    call(`/admin/drivers/${driverUserId}/unblock`, { method: "PATCH", body: JSON.stringify({}) });

export const fetchCases = (params) => {
    const q = new URLSearchParams(params || {}).toString();
    return call(`/admin/cases${q ? `?${q}` : ""}`);
};

export const fetchCaseDetail = (caseId) => call(`/admin/cases/${caseId}`);
export const updateCase = (caseId, body) =>
    call(`/admin/cases/${caseId}`, { method: "PATCH", body: JSON.stringify(body || {}) });

export const fetchRides = (params) => {
    const q = new URLSearchParams(params || {}).toString();
    return call(`/admin/rides${q ? `?${q}` : ""}`);
};

export const fetchRideDetail = (rideId) => call(`/admin/rides/${rideId}`);
export const updateRideStatus = (rideId, status) =>
    call(`/admin/rides/${rideId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
export const fetchRideAvailableDrivers = (rideId) =>
    call(`/admin/rides/${rideId}/available-drivers`);
export const assignRideDriver = (rideId, driverId) =>
    call(`/admin/rides/${rideId}/assign-driver`, {
        method: "PATCH",
        body: JSON.stringify({ driverId }),
    });

export const fetchSupportTickets = (params) => {
    const q = new URLSearchParams(params || {}).toString();
    return call(`/admin/support${q ? `?${q}` : ""}`);
};
export const createSupportTicket = (body) =>
    call("/admin/support", { method: "POST", body: JSON.stringify(body || {}) });
export const fetchSupportTicketDetail = (ticketId) => call(`/admin/support/${ticketId}`);
export const updateSupportTicket = (ticketId, body) =>
    call(`/admin/support/${ticketId}`, { method: "PATCH", body: JSON.stringify(body || {}) });
export const replySupportTicket = (ticketId, message) =>
    call(`/admin/support/${ticketId}/reply`, { method: "POST", body: JSON.stringify({ message }) });

export const fetchFinanceSummary = () => call("/admin/finance");
export const fetchFinanceTransactions = (params) => {
    const q = new URLSearchParams(params || {}).toString();
    return call(`/admin/finance/transactions${q ? `?${q}` : ""}`);
};
export const fetchFinancePayouts = () => call("/admin/finance/payouts");
export const generateFinancePayoutBatch = () =>
    call("/admin/finance/payouts/generate", { method: "POST", body: JSON.stringify({}) });
export const updateFinancePayoutStatus = (batchId, body) =>
    call(`/admin/finance/payouts/${batchId}/status`, { method: "PATCH", body: JSON.stringify(body || {}) });

export const fetchDriverPayoutRequests = (params) => {
    const q = new URLSearchParams(params || {}).toString();
    return call(`/admin/finance/driver-payout-requests${q ? `?${q}` : ""}`);
};
export const reviewDriverPayoutRequest = (id, body) =>
    call(`/admin/finance/driver-payout-requests/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const fetchFeatureFlags = () => call("/admin/feature-flags");
export const updateFeatureFlag = (key, body) =>
    call(`/admin/feature-flags/${key}`, { method: "PATCH", body: JSON.stringify(body || {}) });

export const fetchZones = (params) => {
    const q = new URLSearchParams(params || {}).toString();
    return call(`/admin/zones${q ? `?${q}` : ""}`);
};
export const createZone = (body) =>
    call("/admin/zones", { method: "POST", body: JSON.stringify(body || {}) });
export const fetchZoneById = (zoneId) =>
    call(`/admin/zones/${zoneId}`);
export const updateZone = (zoneId, body) =>
    call(`/admin/zones/${zoneId}`, { method: "PATCH", body: JSON.stringify(body || {}) });
export const updateZoneStatus = (zoneId, active) =>
    call(`/admin/zones/${zoneId}/status`, { method: "PATCH", body: JSON.stringify({ active }) });
export const updateZonePriority = (zoneId, priority) =>
    call(`/admin/zones/${zoneId}/priority`, { method: "PATCH", body: JSON.stringify({ priority }) });
export const deleteZone = (zoneId) =>
    call(`/admin/zones/${zoneId}`, { method: "DELETE" });

export const fetchNotifications = (params) => {
    const q = new URLSearchParams(params || {}).toString();
    return call(`/admin/notifications${q ? `?${q}` : ""}`);
};
export const createNotification = (body) =>
    call("/admin/notifications", { method: "POST", body: JSON.stringify(body || {}) });
export const updateNotification = (notificationId, body) =>
    call(`/admin/notifications/${notificationId}`, { method: "PATCH", body: JSON.stringify(body || {}) });

export const fetchAdminUsers = (params) => {
    const q = new URLSearchParams(params || {}).toString();
    return call(`/admin/users${q ? `?${q}` : ""}`);
};
export const updateAdminUser = (userId, body) =>
    call(`/admin/users/${userId}`, { method: "PATCH", body: JSON.stringify(body || {}) });

export const fetchAuditLogs = (params) => {
    const q = new URLSearchParams(params || {}).toString();
    return call(`/admin/audit${q ? `?${q}` : ""}`);
};
export const fetchAuditLogDetail = (id) => call(`/admin/audit/${id}`);

export const fetchCancellationPolicy = () => call("/admin/cancellation-policy");
export const saveCancellationPolicy = (config) =>
    call("/admin/cancellation-policy", { method: "PATCH", body: JSON.stringify({ config }) });
