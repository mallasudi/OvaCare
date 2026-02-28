import { createContext, useContext, useState, useEffect } from "react";
import API from "../utils/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Comprehensive auth cleanup function
  const clearAllAuth = () => {
    setUser(null);
    setIsAuthenticated(false);
    // Clear ALL auth-related localStorage keys
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("latestResult");
    localStorage.removeItem("profilePicture");
    localStorage.removeItem("authToken");
    // Clear sessionStorage
    sessionStorage.removeItem("pendingAssessment");
    sessionStorage.removeItem("authToken");
    console.log("[AUTH] All auth data cleared");
  };

  // Validate token on app load AND whenever token might have changed
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      // If no token, definitely not authenticated
      if (!token) {
        clearAllAuth();
        setIsReady(true);
        return;
      }

      // Token exists, but only trust user if we can validate the token
      try {
        console.log("[AUTH] Validating token...");
        const response = await API.get("/auth/verify");
        // Token is valid, restore user from stored data or server response
        const userData = response.data || (storedUser ? JSON.parse(storedUser) : null);
        setUser(userData);
        setIsAuthenticated(true);
        console.log("[AUTH] Token validated successfully");
      } catch (error) {
        console.error("[AUTH] Token validation failed:", error.response?.status);
        // Token is expired or invalid, clear everything
        clearAllAuth();
      } finally {
        setIsReady(true);
      }
    };

    validateToken();
  }, []);

  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem("user", JSON.stringify(userData));
    console.log("[AUTH] User logged in:", userData.name);
  };

  const logout = () => {
    console.log("[AUTH] Logging out...");
    clearAllAuth();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isReady, isAuthenticated, clearAllAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
