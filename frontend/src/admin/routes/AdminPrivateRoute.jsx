import { useAdminAuth } from "../context/AdminAuthContext";
import { Navigate } from "react-router-dom";

export default function AdminPrivateRoute({ children }) {
  const { admin, adminReady } = useAdminAuth();

  if (!adminReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-gray-500 text-sm">Loading...</span>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
