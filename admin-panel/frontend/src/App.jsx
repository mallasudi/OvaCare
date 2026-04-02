import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Users from "./pages/Users.jsx";
import Reports from "./pages/Reports.jsx";
import Doctors from "./pages/Doctors.jsx";
import Notifications from "./pages/Notifications.jsx";
import Settings from "./pages/Settings.jsx";

function AdminLayout() {
  return (
    <div className="flex min-h-screen" style={{ background: "linear-gradient(135deg, #fff5f7 0%, #ffe4ec 100%)" }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route index                    element={<Dashboard />} />
          <Route path="users"             element={<Users />} />
          <Route path="reports"           element={<Reports />} />
          <Route path="doctors"           element={<Doctors />} />
          <Route path="notifications"     element={<Notifications />} />
          <Route path="settings"          element={<Settings />} />
          <Route path="*"                 element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <AdminLayout />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

