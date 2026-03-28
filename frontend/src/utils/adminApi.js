import axios from "axios";

/**
 * Axios instance for admin panel API calls (port 5000 main backend).
 * Uses the adminToken set by AdminAuthContext (login via port 5001).
 * Both servers share JWT_SECRET so tokens are cross-validated.
 */
const adminApi = axios.create({
  baseURL: "http://localhost:5000/api/admin",
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      if (!window.location.pathname.startsWith("/admin/login")) {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(err);
  }
);

export default adminApi;
