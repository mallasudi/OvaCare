import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

/**
 * Layout for all public-facing routes.
 * Renders the top Navbar then the matched child route via <Outlet/>.
 */
export default function PublicLayout({ lang, setLang }) {
  return (
    <>
      <Navbar lang={lang} setLang={setLang} />
      <Outlet />
    </>
  );
}
