import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ children }) {
  const { isReady, isAuthenticated } = useAuth();

  // Wait for auth validation to complete
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-main)" }}>
        <div className="animate-spin text-4xl">🌸</div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}
