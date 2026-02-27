import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ children }) {
  const { user } = useAuth();
  const token = localStorage.getItem("token");

  // Must have both a user record and a valid token
  if (user && token) {
    return children;
  }

  return <Navigate to="/login" replace />;
}
