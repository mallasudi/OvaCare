import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import HealthJournal from "./pages/HealthJournal";
import JournalHistoryPage from "./pages/JournalHistoryPage";
import PeriodTracker from "./pages/PeriodTracker";
import Consultation from "./pages/Consultation";
import DashboardConsult from "./pages/DashboardConsult";
import DashboardLayout from "./components/DashboardLayout";
import PublicLayout from "./components/PublicLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Assessment from "./pages/Assessment";
import DashboardAssessment from "./pages/DashboardAssessment";
import PCOS from "./pages/PCOS";
import PCOSReport from "./pages/PCOSReport";
import PrivateRoute from "./router/PrivateRoute";
import Maintenance from "./pages/Maintenance";

export default function AppContent() {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  return (
    <Routes>
      {/* Maintenance page — no layout */}
      <Route path="/maintenance" element={<Maintenance />} />

      {/* ── Public routes: top Navbar shown ── */}
      <Route element={<PublicLayout lang={lang} setLang={setLang} />}>
        <Route path="/"           element={<Home lang={lang} />} />
        <Route path="/login"           element={<Login lang={lang} />} />
        <Route path="/register"        element={<Register lang={lang} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/pcos"       element={<PCOS />} />
        <Route path="/consult"    element={<Consultation />} />
        <Route path="/assessment" element={<Assessment lang={lang} />} />
      </Route>

      {/* ── Protected dashboard routes: BottomNav only, no top Navbar ── */}
      <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
        <Route path="/dashboard"          element={<Dashboard lang={lang} />} />
        <Route path="/dashboard/consult"  element={<DashboardConsult />} />
        <Route path="/journal"            element={<HealthJournal />} />
        <Route path="/journal/history"    element={<JournalHistoryPage />} />
        <Route path="/period"             element={<PeriodTracker />} />
        <Route path="/check"              element={<DashboardAssessment />} />
        <Route path="/dashboard/assessment" element={<DashboardAssessment />} />
        <Route path="/report"             element={<PCOSReport />} />
        <Route path="/report/:reportId"   element={<PCOSReport />} />
      </Route>
    </Routes>
  );
}