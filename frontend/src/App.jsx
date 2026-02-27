import { Routes, Route, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
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

function AppContent() {
  const location = useLocation();

  const [lang, setLang] = useState(
    () => localStorage.getItem("lang") || "en"
  );

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  // 🔥 ROUTES WHERE NAVBAR SHOULD BE HIDDEN
  const privateRoutes = ["/dashboard", "/assessment", "/report", "/journal", "/period", "/consultation"];

  const hideNavbar = privateRoutes.includes(location.pathname);

  return (
    <>
      {!hideNavbar && <Navbar lang={lang} setLang={setLang} />}

      <Routes>
        <Route path="/" element={<Home lang={lang} />} />
        <Route path="/login" element={<Login lang={lang} />} />
        <Route path="/register" element={<Register lang={lang} />} />
        <Route path="/dashboard" element={<Dashboard lang={lang} />} />
        <Route path="/assessment" element={<Assessment lang={lang} />} />
        <Route path="/pcos" element={<PCOS />} />
        <Route path="/consult" element={<Consult lang={lang} />} />
        <Route path="/journal" element={<HealthJournal />} />
        <Route path="/period" element={<PeriodTracker />} />
        <Route path="/consultation" element={<Consultation />} />
        <Route path="/report" element={<PCOSReport />} />
      </Routes>
    </>
  );
}

export default AppContent;