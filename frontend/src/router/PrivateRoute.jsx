import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ children }) {
  const { user } = useAuth();
  const token = localStorage.getItem("token");

  // Accept if EITHER AuthContext has user (SPA session) OR localStorage has
  // both token and user (after page refresh). This covers the case where
  // Login updates localStorage but AuthContext state hasn't propagated yet.
  const isAuthenticated = (!!user && !!token) || (!!token && !!localStorage.getItem("user"));

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}
