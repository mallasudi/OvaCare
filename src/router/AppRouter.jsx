import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";

export default function AppRouter({ lang, setLang }) {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home lang={lang} setLang={setLang} />} />
        <Route path="/login" element={<Login lang={lang} />} />
        <Route path="/register" element={<Register lang={lang} />} />
      </Routes>
    </BrowserRouter>
  );
}
