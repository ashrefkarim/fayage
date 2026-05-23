import { useState, useEffect, useRef, createContext, useContext } from "react";
import { Link } from "wouter";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  Package,
  MapPin,
  Clock,
  MessageSquare,
  Truck,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Smartphone,
  Globe,
  Star,
  Zap,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

/* ── Download Modal Context ───────────────────────────────── */
type ModalRole = "client" | "chauffeur" | null;
const ModalContext = createContext<{ open: (r: "client" | "chauffeur") => void }>({ open: () => {} });
const useModal = () => useContext(ModalContext);

const DownloadModal = ({ role, onClose }: { role: ModalRole; onClose: () => void }) => {
  const { t } = useLanguage();
  useEffect(() => {
    if (!role) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [role, onClose]);

  const isClient = role === "client";

  return (
    <AnimatePresence>
      {role && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative bg-background rounded-3xl shadow-2xl w-full max-w-sm p-8 z-10"
            initial={{ scale: 0.92, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 24 }}
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
              <X size={20} />
            </button>

            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${isClient ? "bg-primary/10" : "bg-accent/10"}`}>
              {isClient
                ? <Package size={28} className="text-primary" />
                : <Truck size={28} className="text-accent" />}
            </div>

            <h3 className="font-display text-2xl font-bold mb-1">
              {isClient ? t.modal.clientTitle : t.modal.driverTitle}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {isClient ? t.modal.clientDesc : t.modal.driverDesc}
            </p>

            <div className="flex flex-col gap-3">
              <a
                href="https://play.google.com/store/apps/details?id=com.fayage.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-foreground text-background rounded-2xl px-5 py-3 hover:bg-foreground/90 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 shrink-0">
                  <path d="M3.18 23.76c.3.17.64.24.99.2l13.5-7.79-2.89-2.89L3.18 23.76zM.54 1.46C.2 1.8 0 2.35 0 3.07v17.86c0 .72.2 1.27.54 1.61l.08.08 10-10v-.24L.62 1.38l-.08.08zM20.54 10.5l-2.87-1.66-3.23 3.23 3.23 3.23 2.89-1.67c.82-.47.82-1.24-.02-1.13zM4.17.24l13.5 7.79-2.89 2.89L4.17.24z"/>
                </svg>
                <div>
                  <div className="text-xs opacity-70 leading-none">{t.modal.availableOn}</div>
                  <div className="font-bold text-sm leading-tight">Google Play</div>
                </div>
              </a>
              <a
                href="https://apps.apple.com/app/fayage"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 border border-border rounded-2xl px-5 py-3 hover:bg-muted transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 shrink-0">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div>
                  <div className="text-xs text-muted-foreground leading-none">{t.modal.availableOn}</div>
                  <div className="font-bold text-sm leading-tight">App Store</div>
                </div>
              </a>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-5">
              {t.modal.free}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ── Language Toggle ──────────────────────────────────────── */
const LangToggle = () => {
  const { lang, setLang } = useLanguage();
  return (
    <button
      onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted/60 hover:bg-muted text-sm font-semibold transition-colors"
      aria-label="Changer de langue / تغيير اللغة"
    >
      <Globe size={14} className="text-primary" />
      {lang === "fr" ? "العربية" : "Français"}
    </button>
  );
};

const Navbar = () => {
  const { t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { open: openModal } = useModal();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-background/90 backdrop-blur-md border-b border-border py-3' : 'bg-transparent py-5'}`}>
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src={import.meta.env.BASE_URL + 'icon.png'} className="w-8 h-8 rounded-lg object-cover" alt="Fayage" />
          <span className="font-display font-bold text-2xl tracking-tight text-foreground">Fayage</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 font-medium text-sm">
          <a href="#clients" className="text-foreground/80 hover:text-primary transition-colors">{t.nav.clients}</a>
          <a href="#chauffeurs" className="text-foreground/80 hover:text-primary transition-colors">{t.nav.drivers}</a>
          <a href="#comment-ca-marche" className="text-foreground/80 hover:text-primary transition-colors">{t.nav.howItWorks}</a>
          <a href="#flotte" className="text-foreground/80 hover:text-primary transition-colors">{t.nav.fleet}</a>
          <a href="#contact" className="text-foreground/80 hover:text-primary transition-colors">{t.nav.contact}</a>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <LangToggle />
          <Button onClick={() => openModal("client")} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25">
            {t.nav.download}
          </Button>
        </div>

        <div className="md:hidden flex items-center gap-2">
          <LangToggle />
          <button
            className="p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-xl p-4 flex flex-col gap-4">
          <a href="#clients" className="block py-2 text-foreground/80 font-medium" onClick={() => setMobileMenuOpen(false)}>{t.nav.clients}</a>
          <a href="#chauffeurs" className="block py-2 text-foreground/80 font-medium" onClick={() => setMobileMenuOpen(false)}>{t.nav.drivers}</a>
          <a href="#comment-ca-marche" className="block py-2 text-foreground/80 font-medium" onClick={() => setMobileMenuOpen(false)}>{t.nav.howItWorks}</a>
          <a href="#flotte" className="block py-2 text-foreground/80 font-medium" onClick={() => setMobileMenuOpen(false)}>{t.nav.fleet}</a>
          <a href="#contact" className="block py-2 text-foreground/80 font-medium" onClick={() => setMobileMenuOpen(false)}>{t.nav.contact}</a>
          <div className="h-px bg-border w-full my-2"></div>
          <Button onClick={() => { openModal("client"); setMobileMenuOpen(false); }} className="w-full justify-center bg-primary">{t.nav.download}</Button>
        </div>
      )}
    </header>
  );
};

const Hero = () => {
  const { t } = useLanguage();
  const { open } = useModal();
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 60]);

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          <motion.div
            className="flex-1 text-center lg:text-start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 border border-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              {t.hero.badge}
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
              {t.hero.title1} <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">{t.hero.title2}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0">
              {t.hero.desc}
              <span className="block mt-2 text-sm opacity-80">{t.hero.bilingual}</span>
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Button size="lg" onClick={() => open("client")} className="w-full sm:w-auto rounded-full bg-secondary hover:bg-secondary/90 text-secondary-foreground h-14 px-8 text-base">
                {t.hero.btnClient}
              </Button>
              <Button size="lg" variant="outline" onClick={() => open("chauffeur")} className="w-full sm:w-auto rounded-full border-border hover:bg-muted h-14 px-8 text-base group">
                {t.hero.btnDriver}
                <ChevronRight className="ms-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>

          <motion.div
            className="flex-1 relative w-full max-w-lg lg:max-w-none"
            style={{ y: y1 }}
          >
            <div className="relative aspect-[4/5] md:aspect-square lg:aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/10">
              <img
                src={import.meta.env.BASE_URL + 'hero.png'}
                alt="Transport logistique au Maroc"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>

              <motion.div
                className="absolute bottom-6 left-6 right-6 bg-background/95 backdrop-blur-md border border-border rounded-2xl p-4 shadow-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.hero.statusLabel}</div>
                    <div className="font-bold text-foreground">{t.hero.statusValue}</div>
                  </div>
                  <div className="ms-auto text-end">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.hero.etaLabel}</div>
                    <div className="font-bold text-primary">14:30</div>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const ValueProps = () => {
  const { t } = useLanguage();
  const { open } = useModal();
  return (
    <section className="py-24 bg-muted/50 border-y border-border">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">{t.valueProps.heading}</h2>
          <p className="text-lg text-muted-foreground">{t.valueProps.subheading}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <motion.div
            id="clients"
            className="bg-card rounded-[2rem] p-8 md:p-10 shadow-sm border border-card-border relative overflow-hidden group hover:shadow-md transition-shadow"
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 20 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110 duration-500"></div>

            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-8">
              <Package size={32} />
            </div>

            <h3 className="font-display text-2xl font-bold mb-4">{t.valueProps.clientTitle}</h3>
            <p className="text-muted-foreground mb-8">{t.valueProps.clientDesc}</p>

            <ul className="space-y-4 mb-8">
              {t.valueProps.clientFeatures.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <img
              src={import.meta.env.BASE_URL + 'app-drivers.jpg'}
              alt="Client Fayage"
              className="w-full h-48 object-cover object-top rounded-xl mb-6 shadow-sm"
            />

            <Button variant="outline" onClick={() => open("client")} className="w-full rounded-xl h-12 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
              {t.valueProps.clientBtn}
            </Button>
          </motion.div>

          <motion.div
            id="chauffeurs"
            className="bg-secondary rounded-[2rem] p-8 md:p-10 shadow-sm border border-secondary-border relative overflow-hidden group hover:shadow-md transition-shadow text-secondary-foreground"
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 20 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.1 }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-bl-full -z-10 transition-transform group-hover:scale-110 duration-500"></div>

            <div className="w-16 h-16 rounded-2xl bg-accent/20 text-accent flex items-center justify-center mb-8">
              <Truck size={32} />
            </div>

            <h3 className="font-display text-2xl font-bold mb-4 text-white">{t.valueProps.driverTitle}</h3>
            <p className="text-secondary-foreground/80 mb-8">{t.valueProps.driverDesc}</p>

            <ul className="space-y-4 mb-8 text-white">
              {t.valueProps.driverFeatures.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-accent"></div>
                  </div>
                  <span className="font-medium text-secondary-foreground/90">{item}</span>
                </li>
              ))}
            </ul>

            <img
              src={import.meta.env.BASE_URL + 'app-drivers.jpg'}
              alt="Chauffeur Fayage"
              className="w-full h-48 object-cover object-top rounded-xl mb-6 shadow-sm opacity-90"
            />

            <Button onClick={() => open("chauffeur")} className="w-full rounded-xl h-12 bg-accent hover:bg-accent/90 text-accent-foreground border-none transition-colors">
              {t.valueProps.driverBtn}
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Steps = () => {
  const { t } = useLanguage();
  const nums = ["01", "02", "03", "04"];

  return (
    <section id="comment-ca-marche" className="py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">{t.steps.heading}</h2>
          <p className="text-lg text-muted-foreground">{t.steps.subheading}</p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {t.steps.items.map((step, i) => (
            <motion.div
              key={i}
              className="relative text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              {i < t.steps.items.length - 1 && (
                <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-border -z-10">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 border-t-2 border-r-2 border-border w-3 h-3 rotate-45"></div>
                </div>
              )}
              <div className="w-24 h-24 rounded-3xl bg-card border border-border shadow-sm flex items-center justify-center mx-auto mb-6 text-2xl font-bold font-display text-primary z-10 relative">
                {nums[i]}
              </div>
              <h4 className="font-bold text-xl mb-3">{step.title}</h4>
              <p className="text-muted-foreground text-sm">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Features = () => {
  const { t } = useLanguage();
  const icons = [<Clock size={28} />, <MapPin size={28} />, <MessageSquare size={28} />, <ShieldCheck size={28} />];

  return (
    <section className="py-24 overflow-hidden relative bg-card border-y border-border">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 w-full relative">
            <div className="absolute inset-0 bg-primary/5 rounded-[3rem] transform -rotate-3 scale-105"></div>
            <motion.div
              className="relative bg-background border border-border shadow-xl rounded-[2.5rem] overflow-hidden aspect-[4/3] flex items-center justify-center p-8"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <img
                src={import.meta.env.BASE_URL + 'hero.jpg'}
                alt="Interface de l'application Fayage"
                className="w-full h-full object-cover rounded-2xl drop-shadow-2xl"
              />
            </motion.div>
          </div>

          <div className="flex-1 w-full">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">{t.features.heading}</h2>
            <p className="text-lg text-muted-foreground mb-12">{t.features.subheading}</p>

            <div className="grid sm:grid-cols-2 gap-8">
              {t.features.items.map((feat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    {icons[i]}
                  </div>
                  <h4 className="font-bold text-lg mb-2">{feat.title}</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feat.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const screenSrcs = [
  "screenshots/screen1.jpg",
  "screenshots/screen2.jpg",
  "screenshots/screen3.jpg",
  "screenshots/screen4.jpg",
  "screenshots/screen5.jpg",
  "screenshots/screen6.jpg",
  "screenshots/screen7.jpg",
  "screenshots/screen8.jpg",
];

const AppScreenshots = () => {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 300 : -300, behavior: "smooth" });
  };

  return (
    <section className="py-24 bg-secondary overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 mb-12 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-accent mb-4 px-3 py-1 bg-accent/10 rounded-full">{t.screenshots.badge}</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-secondary-foreground mb-4">{t.screenshots.heading}</h2>
          <p className="text-secondary-foreground/70 text-lg max-w-xl mx-auto">{t.screenshots.subheading}</p>
        </motion.div>
      </div>

      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
          aria-label="Précédent"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
          aria-label="Suivant"
        >
          <ChevronRight size={20} />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto scroll-smooth pb-4 px-12"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {screenSrcs.map((src, i) => (
            <motion.div
              key={i}
              className="flex-none"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/40 w-52">
                <img
                  src={import.meta.env.BASE_URL + src}
                  alt={t.screenshots.screens[i]}
                  className="w-full object-cover"
                  draggable={false}
                />
              </div>
              <p className="text-center text-xs text-secondary-foreground/60 mt-3 font-medium">{t.screenshots.screens[i]}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Testimonials = () => {
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-muted/40">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-accent mb-4 px-3 py-1 bg-accent/10 rounded-full">{t.testimonials.badge}</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">{t.testimonials.heading}</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t.testimonials.subheading}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {t.testimonials.items.map((item, i) => (
            <motion.div key={i} className="bg-card border border-border rounded-3xl p-7 flex flex-col gap-4"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} size={16} className="fill-accent text-accent" />
                ))}
              </div>
              <p className="text-foreground leading-relaxed">"{item.text}"</p>
              <div className="flex items-center gap-3 mt-auto pt-4 border-t border-border">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">{item.avatar}</div>
                <div>
                  <div className="font-semibold text-sm">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CoveragePricing = () => {
  const { t } = useLanguage();
  const { open } = useModal();
  const cities = [
    "Casablanca","Rabat","Tanger","Agadir","Fès","Marrakech",
    "Meknès","Oujda","Kenitra","Tétouan","Safi","El Jadida",
    "Beni Mellal","Nador","Settat","Khouribga","Laâyoune",
  ];
  const planColors = [
    "bg-primary/10 text-primary border-primary/20",
    "bg-accent/10 text-accent border-accent/20",
    "bg-muted text-foreground border-border",
  ];

  return (
    <section className="py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-accent mb-4 px-3 py-1 bg-accent/10 rounded-full">{t.coverage.badge}</span>
            <h2 className="font-display text-3xl font-bold mb-4">{t.coverage.heading}</h2>
            <p className="text-muted-foreground mb-8">{t.coverage.desc}</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {cities.map((c) => (
                <span key={c} className="px-3 py-1.5 bg-muted border border-border rounded-full text-sm font-medium text-foreground">{c}</span>
              ))}
              <span className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium text-primary">{t.coverage.routesLabel}</span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
              <MapPin className="text-primary shrink-0" size={20} />
              <p className="text-sm text-foreground">{t.coverage.addressHint}</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-accent mb-4 px-3 py-1 bg-accent/10 rounded-full">{t.pricing.badge}</span>
            <h2 className="font-display text-3xl font-bold mb-4">{t.pricing.heading}</h2>
            <p className="text-muted-foreground mb-8">{t.pricing.desc}</p>
            <div className="space-y-4 mb-8">
              {t.pricing.plans.map((p, i) => (
                <div key={i} className={`flex items-center justify-between p-5 rounded-2xl border ${planColors[i]}`}>
                  <div className="flex items-center gap-3">
                    <Truck size={20} />
                    <div>
                      <div className="font-bold">{p.label}</div>
                      <div className="text-xs opacity-70">{p.capacity}</div>
                    </div>
                  </div>
                  <span className="font-bold text-sm">{p.price}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4 text-center mb-6">
              {t.pricing.priorities.map((m, i) => (
                <div key={i} className="p-3 bg-muted rounded-2xl border border-border">
                  <div className="font-display font-bold text-lg text-primary">{m.multi}</div>
                  <div className="font-semibold text-sm">{m.label}</div>
                  <div className="text-xs text-muted-foreground">{m.note}</div>
                </div>
              ))}
            </div>
            <Button onClick={() => open("client")} className="w-full rounded-xl h-12 bg-primary hover:bg-primary/90 text-primary-foreground">
              {t.pricing.quoteBtn}
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Fleet = () => {
  const { t } = useLanguage();

  return (
    <section id="flotte" className="py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 lg:order-2">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">{t.fleet.heading}</h2>
            <p className="text-lg text-muted-foreground mb-8">{t.fleet.desc}</p>

            <div className="space-y-6">
              {t.fleet.vehicles.map((vehicle, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/50 transition-colors"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="mt-1">
                    <Truck className="text-primary w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h4 className="font-bold text-lg">{vehicle.name}</h4>
                      <span className="text-xs font-semibold px-2 py-1 bg-accent/20 text-accent-foreground rounded-full">{vehicle.time}</span>
                    </div>
                    <p className="text-muted-foreground text-sm">{vehicle.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            className="flex-1 lg:order-1 relative rounded-[2rem] overflow-hidden shadow-2xl"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="aspect-[4/5] md:aspect-[16/9] lg:aspect-[4/5]">
              <img src={import.meta.env.BASE_URL + 'fleet.png'} alt="Flotte de véhicules Fayage" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent flex flex-col justify-end p-8">
              <div className="flex items-center gap-2 text-primary font-bold text-lg mb-2">
                <ShieldCheck /> {t.fleet.verified}
              </div>
              <p className="text-foreground">{t.fleet.verifiedNote}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const FAQ = () => {
  const { t } = useLanguage();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section className="py-24 bg-muted/40">
      <div className="container mx-auto px-4 md:px-6 max-w-3xl">
        <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-accent mb-4 px-3 py-1 bg-accent/10 rounded-full">{t.faq.badge}</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">{t.faq.heading}</h2>
          <p className="text-muted-foreground text-lg">{t.faq.subheading}</p>
        </motion.div>

        <div className="space-y-3">
          {t.faq.items.map((f, i) => (
            <motion.div key={i} className="bg-card border border-border rounded-2xl overflow-hidden"
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <button
                className="w-full flex items-center justify-between px-6 py-5 text-start gap-4 hover:bg-muted/50 transition-colors"
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
              >
                <span className="font-semibold text-foreground">{f.q}</span>
                <ChevronRight size={18} className={`shrink-0 text-muted-foreground transition-transform duration-200 ${openIdx === i ? "rotate-90" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {openIdx === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-5 text-muted-foreground leading-relaxed">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Contact = () => {
  const { t } = useLanguage();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`${t.contact.emailSubject} — ${form.name}`);
    const body = encodeURIComponent(`${t.contact.emailNom}: ${form.name}\n${t.contact.emailEmail}: ${form.email}\n\n${form.message}`);
    window.open(`mailto:FAYAG.APP@GMAIL.COM?subject=${subject}&body=${body}`, "_blank");
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  const channelHrefs = [
    "mailto:FAYAG.APP@GMAIL.COM",
    "https://wa.me/212638563712",
    null,
  ];
  const channelIcons = [
    <MessageSquare size={20} className="text-primary" />,
    <Smartphone size={20} className="text-primary" />,
    <Globe size={20} className="text-primary" />,
  ];

  return (
    <section id="contact" className="py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start max-w-5xl mx-auto">

          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-accent mb-4 px-3 py-1 bg-accent/10 rounded-full">{t.contact.badge}</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">{t.contact.heading}</h2>
            <p className="text-muted-foreground text-lg mb-10">{t.contact.subheading}</p>

            <div className="space-y-5">
              {t.contact.channels.map((c, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-muted/50 border border-border rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">{channelIcons[i]}</div>
                  <div>
                    <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">{c.label}</div>
                    {channelHrefs[i]
                      ? <a href={channelHrefs[i]!} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary transition-colors">{c.value}</a>
                      : <span className="font-medium text-foreground">{c.value}</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
              <h3 className="font-display text-xl font-bold mb-6">{t.contact.formTitle}</h3>
              {sent ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <ShieldCheck size={32} className="text-primary" />
                  </div>
                  <p className="font-semibold text-lg">{t.contact.sentTitle}</p>
                  <p className="text-muted-foreground text-sm">{t.contact.sentDesc}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t.contact.formName}</label>
                    <input
                      type="text" required placeholder={t.contact.formNamePlaceholder}
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t.contact.formEmail}</label>
                    <input
                      type="email" required placeholder={t.contact.formEmailPlaceholder}
                      value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t.contact.formMessage}</label>
                    <textarea
                      required rows={5} placeholder={t.contact.formMessagePlaceholder}
                      value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition resize-none"
                    />
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                    {t.contact.formBtn} <ArrowRight size={16} className="ms-2" />
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const LocalTouch = () => {
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-primary text-primary-foreground overflow-hidden relative">
      <div className="absolute inset-0 bg-secondary/10"></div>
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <motion.div
            className="flex-1 max-w-xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white text-sm font-semibold mb-6 border border-white/20">
              <Globe size={16} /> {t.localtouch.badge}
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">
              {t.localtouch.heading}
            </h2>
            <p className="text-xl text-white/90 mb-8">{t.localtouch.desc}</p>

            <ul className="space-y-4">
              {t.localtouch.features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-white">
                  <Zap size={20} className="text-accent" />
                  <span className="font-medium">{f}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            className="flex-1 w-full"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="aspect-video lg:aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white/10">
              <img src={import.meta.env.BASE_URL + 'souk-delivery.png'} alt="Livraison dans un souk marocain" className="w-full h-full object-cover" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const CTA = () => {
  const { t } = useLanguage();

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-secondary z-0"></div>
      <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">{t.cta.heading}</h2>
          <p className="text-xl text-secondary-foreground/80 mb-12 max-w-2xl mx-auto">{t.cta.desc}</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="https://apps.apple.com/app/fayage" className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black px-8 py-4 rounded-full font-bold text-lg transition-colors shadow-lg">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.8 3.59-.8 1.54 0 2.81.65 3.65 1.7-3.03 1.88-2.5 5.96.44 7.23-.74 1.83-1.68 3.2-2.76 4.04zm-4.71-13.8c-.28-1.74 1.25-3.32 3.01-3.48.33 1.83-1.39 3.44-3.01 3.48z"/>
              </svg>
              App Store
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.fayage.app" className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black px-8 py-4 rounded-full font-bold text-lg transition-colors shadow-lg">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.609 1.814L13.792 12 3.61 22.186C3.21 21.848 3 21.365 3 20.81V3.19c0-.554.21-1.037.609-1.376zM14.654 11.137l5.242-2.996c.797-.456.797-1.196 0-1.652L4.793 1.226l9.861 9.911zm0 1.726l-9.861 9.911 15.103-8.634c.797-.456.797-1.196 0-1.652l-5.242-2.996zM22.062 12c0 .356-.16.711-.475 1.01l-1.328.759-5.111-5.111 5.111-5.111 1.328.759c.315.299.475.654.475 1.01z"/>
              </svg>
              Play Store
            </a>
          </div>

          <p className="mt-8 text-secondary-foreground/60 text-sm">{t.cta.footer}</p>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-background pt-16 pb-8 border-t border-border">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <img src={import.meta.env.BASE_URL + 'icon.png'} className="w-8 h-8 rounded-lg object-cover" alt="Fayage" />
              <span className="font-display font-bold text-2xl tracking-tight text-foreground">Fayage</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">{t.footer.tagline}</p>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-foreground">{t.footer.platform}</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {t.footer.platformLinks.map((l, i) => (
                <li key={i}><a href="#" className="hover:text-primary transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-foreground">{t.footer.company}</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {t.footer.companyLinks.map((l, i) => (
                <li key={i}><a href="#" className="hover:text-primary transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-foreground">{t.footer.legal}</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="/fayage-website/conditions" className="hover:text-primary transition-colors">{t.footer.legalLinks[0]}</a></li>
              <li><a href="/fayage-website/confidentialite" className="hover:text-primary transition-colors">{t.footer.legalLinks[1]}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t.footer.legalLinks[2]}</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Fayage. {t.footer.rights}
          </p>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd"></path></svg>
            </div>
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd"></path></svg>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default function Home() {
  const [modalRole, setModalRole] = useState<ModalRole>(null);

  return (
    <ModalContext.Provider value={{ open: (r) => setModalRole(r) }}>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <Hero />
          <ValueProps />
          <Steps />
          <Features />
          <AppScreenshots />
          <Testimonials />
          <CoveragePricing />
          <Fleet />
          <FAQ />
          <Contact />
          <LocalTouch />
          <CTA />
        </main>
        <Footer />
        <DownloadModal role={modalRole} onClose={() => setModalRole(null)} />

        {/* WhatsApp floating button */}
        <a
          href="https://wa.me/212638563712?text=Bonjour%20Fayage%2C%20j%27aimerais%20en%20savoir%20plus%20sur%20vos%20services."
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contacter Fayage sur WhatsApp"
          className="fixed bottom-6 end-6 z-[100] flex items-center gap-3 group"
        >
          <motion.span
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 2, duration: 0.4 }}
            className="hidden sm:block bg-white text-gray-800 text-sm font-semibold px-4 py-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border border-gray-100"
          >
            Discuter sur WhatsApp
          </motion.span>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center"
            style={{ backgroundColor: "#25D366" }}
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </motion.div>
        </a>
      </div>
    </ModalContext.Provider>
  );
}
