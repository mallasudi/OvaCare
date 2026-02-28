import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

/**
 * Shared layout for all /dashboard/* nested routes.
 * Renders the matched child route via <Outlet /> and keeps
 * <BottomNav /> persistent across every dashboard sub-page.
 */
export default function DashboardLayout() {
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
}
