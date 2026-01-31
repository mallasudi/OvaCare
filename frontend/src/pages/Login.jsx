import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import API from "../utils/api";
import { saveAuth } from "../utils/auth";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await API.post("/auth/login", {
        email,
        password,
      });

      // ✅ save token + user
      saveAuth(res.data);

      // ✅ go to dashboard
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid email or password"
      );
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-gradient-to-br from-pink-50 via-rose-50 to-white">

      {/* LEFT – INFO */}
      <div className="hidden md:flex flex-col justify-center px-16 animate-fadeIn">
        <h1 className="text-4xl font-semibold text-gray-800 mb-4">
          Welcome Back 🌸
        </h1>
        <p className="text-gray-600 text-lg leading-relaxed">
          Continue your journey toward understanding PCOS, tracking your
          health, and making informed lifestyle choices.
        </p>
      </div>

      {/* RIGHT – LOGIN FORM */}
      <div className="flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl animate-slideUp">

          <h2 className="text-3xl font-semibold text-gray-800 mb-2">
            Login to OvaCare
          </h2>

          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="text-sm text-gray-600">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button className="btn-primary w-full mt-2">
              Login
            </button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-6">
            Don’t have an account?{" "}
            <Link to="/register" className="text-pink-600 hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
