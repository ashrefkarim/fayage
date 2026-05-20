import { useEffect, useRef } from "react";

export function WelcomeScreen() {
  const glow1Ref = useRef<HTMLDivElement>(null);
  const glow2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const animate = () => {
      const t = (Math.sin(Date.now() / 3000) + 1) / 2; // 0..1 breathing
      if (glow1Ref.current) {
        glow1Ref.current.style.opacity = String(0.35 + t * 0.35);
        glow1Ref.current.style.transform = `translate(-50%, -50%) scale(${1 + t * 0.18})`;
      }
      if (glow2Ref.current) {
        glow2Ref.current.style.opacity = String(0.2 + t * 0.25);
        glow2Ref.current.style.transform = `translate(-50%, -50%) scale(${1 + t * 0.12})`;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col" style={{ backgroundColor: "#060E1F", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Animated glow blobs ── */}
      <div
        ref={glow1Ref}
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 380,
          height: 380,
          background: "radial-gradient(circle, #1565C0 0%, transparent 70%)",
          top: "35%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          transition: "opacity 0.05s, transform 0.05s",
        }}
      />
      <div
        ref={glow2Ref}
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 200,
          height: 200,
          background: "radial-gradient(circle, #42A5F5 0%, transparent 70%)",
          top: "35%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          transition: "opacity 0.05s, transform 0.05s",
        }}
      />

      {/* Top-right language toggle placeholder */}
      <div className="absolute top-12 right-6 z-10">
        <div className="flex items-center gap-1 bg-white/10 rounded-full px-3 py-1.5 backdrop-blur-sm border border-white/20">
          <span className="text-white/70 text-xs font-medium">FR</span>
          <span className="text-white/30 text-xs">|</span>
          <span className="text-white/40 text-xs font-medium">AR</span>
        </div>
      </div>

      {/* ── Hero visual (top 56%) ── */}
      <div className="flex-1 flex items-center justify-center" style={{ paddingTop: 40 }}>
        {/* Outer ring */}
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 200,
            height: 200,
            border: "1px solid rgba(100,160,255,0.18)",
          }}
        >
          {/* Mid ring */}
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 160,
              height: 160,
              border: "1.5px solid rgba(100,160,255,0.32)",
            }}
          >
            {/* Logo disc */}
            <div
              className="flex items-center justify-center rounded-full bg-white overflow-hidden"
              style={{
                width: 120,
                height: 120,
                boxShadow: "0 0 40px 12px rgba(30,136,229,0.55)",
              }}
            >
              {/* Logo placeholder */}
              <div className="flex flex-col items-center justify-center">
                <div
                  className="rounded-2xl flex items-center justify-center"
                  style={{
                    width: 72,
                    height: 72,
                    background: "linear-gradient(135deg, #1E88E5, #0D47A1)",
                  }}
                >
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <path d="M4 26 L14 14 L20 20 L28 10 L36 18" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="14" cy="30" r="4" fill="white"/>
                    <circle cx="30" cy="30" r="4" fill="white"/>
                    <rect x="4" y="22" width="22" height="10" rx="2" fill="white" fillOpacity="0.3"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── White bottom card ── */}
      <div
        className="bg-white flex flex-col gap-5 px-7"
        style={{
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          paddingTop: 28,
          paddingBottom: 44,
          boxShadow: "0 -8px 32px rgba(0,0,0,0.18)",
          minHeight: "48%",
        }}
      >
        {/* App name + divider + slogan */}
        <div className="flex flex-col items-center gap-2">
          <h1
            className="text-center tracking-tight"
            style={{ fontSize: 36, fontWeight: 800, color: "#060E1F", letterSpacing: -1, lineHeight: 1.1 }}
          >
            FAYAGE
          </h1>
          <div className="flex items-center gap-2 w-3/5">
            <div className="flex-1 h-px bg-gray-200" />
            <span style={{ color: "#1E88E5", fontSize: 11 }}>✦</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <p className="text-center text-sm" style={{ color: "#6B7280", letterSpacing: 0.2 }}>
            Transport rapide et fiable
          </p>
        </div>

        {/* Trust pills */}
        <div className="flex flex-row items-center justify-center gap-2 flex-wrap">
          {["🚀 Rapide", "🔒 Sécurisé", "📍 Temps réel"].map((label) => (
            <div
              key={label}
              className="rounded-full px-3 py-1.5 border"
              style={{ backgroundColor: "#F0F7FF", borderColor: "#DBEAFE" }}
            >
              <span className="text-xs font-semibold" style={{ color: "#1D4ED8" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <button
          className="w-full flex items-center justify-center gap-2 rounded-full"
          style={{
            background: "linear-gradient(to right, #1E88E5, #0D47A1)",
            paddingTop: 18,
            paddingBottom: 18,
            border: "none",
            cursor: "pointer",
          }}
        >
          <span className="font-bold text-white" style={{ fontSize: 17, letterSpacing: 0.2 }}>
            Commencer
          </span>
          <span className="text-white/80 font-semibold" style={{ fontSize: 18 }}>→</span>
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
