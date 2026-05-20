import { useRef, useState } from "react";
import html2canvas from "html2canvas";

const BRAND = "#0066CC";
const BRAND_DARK = "#004A99";
const BRAND_LIGHT = "#3399FF";

interface ScreenshotData {
  id: string;
  gradient: string;
  headline: string;
  subline: string;
  accentColor: string;
  screen: React.ReactNode;
}

/* ── Phone Frame ─────────────────────────────────────────────────── */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: 260,
      height: 540,
      background: "#0A0A0F",
      borderRadius: 40,
      border: "6px solid #1A1A2E",
      boxShadow: "0 0 0 2px #2A2A4E, inset 0 0 20px rgba(0,0,0,0.5)",
      position: "relative",
      overflow: "hidden",
      flexShrink: 0,
    }}>
      {/* Dynamic Island */}
      <div style={{
        position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
        width: 90, height: 28, background: "#0A0A0F", borderRadius: 20, zIndex: 10,
        boxShadow: "0 2px 8px rgba(0,0,0,0.8)",
      }} />
      {/* Screen content */}
      <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: 34 }}>
        {children}
      </div>
      {/* Bottom bar */}
      <div style={{
        position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
        width: 80, height: 4, background: "rgba(255,255,255,0.3)", borderRadius: 4, zIndex: 10,
      }} />
    </div>
  );
}

/* ── Star Row ─────────────────────────────────────────────────────── */
function Stars({ n = 5 }: { n?: number }) {
  return (
    <span style={{ color: "#F59E0B", fontSize: 10, letterSpacing: 1 }}>
      {"★".repeat(n)}
    </span>
  );
}

/* ── App Screen Mockups ───────────────────────────────────────────── */
function HomeScreen() {
  return (
    <div style={{ background: "#F1F5F9", height: "100%", fontFamily: "Inter, sans-serif", paddingTop: 52 }}>
      {/* Header */}
      <div style={{ background: BRAND, padding: "14px 16px 18px", color: "#fff" }}>
        <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 2 }}>Bonjour 👋</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Où livrez-vous?</div>
        <div style={{ marginTop: 10, background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, opacity: 0.8 }}>🔍</span>
          <span style={{ fontSize: 10, opacity: 0.7 }}>Ville de départ...</span>
        </div>
      </div>
      {/* Quick actions */}
      <div style={{ padding: "14px 14px 0" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#1E293B", marginBottom: 10 }}>Créer une livraison</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { icon: "📦", label: "Colis / Palette", color: "#EFF6FF" },
            { icon: "🚛", label: "Marchandise lourde", color: "#F0FDF4" },
            { icon: "🏪", label: "Commerce", color: "#FFF7ED" },
            { icon: "🏠", label: "Déménagement", color: "#FDF4FF" },
          ].map((item) => (
            <div key={item.label} style={{ background: item.color, borderRadius: 12, padding: "12px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 22 }}>{item.icon}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: "#374151", textAlign: "center" }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Recent */}
      <div style={{ padding: "14px 14px 0" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#1E293B", marginBottom: 8 }}>Demandes récentes</div>
        {[
          { from: "Alger", to: "Oran", status: "Livré", color: "#10B981" },
          { from: "Constantine", to: "Annaba", status: "En cours", color: BRAND },
        ].map((r) => (
          <div key={r.from} style={{ background: "#fff", borderRadius: 10, padding: "10px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#1E293B" }}>{r.from} → {r.to}</div>
              <div style={{ fontSize: 9, color: "#94A3B8", marginTop: 2 }}>Camion plateau</div>
            </div>
            <div style={{ background: r.color + "18", borderRadius: 20, padding: "3px 8px" }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: r.color }}>{r.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OffersScreen() {
  return (
    <div style={{ background: "#F1F5F9", height: "100%", fontFamily: "Inter, sans-serif", paddingTop: 52 }}>
      {/* Header */}
      <div style={{ background: BRAND, padding: "14px 16px 14px", color: "#fff" }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Alger → Oran</div>
        <div style={{ fontSize: 9, opacity: 0.8, marginTop: 2 }}>3 chauffeurs disponibles</div>
      </div>
      <div style={{ padding: "12px 12px 0" }}>
        {[
          { name: "Karim B.", rating: 4.9, trips: 128, price: "4 500 DA", vehicle: "Camion plateau", badge: "⭐ Top", badgeColor: "#F59E0B" },
          { name: "Mohamed A.", rating: 4.7, trips: 76, price: "3 900 DA", vehicle: "Fourgon", badge: "NOUVEAU", badgeColor: "#10B981" },
          { name: "Yacine D.", rating: 5.0, trips: 241, price: "5 200 DA", vehicle: "Semi-remorque", badge: "⭐ Top", badgeColor: "#F59E0B" },
        ].map((d) => (
          <div key={d.name} style={{ background: "#fff", borderRadius: 14, padding: "12px", marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {/* Avatar */}
                <div style={{ width: 38, height: 38, borderRadius: 19, background: `linear-gradient(135deg, ${BRAND}, ${BRAND_LIGHT})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700 }}>
                  {d.name[0]}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1E293B" }}>{d.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <Stars />
                    <span style={{ fontSize: 9, color: "#64748B" }}>{d.rating} · {d.trips} courses</span>
                  </div>
                  <div style={{ fontSize: 9, color: "#94A3B8", marginTop: 2 }}>{d.vehicle}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: BRAND }}>{d.price}</div>
                <div style={{ marginTop: 4, background: d.badgeColor + "20", borderRadius: 8, padding: "2px 6px" }}>
                  <span style={{ fontSize: 8, fontWeight: 700, color: d.badgeColor }}>{d.badge}</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10, background: BRAND, borderRadius: 10, padding: "8px", textAlign: "center" }}>
              <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>Accepter l'offre</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrackingScreen() {
  return (
    <div style={{ background: "#1E293B", height: "100%", fontFamily: "Inter, sans-serif", paddingTop: 52, position: "relative", overflow: "hidden" }}>
      {/* Map background */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #1a2744 0%, #0f172a 100%)" }}>
        {/* Road lines */}
        {[30, 80, 130, 180].map((y) => (
          <div key={y} style={{ position: "absolute", top: y + 60, left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.05)" }} />
        ))}
        {[50, 130, 200].map((x) => (
          <div key={x} style={{ position: "absolute", top: 0, bottom: 0, left: x, width: 1, background: "rgba(255,255,255,0.05)" }} />
        ))}
        {/* Dots representing map */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            top: `${(i * 37) % 100}%`,
            left: `${(i * 53) % 100}%`,
            width: 3, height: 3, borderRadius: "50%",
            background: "rgba(255,255,255,0.08)"
          }} />
        ))}
        {/* Route line */}
        <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
          <path d="M 40 380 Q 130 280 200 200 Q 230 160 220 120" stroke={BRAND_LIGHT} strokeWidth="3" fill="none" strokeDasharray="8 4" opacity="0.8" />
          {/* Truck marker */}
          <circle cx="160" cy="240" r="12" fill={BRAND} />
          <text x="160" y="245" textAnchor="middle" fontSize="12" fill="white">🚛</text>
          {/* Destination */}
          <circle cx="218" cy="118" r="8" fill="#10B981" />
          <text x="218" y="123" textAnchor="middle" fontSize="10" fill="white">📍</text>
          {/* Origin */}
          <circle cx="40" cy="382" r="6" fill="#F59E0B" />
        </svg>
      </div>
      {/* Top card */}
      <div style={{ position: "relative", margin: "8px 10px 0", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", borderRadius: 14, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)" }}>EN TRANSIT</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", marginTop: 2 }}>Alger → Oran</div>
          </div>
          <div style={{ background: "#10B981", borderRadius: 20, padding: "4px 10px" }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>EN ROUTE</span>
          </div>
        </div>
      </div>
      {/* Bottom panel */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(15,23,42,0.97) 30%)", padding: "40px 14px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>ARRIVÉE ESTIMÉE</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>14:35</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>DISTANCE</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>348 km</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>CHAUFFEUR</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Karim B.</div>
            <Stars />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, background: BRAND, borderRadius: 10, padding: "10px", textAlign: "center" }}>
            <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>📞 Appeler</span>
          </div>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px", textAlign: "center", border: "1px solid rgba(255,255,255,0.15)" }}>
            <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>💬 Message</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentScreen() {
  return (
    <div style={{ background: "#F1F5F9", height: "100%", fontFamily: "Inter, sans-serif", paddingTop: 52 }}>
      <div style={{ background: BRAND, padding: "14px 16px 20px", color: "#fff" }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Confirmer le paiement</div>
        <div style={{ fontSize: 9, opacity: 0.8, marginTop: 2 }}>Livraison Alger → Oran</div>
      </div>
      <div style={{ padding: "14px 14px 0" }}>
        {/* Price card */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 12, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 6 }}>MONTANT TOTAL</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: BRAND }}>4 500 <span style={{ fontSize: 16, fontWeight: 700 }}>DA</span></div>
          <div style={{ marginTop: 8, background: "#F0FDF4", borderRadius: 8, padding: "6px 12px", display: "inline-block" }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#10B981" }}>✓ Prix convenu avec le chauffeur</span>
          </div>
        </div>
        {/* Payment methods */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#1E293B", marginBottom: 10 }}>Mode de paiement</div>
          {[
            { icon: "💵", label: "Espèces à la livraison", selected: true },
            { icon: "📱", label: "Virement bancaire", selected: false },
            { icon: "💳", label: "Carte bancaire", selected: false },
          ].map((m) => (
            <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ fontSize: 16 }}>{m.icon}</div>
              <div style={{ flex: 1, fontSize: 10, fontWeight: 600, color: "#1E293B" }}>{m.label}</div>
              <div style={{ width: 16, height: 16, borderRadius: 8, border: `2px solid ${m.selected ? BRAND : "#CBD5E1"}`, background: m.selected ? BRAND : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {m.selected && <div style={{ width: 6, height: 6, borderRadius: 3, background: "#fff" }} />}
              </div>
            </div>
          ))}
        </div>
        {/* CTA */}
        <div style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_LIGHT})`, borderRadius: 14, padding: "14px", textAlign: "center", boxShadow: `0 4px 16px ${BRAND}40` }}>
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 800 }}>Confirmer & Payer</span>
        </div>
      </div>
    </div>
  );
}

function DriverScreen() {
  return (
    <div style={{ background: "#0F172A", height: "100%", fontFamily: "Inter, sans-serif", paddingTop: 52 }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👨‍✈️</div>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>Chauffeur Partenaire</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Karim Benali</div>
          </div>
          <div style={{ marginLeft: "auto", background: "#10B981", borderRadius: 12, padding: "4px 10px" }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>● EN LIGNE</span>
          </div>
        </div>
      </div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "12px 12px 0" }}>
        {[
          { label: "Ce mois", value: "87 400", unit: "DA" },
          { label: "Courses", value: "42", unit: "" },
          { label: "Note", value: "4.9", unit: "⭐" },
        ].map((s) => (
          <div key={s.label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "10px 8px", textAlign: "center", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{s.value}<span style={{ fontSize: 9 }}>{s.unit}</span></div>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      {/* Nearby requests */}
      <div style={{ padding: "12px 12px 0" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>DEMANDES PROCHES</div>
        {[
          { from: "Alger Centre", to: "Blida", price: "3 200 DA", weight: "2.5T", urgent: true },
          { from: "Bab El Oued", to: "Tipaza", price: "1 800 DA", weight: "500kg", urgent: false },
        ].map((r) => (
          <div key={r.from} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "10px 12px", marginBottom: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{r.from} → {r.to}</span>
                  {r.urgent && <span style={{ background: "#EF444420", borderRadius: 6, padding: "1px 5px", fontSize: 7, fontWeight: 700, color: "#EF4444" }}>URGENT</span>}
                </div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>⚖️ {r.weight}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: BRAND_LIGHT }}>{r.price}</div>
            </div>
            <div style={{ marginTop: 8, background: BRAND, borderRadius: 8, padding: "7px", textAlign: "center" }}>
              <span style={{ color: "#fff", fontSize: 9, fontWeight: 700 }}>Faire une offre</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main data ────────────────────────────────────────────────────── */
const SCREENSHOTS: ScreenshotData[] = [
  {
    id: "home",
    gradient: `linear-gradient(160deg, ${BRAND_DARK} 0%, ${BRAND} 50%, ${BRAND_LIGHT} 100%)`,
    headline: "Envoyez vos\nmarchandises\nen toute simplicité",
    subline: "Créez une demande en 2 minutes et recevez des offres de chauffeurs locaux",
    accentColor: "#fff",
    screen: <HomeScreen />,
  },
  {
    id: "offers",
    gradient: `linear-gradient(160deg, #1a1a3e 0%, #002966 60%, ${BRAND} 100%)`,
    headline: "Comparez les\noffres de\nchauffeurs",
    subline: "Notes, prix et disponibilité — choisissez le meilleur chauffeur pour vous",
    accentColor: "#60AFFF",
    screen: <OffersScreen />,
  },
  {
    id: "tracking",
    gradient: `linear-gradient(160deg, #0a0f1e 0%, #0d1f3c 60%, #0d2952 100%)`,
    headline: "Suivez votre\nlivraison en\ntemps réel",
    subline: "Localisez votre chauffeur sur la carte et restez informé à chaque étape",
    accentColor: "#60AFFF",
    screen: <TrackingScreen />,
  },
  {
    id: "payment",
    gradient: `linear-gradient(160deg, #064E3B 0%, #047857 50%, #10B981 100%)`,
    headline: "Paiement simple\net sécurisé",
    subline: "Espèces, virement ou carte — payez comme vous voulez à la livraison",
    accentColor: "#A7F3D0",
    screen: <PaymentScreen />,
  },
  {
    id: "driver",
    gradient: `linear-gradient(160deg, #1e1b4b 0%, #312e81 50%, ${BRAND} 100%)`,
    headline: "Devenez\nchauffeur\npartenaire",
    subline: "Gérez vos courses, fixez vos prix et augmentez vos revenus facilement",
    accentColor: "#A5B4FC",
    screen: <DriverScreen />,
  },
];

/* ── Screenshot Card ──────────────────────────────────────────────── */
function ScreenshotCard({ data, index }: { data: ScreenshotData; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `fayage-screenshot-${index + 1}-${data.id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error(e);
    }
    setDownloading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      {/* The card itself — this is what gets exported */}
      <div
        ref={cardRef}
        style={{
          width: 390,
          height: 844,
          background: data.gradient,
          borderRadius: 32,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "48px 28px 40px",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.4)",
        }}
      >
        {/* Background decoration */}
        <div style={{
          position: "absolute", top: -80, right: -80, width: 300, height: 300,
          borderRadius: "50%", background: "rgba(255,255,255,0.05)",
        }} />
        <div style={{
          position: "absolute", bottom: 140, left: -60, width: 200, height: 200,
          borderRadius: "50%", background: "rgba(255,255,255,0.04)",
        }} />

        {/* Top: FAYAGE logo + screenshot number */}
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 1 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 22, color: "#fff", letterSpacing: 3 }}>
            FAYAGE
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "4px 12px", backdropFilter: "blur(8px)" }}>
            <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{index + 1} / 5</span>
          </div>
        </div>

        {/* Middle: Phone frame */}
        <div style={{ zIndex: 1 }}>
          <PhoneFrame>{data.screen}</PhoneFrame>
        </div>

        {/* Bottom: Marketing copy */}
        <div style={{ textAlign: "center", zIndex: 1 }}>
          <h2 style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 28,
            fontWeight: 900,
            color: "#fff",
            lineHeight: 1.2,
            margin: 0,
            marginBottom: 12,
            whiteSpace: "pre-line",
            textShadow: "0 2px 12px rgba(0,0,0,0.3)",
          }}>
            {data.headline}
          </h2>
          <p style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 14,
            color: data.accentColor,
            opacity: 0.85,
            lineHeight: 1.5,
            margin: 0,
            maxWidth: 300,
          }}>
            {data.subline}
          </p>
          {/* Store badges */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
            {["App Store", "Google Play"].map((s) => (
              <div key={s} style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 12,
                padding: "6px 16px",
                backdropFilter: "blur(8px)",
              }}>
                <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>
                  {s === "App Store" ? "🍎" : "▶"} {s}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Download button (outside the exported area) */}
      <button
        onClick={download}
        disabled={downloading}
        style={{
          background: downloading ? "#94A3B8" : `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND})`,
          color: "#fff",
          border: "none",
          borderRadius: 14,
          padding: "12px 32px",
          fontSize: 14,
          fontWeight: 700,
          cursor: downloading ? "not-allowed" : "pointer",
          boxShadow: downloading ? "none" : `0 4px 16px ${BRAND}50`,
          transition: "all 0.2s",
          fontFamily: "Inter, sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {downloading ? "⏳ Génération..." : "⬇️ Télécharger PNG"}
      </button>
    </div>
  );
}

/* ── App ──────────────────────────────────────────────────────────── */
export default function App() {
  const [downloadingAll, setDownloadingAll] = useState(false);

  const downloadAll = async () => {
    setDownloadingAll(true);
    const cards = document.querySelectorAll("[data-screenshot-card]");
    for (let i = 0; i < cards.length; i++) {
      try {
        const canvas = await html2canvas(cards[i] as HTMLElement, {
          scale: 3,
          useCORS: true,
          backgroundColor: null,
          logging: false,
        });
        const link = document.createElement("a");
        link.download = `fayage-screenshot-${i + 1}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        await new Promise((r) => setTimeout(r, 800));
      } catch (e) {
        console.error(e);
      }
    }
    setDownloadingAll(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0F172A",
      fontFamily: "Inter, sans-serif",
      padding: "40px 20px 60px",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: "#fff", letterSpacing: 4, marginBottom: 8 }}>
          FAYAGE
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#94A3B8", marginBottom: 4 }}>
          Store Screenshot Generator
        </div>
        <div style={{ fontSize: 14, color: "#64748B", marginBottom: 24 }}>
          5 screenshots · App Store (6.7") & Google Play ready
        </div>
        <button
          onClick={downloadAll}
          disabled={downloadingAll}
          style={{
            background: downloadingAll ? "#334155" : `linear-gradient(135deg, #10B981, #059669)`,
            color: "#fff",
            border: "none",
            borderRadius: 16,
            padding: "14px 40px",
            fontSize: 15,
            fontWeight: 700,
            cursor: downloadingAll ? "not-allowed" : "pointer",
            boxShadow: downloadingAll ? "none" : "0 4px 20px rgba(16,185,129,0.4)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {downloadingAll ? "⏳ Téléchargement en cours..." : "⬇️ Télécharger tous (5 PNG)"}
        </button>
        <div style={{ marginTop: 10, fontSize: 12, color: "#475569" }}>
          Chaque PNG = 1170 × 2532 px (3× scale) · Compatible App Store & Play Store
        </div>
      </div>

      {/* Screenshots grid */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 40,
        justifyContent: "center",
        maxWidth: 1400,
        margin: "0 auto",
      }}>
        {SCREENSHOTS.map((s, i) => (
          <div key={s.id} data-screenshot-card-wrapper>
            <div data-screenshot-card style={{ display: "contents" }}>
              <ScreenshotCard data={s} index={i} />
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div style={{
        maxWidth: 700,
        margin: "48px auto 0",
        background: "rgba(255,255,255,0.04)",
        borderRadius: 20,
        padding: "24px 28px",
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 14 }}>📋 Instructions de soumission</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#60A5FA", marginBottom: 6 }}>🍎 App Store (Apple)</div>
            <ul style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.8, margin: 0, paddingLeft: 16 }}>
              <li>6.7" requis : 1290 × 2796 px</li>
              <li>5.5" requis : 1242 × 2208 px</li>
              <li>Format PNG ou JPG</li>
              <li>Minimum 2 screenshots par taille</li>
              <li>Upload sur App Store Connect</li>
            </ul>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#4ADE80", marginBottom: 6 }}>▶ Google Play</div>
            <ul style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.8, margin: 0, paddingLeft: 16 }}>
              <li>Requis : min 1080 × 1920 px</li>
              <li>Entre 2 et 8 screenshots</li>
              <li>Format PNG ou JPG</li>
              <li>Feature graphic : 1024 × 500 px</li>
              <li>Upload sur Play Console</li>
            </ul>
          </div>
        </div>
        <div style={{ marginTop: 16, fontSize: 11, color: "#64748B", background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 14px" }}>
          💡 Les PNG téléchargés (3× scale = ~1170 × 2532 px) sont acceptés directement par App Store Connect. Pour Google Play, vous pouvez les utiliser tels quels ou les redimensionner.
        </div>
      </div>
    </div>
  );
}
