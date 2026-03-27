import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const BASE_URL = "http://localhost:5001/api";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin]         = useState(null);
  const [adminReady, setAdminReady] = useState(false);

  // On mount: silently re-validate the stored admin token
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setAdminReady(true);
      return;
    }
    axios
      .get(`${BASE_URL}/admin/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setAdmin(res.data))
      .catch(() => {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminUser");
      })
      .finally(() => setAdminReady(true));
  }, []);

  /** Called after a successful POST /api/admin/login */
  const adminLogin = (token, userData) => {
    localStorage.setItem("adminToken", token);
    localStorage.setItem("adminUser", JSON.stringify(userData));
    setAdmin(userData);
  };

  const adminLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    setAdmin(null);
  };

  const isAdminAuthenticated = () =>
    !!admin && !!localStorage.getItem("adminToken");

  return (
    <AdminAuthContext.Provider
      value={{ admin, adminReady, adminLogin, adminLogout, isAdminAuthenticated }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
