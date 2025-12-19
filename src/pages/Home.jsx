import Navbar from "../components/Navbar";
import { translations } from "../utils/translations";

export default function Home({ lang, setLang }) {
  const t = translations[lang];

  return (
    <>
      <Navbar lang={lang} setLang={setLang} />

      {/* HERO */}
      <section className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-white flex items-center">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">

          {/* LEFT */}
          <div className="space-y-6 animate-fadeIn">
            <h1 className="text-5xl font-semibold text-gray-800 leading-tight">
              {t.home.title}{" "}
              <span className="text-pink-600">
                {t.home.highlight}
              </span>
            </h1>

            <p className="text-gray-600 text-lg">
              {t.home.desc}
            </p>

            <div className="flex gap-4">
              <a href="/register" className="btn-primary">
                {t.home.takeAssessment}
              </a>
              <a href="/login" className="btn-secondary">
                {t.nav.login}
              </a>
            </div>

            <p className="text-sm text-gray-400">
              * {t.home.disclaimer}
            </p>
          </div>

          {/* RIGHT */}
          <div className="relative hidden md:block">
            <div className="absolute w-72 h-72 bg-pink-200 rounded-full blur-3xl animate-pulseSlow"></div>
            <div className="relative bg-white p-8 rounded-3xl shadow-lg">
              <p className="text-pink-600 font-medium">
                {lang === "np" ? "तपाईंको स्वास्थ्य महत्त्वपूर्ण छ 🌷" : "Your Health Matters 🌷"}
              </p>
              <p className="text-gray-600 text-sm mt-2">
                {lang === "np"
                  ? "ट्र्याक • सिकाइ • सुधार"
                  : "Track • Learn • Improve"}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* WHAT IS PCOS */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-semibold text-gray-800 mb-6">
            {t.home.whatIs}
          </h2>
          <p className="text-gray-600 leading-relaxed">
            {t.home.whatIsDesc}
          </p>
        </div>
      </section>

      {/* SYMPTOMS */}
<section className="py-20 bg-pink-50">
  <div className="max-w-6xl mx-auto px-6">
    <h2 className="text-3xl font-semibold text-center mb-12">
      {lang === "np"
        ? "PCOS का सामान्य लक्षणहरू"
        : "Common PCOS Symptoms"}
    </h2>

    <div className="grid md:grid-cols-3 gap-8">
      {(lang === "np"
        ? ["अनियमित महिनावारी", "तौल बढ्नु", "एक्ने र अनावश्यक रौँ"]
        : ["Irregular periods", "Weight gain", "Acne & hair growth"]
      ).map((item) => (
        <div
          key={item}
          className="bg-white p-6 rounded-2xl shadow hover:shadow-lg hover:-translate-y-1 transition"
        >
          <p className="text-pink-600 font-medium text-center">
            {item}
          </p>
        </div>
      ))}
    </div>
  </div>
</section>


      {/* HOW IT HELPS */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-semibold mb-12">
            {lang === "np"
              ? "OvaCare ले तपाईंलाई कसरी सहयोग गर्छ?"
              : "How OvaCare Supports You"}
          </h2>

          <div className="grid md:grid-cols-3 gap-10">
            <div className="card">
              <h3 className="font-semibold mb-2">
                {lang === "np" ? "PCOS जोखिम मूल्यांकन" : "PCOS Risk Assessment"}
              </h3>
              <p className="text-gray-600">
                {lang === "np"
                  ? "सरल प्रश्नहरूको उत्तर दिएर आफ्नो जोखिम स्तर बुझ्नुहोस्।"
                  : "Answer simple questions to understand your risk level."}
              </p>
            </div>

            <div className="card">
              <h3 className="font-semibold mb-2">
                {lang === "np" ? "व्यक्तिगत सुझावहरू" : "Personalized Tips"}
              </h3>
              <p className="text-gray-600">
                {lang === "np"
                  ? "नेपाली महिलाका लागि आहार, व्यायाम र जीवनशैली सुझाव।"
                  : "Diet, exercise and lifestyle guidance for Nepali women."}
              </p>
            </div>

            <div className="card">
              <h3 className="font-semibold mb-2">
                {lang === "np" ? "डाक्टरसँग परामर्श" : "Doctor Consultation"}
              </h3>
              <p className="text-gray-600">
                {lang === "np"
                  ? "रिपोर्ट डाउनलोड गरी स्वास्थ्यकर्मीलाई पठाउनुहोस्।"
                  : "Download reports and share with healthcare professionals."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-pink-200 py-10">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-700">
          <p>
            © 2025 OvaCare – {lang === "np" ? "PCOS जानकारी प्लेटफर्म" : "PCOS Awareness Platform"}
          </p>
          <p className="mt-2">
            {lang === "np"
              ? "अस्वीकरण: यो एप शैक्षिक जानकारीका लागि मात्र हो।"
              : "Disclaimer: This application provides educational information only."}
          </p>
        </div>
      </footer>
    </>
  );
}
