// UI-02 FIX: use REACT_APP_API_URL env var so production build works correctly
const BASE = process.env.REACT_APP_API_URL || "";

function getToken() { return localStorage.getItem("hashrial_token"); }

async function req(path, opts = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401) {
    localStorage.removeItem("hashrial_token");
    window.location.href = "/login";
    return;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  login:              (email, password) => req("/api/auth/login",    { method: "POST", body: { email, password } }),
  register:           (username, email, password) => req("/api/auth/register", { method: "POST", body: { username, email, password } }),
  me:                 () => req("/api/auth/me"),
  overview:           () => req("/api/dashboard/overview"),
  hashrate:           (period, worker) => req(`/api/dashboard/hashrate?period=${period}${worker ? `&worker=${worker}` : ""}`),
  workers:            () => req("/api/dashboard/workers"),
  workerDetail:       (name) => req(`/api/dashboard/workers/${encodeURIComponent(name)}`),
  earnings:           (page = 1) => req(`/api/dashboard/earnings?page=${page}`),
  notifications:      () => req("/api/notifications"),
  markRead:           () => req("/api/notifications/read", { method: "POST" }),
  connectInfo:        () => req("/api/connect"),
  poolStats:          () => req("/api/pool/stats"),
  btcPrice:           () => req("/api/public/btcprice"),  // UI-04 FIX: proxied through backend
  updateNotifySettings: (s) => req("/api/settings/notifications", { method: "PUT", body: s }),
  notifySettings:     () => req("/api/settings/notifications"),
  setPayoutAddress:   (bitcoin_address) => req("/api/settings/payout-address", { method: "PUT", body: { bitcoin_address } }),
  requestPayout:      () => req("/api/payout/request", { method: "POST" }),
  payoutHistory:      () => req("/api/payout/history"),
};
