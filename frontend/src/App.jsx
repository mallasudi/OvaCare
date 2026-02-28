import { Routes, Route, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import HealthJournal from "./pages/HealthJournal";
import PeriodTracker from "./pages/PeriodTracker";
import Consultation from "./pages/Consultation";
import DashboardConsult from "./pages/DashboardConsult";
import DashboardLayout from "./components/DashboardLayout";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Assessment from "./pages/Assessment";
import PCOS from "./pages/PCOS";
import PCOSReport from "./pages/PCOSReport";
import PrivateRoute from "./router/PrivateRoute";
import BottomNav from "./components/BottomNav";

const DashboardAssessment = () => (
  <>
    <Assessment />
    <BottomNav />
  </>
);

function AppContent() {
  const location = useLocation();

  const [lang, setLang] = useState(
    () => localStorage.getItem("lang") || "en"
  );

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  const { isAuthenticated } = useAuth();

  const dashboardRoutes = ["/dashboard", "/journal", "/period", "/consultation", "/dashboard/consult", "/report", "/check"];
  const hideNavbar = (dashboardRoutes.some(route => location.pathname === route || location.pathname.startsWith(route + "/")) && isAuthenticated);

  return (
    <>
      {!hideNavbar && <Navbar lang={lang} setLang={setLang} />}

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home lang={lang} />} />
        <Route path="/login" element={<Login lang={lang} />} />
        <Route path="/register" element={<Register lang={lang} />} />
        <Route path="/pcos" element={<PCOS />} />
        <Route path="/consult" element={<Consultation />} />

        {/* Assessment is public – auth gate is inside the page on submit */}
        <Route path="/assessment" element={<Assessment lang={lang} />} />

        {/* Protected routes – require login */}
        <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
          <Route index element={<Dashboard lang={lang} />} />
          <Route path="consult" element={<DashboardConsult />} />
        </Route>
        <Route path="/check" element={<PrivateRoute><DashboardAssessment /></PrivateRoute>} />
        <Route path="/journal" element={<PrivateRoute><HealthJournal /></PrivateRoute>} />
        <Route path="/period" element={<PrivateRoute><PeriodTracker /></PrivateRoute>} />
        <Route path="/consultation" element={<PrivateRoute><Consultation /></PrivateRoute>} />
        <Route path="/report" element={<PrivateRoute><PCOSReport /></PrivateRoute>} />
        <Route path="/report/:reportId" element={<PrivateRoute><PCOSReport /></PrivateRoute>} />
      </Routes>
    </>
  );
}

export default AppContent;