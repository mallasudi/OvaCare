export default function BottomNav() {
  return (
    <div className="fixed bottom-0 w-full bg-white border-t flex justify-around py-3">
      <span className="text-pink-600">🏠</span>
      <span>📊</span>
      <button className="bg-pink-500 text-white w-12 h-12 rounded-full -mt-6">
        +
      </button>
      <span>💬</span>
      <span>👤</span>
    </div>
  );
}
