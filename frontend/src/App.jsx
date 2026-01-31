import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Assessment from "./pages/Assessment";
import PCOS from "./pages/PCOS";
import Consult from "./pages/Consult";


export default function App() {
  const [lang, setLang] = useState(
    () => localStorage.getItem("lang") || "en"
  );

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  return (
    <>
      <Navbar lang={lang} setLang={setLang} />

      <Routes>
        <Route path="/" element={<Home lang={lang} />} />
        <Route path="/login" element={<Login lang={lang} />} />
        <Route path="/register" element={<Register lang={lang} />} />
        <Route path="/dashboard" element={<Dashboard lang={lang} />} />
        <Route path="/assessment" element={<Assessment lang={lang} />} />
        <Route path="/pcos" element={<PCOS />} />
        <Route path="/consult" element={<Consult lang={lang}/>} />

      </Routes>
    </>
  );
}
