import { Routes, Route, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import HealthJournal from "./pages/HealthJournal";
import PeriodTracker from "./pages/PeriodTracker";
import Consultation from "./pages/Consultation";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Assessment from "./pages/Assessment";
import PCOS from "./pages/PCOS";
import Consult from "./pages/Consultation";
import PCOSReport from "./pages/PCOSReport";
import PrivateRoute from "./router/PrivateRoute";

function AppContent() {
  const location = useLocation();

  const [lang, setLang] = useState(
    () => localStorage.getItem("lang") || "en"
  );

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const isAuthenticated = !!user && !!token;

  // Hide public Navbar on dashboard/private routes ONLY when the user is logged in.
  // /assessment is intentionally excluded — it always shows the public Navbar.
  const dashboardRoutes = ["/dashboard", "/journal", "/period", "/consultation", "/report"];
  const hideNavbar = dashboardRoutes.includes(location.pathname) && isAuthenticated;

  return (
    <>
      {!hideNavbar && <Navbar lang={lang} setLang={setLang} />}

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home lang={lang} />} />
        <Route path="/login" element={<Login lang={lang} />} />
        <Route path="/register" element={<Register lang={lang} />} />
        <Route path="/pcos" element={<PCOS />} />
        <Route path="/consult" element={<Consult lang={lang} />} />

        {/* Assessment is public – auth gate is inside the page on submit */}
        <Route path="/assessment" element={<Assessment lang={lang} />} />

        {/* Protected routes – require login */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard lang={lang} /></PrivateRoute>} />
        <Route path="/journal" element={<PrivateRoute><HealthJournal /></PrivateRoute>} />
        <Route path="/period" element={<PrivateRoute><PeriodTracker /></PrivateRoute>} />
        <Route path="/consultation" element={<PrivateRoute><Consultation /></PrivateRoute>} />
        <Route path="/report" element={<PrivateRoute><PCOSReport /></PrivateRoute>} />
      </Routes>
    </>
  );
}

export default AppContent;