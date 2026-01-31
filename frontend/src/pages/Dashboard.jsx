import BottomNav from "../components/BottomNav";
import { getUser } from "../utils/auth";

export default function Dashboard() {
  const user = getUser();

  return (
    <div className="min-h-screen bg-pink-50 pb-24">
      
      {/* HEADER */}
      <div className="bg-white px-5 py-4 flex justify-between items-center shadow">
        <h1 className="text-xl font-semibold text-pink-600">
          OvaCare 🌸
        </h1>
        <div className="flex gap-4 items-center">
          <span>🔔</span>
          <img
            src="https://i.pravatar.cc/40"
            className="w-9 h-9 rounded-full"
          />
        </div>
      </div>

      {/* GREETING */}
      <div className="px-5 mt-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Hello, {user?.name || "User"} 👋
        </h2>
        <p className="text-gray-500 mt-1">
          Here's your daily PCOS wellness overview.
        </p>
      </div>

      {/* DAILY CHECK-IN */}
      <div className="mx-5 mt-6 bg-gradient-to-r from-pink-400 to-pink-500 rounded-2xl p-5 text-white">
        <h3 className="font-semibold text-lg">Daily Check-in</h3>
        <p className="text-sm mt-1">
          Track your symptoms today
        </p>
        <button className="mt-4 bg-white text-pink-600 font-medium px-5 py-2 rounded-full">
          Log Today’s Entry →
        </button>
      </div>

      {/* PROGRESS */}
      <div className="mx-5 mt-6 bg-white rounded-2xl p-5 shadow">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">
            Progress Over Time
          </h3>
          <span className="text-pink-500 text-sm cursor-pointer">
            View Full Report
          </span>
        </div>

        <div className="flex justify-between mt-5 items-end h-24">
          {["Mon","Tue","Wed","Thu","Fri"].map((day, i) => (
            <div key={day} className="flex flex-col items-center">
              <div
                className={`w-8 rounded-lg ${
                  i === 4 ? "bg-pink-500 h-20" : "bg-pink-200 h-12"
                }`}
              />
              <span className="text-xs mt-2 text-gray-500">{day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="mx-5 mt-6 grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow">
          <p className="text-lg">📝</p>
          <h4 className="font-semibold mt-2">Assessments</h4>
          <p className="text-xs text-gray-500 mt-1">
            Last taken: 2 days ago
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow">
          <p className="text-lg">📔</p>
          <h4 className="font-semibold mt-2">My Journal</h4>
          <p className="text-xs text-gray-500 mt-1">
            12 entries total
          </p>
        </div>
      </div>

      {/* RECOMMENDED */}
      <div className="mx-5 mt-6">
        <h3 className="font-semibold text-gray-800 mb-3">
          Recommended for You
        </h3>

        <div className="bg-white rounded-xl p-4 mb-3 shadow flex justify-between">
          <div>
            <h4 className="font-medium">🥑 Diet Tips</h4>
            <p className="text-xs text-gray-500">
              Stabilize blood sugar naturally
            </p>
          </div>
          <span>›</span>
        </div>

        <div className="bg-white rounded-xl p-4 shadow flex justify-between">
          <div>
            <h4 className="font-medium">🧘 Stress Management</h4>
            <p className="text-xs text-gray-500">
              Reduce cortisol levels
            </p>
          </div>
          <span>›</span>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
