import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import API from "../utils/api";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await API.post("/auth/register", {
        name,
        email,
        password,
      });

      navigate("/login");
    } catch (err) {
      setError("Registration failed");
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-gradient-to-br from-pink-50 via-rose-50 to-white">

      {/* LEFT – FORM */}
      <div className="flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl animate-slideUp">

          <h2 className="text-3xl font-semibold text-gray-800 mb-2">
            Create Your Account 🌷
          </h2>
          <p className="text-gray-500 mb-8">
            Start your PCOS awareness journey with OvaCare
          </p>

          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}

          <form className="space-y-5" onSubmit={handleRegister}>
            <div>
              <label className="text-sm text-gray-600">Full Name</label>
              <input
                type="text"
                placeholder="Your name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Password</label>
              <input
                type="password"
                placeholder="Create a password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-start gap-2 text-sm text-gray-500">
              <input type="checkbox" className="mt-1 accent-pink-500" required />
              <span>
                I understand this platform provides awareness and lifestyle
                guidance, not medical diagnosis.
              </span>
            </div>

            <button className="btn-primary w-full">
              Create Account
            </button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-pink-600 hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>

      {/* RIGHT – INFO */}
      <div className="hidden md:flex flex-col justify-center px-16 animate-fadeIn">
        <h1 className="text-4xl font-semibold text-gray-800 mb-4">
          Built for Women’s Health 💗
        </h1>
        <p className="text-gray-600 text-lg leading-relaxed">
          OvaCare helps women understand PCOS symptoms, assess risk levels,
          and adopt healthier daily habits through compassionate guidance.
        </p>

        <div className="mt-10 bg-white/70 backdrop-blur-md p-6 rounded-3xl shadow">
          <p className="text-pink-600 font-medium">
            Why join OvaCare?
          </p>
          <ul className="text-sm text-gray-500 mt-3 space-y-2">
            <li>• PCOS risk assessment</li>
            <li>• Personalized lifestyle tips</li>
            <li>• Downloadable health reports</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
