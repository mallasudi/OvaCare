import { createContext, useContext, useEffect, useState } from "react";
import api from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin,   setAdmin]   = useState(() => {
    try { return JSON.parse(localStorage.getItem("adminUser")); }
    catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Silently verify token on mount
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) { setLoading(false); return; }
    api.get("/verify")
      .then((r) => setAdmin(r.data))
      .catch(() => {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminUser");
        setAdmin(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/login", { email, password });
    localStorage.setItem("adminToken", data.token);
    localStorage.setItem("adminUser",  JSON.stringify(data.user));
    setAdmin(data.user);
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
