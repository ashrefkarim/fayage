export function WelcomeScreen() {
  return (
    <div
      className="relative w-full overflow-hidden flex flex-col"
      style={{ backgroundColor: "#060E1F", fontFamily: "'Inter', sans-serif", height: "100dvh" }}
    >
      {/* Top-right language toggle */}
      <div className="absolute top-10 right-5 z-10">
        <div
          className="flex items-center gap-1 rounded-full px-3 py-1.5 border"
          style={{ backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
        >
          <span className="text-white/80 text-xs font-semibold">FR</span>
          <span className="text-white/25 text-xs">|</span>
          <span className="text-white/35 text-xs">AR</span>
        </div>
      </div>

      {/* Hero zone — no rings, clean disc */}
      <div className="flex-1 flex items-center justify-center" style={{ paddingTop: 72, minHeight: 260 }}>
        {/* Logo disc — just a clean white circle, no blue rings */}
        <div
          className="flex items-center justify-center rounded-full bg-white overflow-hidden"
          style={{
            width: 120,
            height: 120,
            boxShadow: "0 8px 40px rgba(0,0,0,0.45), 0 2px 12px rgba(0,0,0,0.3)",
          }}
        >
          <div
            className="rounded-2xl flex items-center justify-center"
            style={{ width: 80, height: 80, background: "linear-gradient(135deg, #1E88E5, #0D47A1)" }}
          >
            <svg width="46" height="36" viewBox="0 0 46 36" fill="none">
              <rect x="0" y="14" width="30" height="16" rx="3" fill="white" fillOpacity="0.25"/>
              <rect x="6" y="20" width="8" height="10" rx="1.5" fill="white" fillOpacity="0.6"/>
              <circle cx="8" cy="32" r="4" fill="white"/>
              <circle cx="24" cy="32" r="4" fill="white"/>
              <path d="M30 18 L38 8 L46 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 14 L30 18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* White bottom card */}
      <div
        className="bg-white flex flex-col px-7"
        style={{
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          paddingTop: 24,
          paddingBottom: 40,
          gap: 14,
          boxShadow: "0 -6px 28px rgba(0,0,0,0.18)",
        }}
      >
        {/* App name + divider + slogan */}
        <div className="flex flex-col items-center gap-2">
          <h1
            className="text-center"
            style={{ fontSize: 34, fontWeight: 800, color: "#060E1F", letterSpacing: -1, lineHeight: 1.1, margin: 0 }}
          >
            FAYAGE
          </h1>
          <div className="flex items-center gap-2" style={{ width: "55%" }}>
            <div className="flex-1 h-px" style={{ backgroundColor: "#E5E7EB" }} />
            <span style={{ color: "#1E88E5", fontSize: 11 }}>✦</span>
            <div className="flex-1 h-px" style={{ backgroundColor: "#E5E7EB" }} />
          </div>
          <p className="text-center text-sm m-0" style={{ color: "#6B7280", letterSpacing: 0.2 }}>
            Transport rapide et fiable
          </p>
        </div>

        {/* Trust pills */}
        <div className="flex flex-row items-center justify-center flex-wrap" style={{ gap: 8 }}>
          {["🚀 Rapide", "🔒 Sécurisé", "📍 Temps réel"].map((label) => (
            <div
              key={label}
              className="rounded-full px-3 py-1 border"
              style={{ backgroundColor: "#F0F7FF", borderColor: "#DBEAFE" }}
            >
              <span className="text-xs font-semibold" style={{ color: "#1D4ED8" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <button
          className="w-full flex items-center justify-center rounded-full border-none cursor-pointer"
          style={{
            background: "linear-gradient(to right, #1E88E5, #0D47A1)",
            paddingTop: 17,
            paddingBottom: 17,
            gap: 10,
          }}
        >
          <span className="font-bold text-white" style={{ fontSize: 17 }}>Commencer</span>
          <span className="text-white/75 font-semibold" style={{ fontSize: 17 }}>→</span>
        </button>

        {/* Sign-in link */}
        <div className="flex items-center justify-center gap-1">
          <span className="text-sm" style={{ color: "#9CA3AF" }}>J'ai déjà un compte</span>
          <span className="text-sm font-bold" style={{ color: "#1E88E5" }}>Se connecter</span>
        </div>
      </div>
    </div>
  );
}
