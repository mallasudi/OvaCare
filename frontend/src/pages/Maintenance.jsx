import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";

export default function Maintenance() {
  const navigate = useNavigate();
  const [message] = useState(
    () => localStorage.getItem("maintenanceMessage") || "App is under maintenance. Please check back later."
  );
  const [checking, setChecking] = useState(false);

  // Poll every 15s to see if maintenance is lifted
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        setChecking(true);
        await API.get("/user/profile");
        // If it succeeds, maintenance is off
        localStorage.removeItem("maintenanceMessage");
        navigate("/");
      } catch (err) {
        if (err.response?.status !== 503) {
          // Not maintenance anymore (could be 401 etc.)
          localStorage.removeItem("maintenanceMessage");
          navigate("/");
        }
      } finally {
        setChecking(false);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #fff5f7, #ffe4ec)" }}>
      <div className="text-center max-w-md mx-auto px-6">
        <div className="text-7xl mb-6">🔧</div>
        <h1 className="text-3xl font-extrabold mb-3" style={{ color: "#C57C8A" }}>
          Under Maintenance
        </h1>
        <p className="text-gray-600 text-base mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          {checking ? (
            <>
              <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "#fce7ea", borderTopColor: "#C57C8A" }} />
              Checking...
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#C57C8A" }} />
              Auto-checking every 15 seconds
            </>
          )}
        </div>
      </div>
    </div>
  );
}
