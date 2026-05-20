export function WelcomeScreen() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        width: "100%",
        backgroundColor: "#060E1F",
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Top bar — in flex flow, aligned right */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
          alignItems: "center",
          paddingTop: 52,
          paddingRight: 24,
          paddingBottom: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            borderRadius: 100,
            padding: "6px 12px",
            backgroundColor: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: 700 }}>FR</span>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>|</span>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>AR</span>
        </div>
      </div>

      {/* Hero — flex:1, logo centered */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 220,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            boxShadow: "0 8px 40px rgba(0,0,0,0.45), 0 2px 12px rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 18,
              background: "linear-gradient(135deg, #1E88E5, #0D47A1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
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

      {/* White card — natural height at bottom */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          paddingTop: 24,
          paddingBottom: 40,
          paddingLeft: 28,
          paddingRight: 28,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          boxShadow: "0 -6px 28px rgba(0,0,0,0.18)",
        }}
      >
        {/* FAYAGE + divider + slogan */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 34,
              fontWeight: 800,
              color: "#060E1F",
              letterSpacing: -1,
              lineHeight: 1.1,
              textAlign: "center",
            }}
          >
            FAYAGE
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, width: "55%" }}>
            <div style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
            <span style={{ color: "#1E88E5", fontSize: 11 }}>✦</span>
            <div style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "#6B7280", letterSpacing: 0.2, textAlign: "center" }}>
            Transport rapide et fiable
          </p>
        </div>

        {/* Trust pills */}
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 8 }}>
          {["🚀 Rapide", "🔒 Sécurisé", "📍 Temps réel"].map((label) => (
            <div
              key={label}
              style={{
                backgroundColor: "#F0F7FF",
                borderRadius: 100,
                padding: "5px 12px",
                border: "1px solid #DBEAFE",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1D4ED8" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <button
          style={{
            width: "100%",
            background: "linear-gradient(to right, #1E88E5, #0D47A1)",
            border: "none",
            borderRadius: 100,
            padding: "17px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            cursor: "pointer",
          }}
        >
          <span style={{ fontWeight: 700, color: "#fff", fontSize: 17 }}>Commencer</span>
          <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 17, fontWeight: 600 }}>→</span>
        </button>

        {/* Sign-in link */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <span style={{ fontSize: 14, color: "#9CA3AF" }}>J'ai déjà un compte</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1E88E5" }}>Se connecter</span>
        </div>
      </div>
    </div>
  );
}
