import { useState } from "react";
import AppRouter from "./router/AppRouter";

export default function App() {
  const [lang, setLang] = useState("en");

  return <AppRouter lang={lang} setLang={setLang} />;
}
