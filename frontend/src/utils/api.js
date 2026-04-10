import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://98.93.82.89:5000",
});

// Attach JWT and normalise paths automatically on every request
API.interceptors.request.use(
  (config) => {
    // Prepend /api if the path does not already start with /api or /uploads
    if (config.url && !config.url.startsWith("/api") && !config.url.startsWith("/uploads")) {
      config.url = "/api" + config.url;
    }

    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 401 responses to trigger logout, and 503 for maintenance
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 503) {
      // Maintenance mode — store message and redirect
      localStorage.setItem("maintenanceMessage", error.response?.data?.message || "App is under maintenance.");
      if (window.location.pathname !== "/maintenance") {
        window.location.href = "/maintenance";
      }
      return Promise.reject(error);
    }
    if (error.response?.status === 401) {
      console.log("[API] Unauthorized (401) - clearing auth and redirecting to login");
      // Clear all auth data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("latestResult");
      localStorage.removeItem("profilePicture");
      localStorage.removeItem("authToken");
      sessionStorage.removeItem("pendingAssessment");
      sessionStorage.removeItem("authToken");
      // Redirect to login if not already there
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default API;