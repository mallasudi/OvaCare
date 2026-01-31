export default function Consult() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-semibold mb-6">
        Consultation & Guidance
      </h1>

      <p className="text-gray-600 mb-8">
        If you suspect PCOS symptoms, here’s what you can do next:
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="p-6 bg-white rounded-2xl shadow">
          <h3 className="font-semibold mb-2">Consult a Doctor</h3>
          <p className="text-gray-600">
            A gynecologist or endocrinologist can confirm PCOS through blood
            tests and ultrasound.
          </p>
        </div>

        <div className="p-6 bg-white rounded-2xl shadow">
          <h3 className="font-semibold mb-2">Lifestyle Changes</h3>
          <p className="text-gray-600">
            Balanced diet, regular exercise, and stress control can greatly
            improve symptoms.
          </p>
        </div>

        <div className="p-6 bg-white rounded-2xl shadow">
          <h3 className="font-semibold mb-2">Track Symptoms</h3>
          <p className="text-gray-600">
            Monitoring cycles and symptoms helps in long-term management.
          </p>
        </div>

        <div className="p-6 bg-white rounded-2xl shadow">
          <h3 className="font-semibold mb-2">Stay Informed</h3>
          <p className="text-gray-600">
            Knowledge and early screening are key to managing PCOS effectively.
          </p>
        </div>
      </div>
    </div>
  );
}
