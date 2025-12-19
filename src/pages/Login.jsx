import { Link } from "react-router-dom";

export default function Login() {
  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-gradient-to-br from-pink-50 via-rose-50 to-white">

      {/* LEFT – INFO / ILLUSTRATION */}
      <div className="hidden md:flex flex-col justify-center px-16 animate-fadeIn">
        <h1 className="text-4xl font-semibold text-gray-800 mb-4">
          Welcome Back 🌸
        </h1>
        <p className="text-gray-600 text-lg leading-relaxed">
          Continue your journey toward understanding PCOS, tracking your
          health, and making informed lifestyle choices.
        </p>

        <div className="mt-10 bg-white/70 backdrop-blur-md p-6 rounded-3xl shadow">
          <p className="text-pink-600 font-medium">
            Your data is safe & private
          </p>
          <p className="text-sm text-gray-500 mt-2">
            We use secure authentication to protect your personal health
            information.
          </p>
        </div>
      </div>

      {/* RIGHT – LOGIN FORM */}
      <div className="flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl animate-slideUp">

          <h2 className="text-3xl font-semibold text-gray-800 mb-2">
            Login to OvaCare
          </h2>
          <p className="text-gray-500 mb-8">
            Enter your credentials to continue
          </p>

          <form className="space-y-5">
            <div>
              <label className="text-sm text-gray-600">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="input"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="input"
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
