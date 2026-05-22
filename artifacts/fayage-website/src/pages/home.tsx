import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import { 
  Package, 
  MapPin, 
  Clock, 
  MessageSquare, 
  Truck, 
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
  Smartphone,
  Globe,
  Star,
  Zap,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
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

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 font-medium text-sm">
          <a href="#clients" className="text-foreground/80 hover:text-primary transition-colors">Pour les clients</a>
          <a href="#chauffeurs" className="text-foreground/80 hover:text-primary transition-colors">Pour les chauffeurs</a>
          <a href="#comment-ca-marche" className="text-foreground/80 hover:text-primary transition-colors">Comment ça marche</a>
          <a href="#flotte" className="text-foreground/80 hover:text-primary transition-colors">Notre flotte</a>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Button className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25">
            Télécharger l'App
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden p-2 text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-xl p-4 flex flex-col gap-4">
          <a href="#clients" className="block py-2 text-foreground/80 font-medium" onClick={() => setMobileMenuOpen(false)}>Pour les clients</a>
          <a href="#chauffeurs" className="block py-2 text-foreground/80 font-medium" onClick={() => setMobileMenuOpen(false)}>Pour les chauffeurs</a>
          <a href="#comment-ca-marche" className="block py-2 text-foreground/80 font-medium" onClick={() => setMobileMenuOpen(false)}>Comment ça marche</a>
          <a href="#flotte" className="block py-2 text-foreground/80 font-medium" onClick={() => setMobileMenuOpen(false)}>Notre flotte</a>
          <div className="h-px bg-border w-full my-2"></div>
          <Button className="w-full justify-center bg-primary">Télécharger l'App</Button>
        </div>
      )}
    </header>
  );
};

const Hero = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          <motion.div 
            className="flex-1 text-center lg:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 border border-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Disponible partout au Maroc
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
              La logistique qui <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">bouge avec vous.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0">
              Fayage connecte les entreprises et particuliers aux meilleurs chauffeurs. 
              Rapide, fiable et pensé pour la réalité du terrain marocain.
              <span className="block mt-2 text-sm opacity-80">Disponible en Français et Arabe (العربية).</span>
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Button size="lg" className="w-full sm:w-auto rounded-full bg-secondary hover:bg-secondary/90 text-secondary-foreground h-14 px-8 text-base">
                Envoyer un colis
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full border-border hover:bg-muted h-14 px-8 text-base group">
                Devenir chauffeur
                <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>

          <motion.div 
            className="flex-1 relative w-full max-w-lg lg:max-w-none"
            style={{ y: y1, opacity }}
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
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statut</div>
                    <div className="font-bold text-foreground">En route vers Casablanca</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Arrivée</div>
                    <div className="font-bold text-primary">14:30</div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const ValueProps = () => {
  return (
    <section className="py-24 bg-muted/50 border-y border-border">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Une plateforme, deux missions</h2>
          <p className="text-lg text-muted-foreground">
            Que vous ayez besoin de faire livrer une marchandise ou que vous cherchiez à générer des revenus, Fayage simplifie tout.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Client Card */}
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
            
            <h3 className="font-display text-2xl font-bold mb-4">Pour les expéditeurs</h3>
            <p className="text-muted-foreground mb-8">
              De la petite enveloppe à la palette complète, trouvez le véhicule idéal et suivez votre marchandise en temps réel.
            </p>
            
            <ul className="space-y-4 mb-8">
              {[
                "Création de demande en quelques secondes",
                "Suivi GPS en temps réel",
                "Choix du type de véhicule adapté",
                "Tarifs transparents et compétitifs"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
            
            <img 
              src={import.meta.env.BASE_URL + 'client.png'} 
              alt="Client Fayage" 
              className="w-full h-48 object-cover rounded-xl mb-6 shadow-sm"
            />
            
            <Button variant="outline" className="w-full rounded-xl h-12 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
              Créer une expédition
            </Button>
          </motion.div>

          {/* Driver Card */}
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
            
            <h3 className="font-display text-2xl font-bold mb-4 text-white">Pour les chauffeurs</h3>
            <p className="text-secondary-foreground/80 mb-8">
              Rentabilisez votre véhicule. Acceptez des courses quand vous voulez, où vous voulez, et développez votre activité.
            </p>
            
            <ul className="space-y-4 mb-8 text-white">
              {[
                "Acceptez des courses proches de vous",
                "Travaillez selon votre propre planning",
                "Paiements rapides et sécurisés",
                "Utilisez le véhicule que vous possédez"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-accent"></div>
                  </div>
                  <span className="font-medium text-secondary-foreground/90">{item}</span>
                </li>
              ))}
            </ul>
            
            <img 
              src={import.meta.env.BASE_URL + 'driver.png'} 
              alt="Chauffeur Fayage" 
              className="w-full h-48 object-cover rounded-xl mb-6 shadow-sm opacity-90"
            />
            
            <Button className="w-full rounded-xl h-12 bg-accent hover:bg-accent/90 text-accent-foreground border-none transition-colors">
              Rejoindre la flotte
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Steps = () => {
  const steps = [
    {
      num: "01",
      title: "Commandez",
      desc: "Saisissez l'adresse de départ, d'arrivée et les détails du colis sur l'application."
    },
    {
      num: "02",
      title: "Validez",
      desc: "Un chauffeur à proximité accepte votre course. Vous connaissez le prix à l'avance."
    },
    {
      num: "03",
      title: "Suivez",
      desc: "Suivez le trajet en temps réel sur la carte et communiquez avec le chauffeur."
    },
    {
      num: "04",
      title: "Livré",
      desc: "Le destinataire reçoit son colis. Confirmation immédiate sur votre téléphone."
    }
  ];

  return (
    <section id="comment-ca-marche" className="py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">La logistique simplifiée</h2>
          <p className="text-lg text-muted-foreground">
            L'expédition de colis ne devrait pas être un casse-tête. En quelques clics, c're parti.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div 
              key={i}
              className="relative text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-border -z-10">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 border-t-2 border-r-2 border-border w-3 h-3 rotate-45"></div>
                </div>
              )}
              <div className="w-24 h-24 rounded-3xl bg-card border border-border shadow-sm flex items-center justify-center mx-auto mb-6 text-2xl font-bold font-display text-primary z-10 relative">
                {step.num}
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
  const features = [
    {
      icon: <Clock size={28} />,
      title: "Immédiat ou programmé",
      desc: "Demandez un véhicule pour tout de suite ou planifiez vos expéditions pour la semaine prochaine."
    },
    {
      icon: <MapPin size={28} />,
      title: "Suivi millimétré",
      desc: "Gardez un œil sur votre marchandise avec notre carte interactive en temps réel."
    },
    {
      icon: <MessageSquare size={28} />,
      title: "Communication fluide",
      desc: "Une messagerie intégrée permet de discuter directement avec le chauffeur sans échanger vos numéros."
    },
    {
      icon: <ShieldCheck size={28} />,
      title: "Fiabilité prouvée",
      desc: "Tous nos chauffeurs sont vérifiés et les marchandises sont prises en charge avec le plus grand soin."
    }
  ];

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
                src={import.meta.env.BASE_URL + 'app-mockup.png'} 
                alt="Interface de l'application Fayage" 
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            </motion.div>
          </div>

          <div className="flex-1 w-full">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">La technologie au service du mouvement</h2>
            <p className="text-lg text-muted-foreground mb-12">
              L'application Fayage a été conçue pour être la plus intuitive possible. Pas de menus compliqués, juste l'essentiel pour faire avancer les choses.
            </p>

            <div className="grid sm:grid-cols-2 gap-8">
              {features.map((feat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    {feat.icon}
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

const Fleet = () => {
  return (
    <section id="flotte" className="py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 lg:order-2">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">Une flotte pour chaque besoin</h2>
            <p className="text-lg text-muted-foreground mb-8">
              De la lettre urgente à la palette de marchandises, choisissez le véhicule adapté à votre chargement. Payez le prix juste selon vos besoins.
            </p>
            
            <div className="space-y-6">
              {[
                { name: "Fourgon", desc: "Idéal pour les envois palettisés, petits déménagements et livraisons entreprises.", time: "1 – 3 tonnes" },
                { name: "Camion 7 – 19 tonnes", desc: "Pour les chargements industriels, équipements lourds et marchandises en gros.", time: "7 – 19 tonnes" },
                { name: "Semi-remorque / Train routier", desc: "Transport longue distance et chargements complets sur toute l'étendue du Maroc.", time: "24 – 40 tonnes" },
                { name: "Benne & Citerne", desc: "Sable, gravier, liquides et matériaux vrac — spécialisé selon votre besoin.", time: "Vrac & liquides" },
              ].map((vehicle, i) => (
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
                    <div className="flex items-center gap-3 mb-1">
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
                <ShieldCheck /> Flotte vérifiée
              </div>
              <p className="text-foreground">Tous nos chauffeurs sont rigoureusement sélectionnés.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const LocalTouch = () => {
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
              <Globe size={16} /> 100% Marocain
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">
              Pensé pour la réalité de nos villes.
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Fayage n'est pas une simple copie d'une application étrangère. Nous l'avons conçue pour répondre aux défis logistiques réels des villes marocaines.
            </p>
            
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-white">
                <Zap size={20} className="text-accent" />
                <span className="font-medium">Application disponible en Français et Arabe (العربية)</span>
              </li>
              <li className="flex items-center gap-3 text-white">
                <Zap size={20} className="text-accent" />
                <span className="font-medium">Adapté au trafic et aux adresses complexes</span>
              </li>
              <li className="flex items-center gap-3 text-white">
                <Zap size={20} className="text-accent" />
                <span className="font-medium">Support client local et réactif</span>
              </li>
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
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-secondary z-0"></div>
      
      {/* Decorative background grid */}
      <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
            Prêt à prendre la route ?
          </h2>
          <p className="text-xl text-secondary-foreground/80 mb-12 max-w-2xl mx-auto">
            Téléchargez l'application Fayage dès aujourd'hui. Disponible gratuitement sur iOS et Android pour les clients et les chauffeurs.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#" className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black px-8 py-4 rounded-full font-bold text-lg transition-colors shadow-lg">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.8 3.59-.8 1.54 0 2.81.65 3.65 1.7-3.03 1.88-2.5 5.96.44 7.23-.74 1.83-1.68 3.2-2.76 4.04zm-4.71-13.8c-.28-1.74 1.25-3.32 3.01-3.48.33 1.83-1.39 3.44-3.01 3.48z"/>
              </svg>
              App Store
            </a>
            <a href="#" className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black px-8 py-4 rounded-full font-bold text-lg transition-colors shadow-lg">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.609 1.814L13.792 12 3.61 22.186C3.21 21.848 3 21.365 3 20.81V3.19c0-.554.21-1.037.609-1.376zM14.654 11.137l5.242-2.996c.797-.456.797-1.196 0-1.652L4.793 1.226l9.861 9.911zm0 1.726l-9.861 9.911 15.103-8.634c.797-.456.797-1.196 0-1.652l-5.242-2.996zM22.062 12c0 .356-.16.711-.475 1.01l-1.328.759-5.111-5.111 5.111-5.111 1.328.759c.315.299.475.654.475 1.01z"/>
              </svg>
              Play Store
            </a>
          </div>
          
          <p className="mt-8 text-secondary-foreground/60 text-sm">
            L'application est disponible en Français et Arabe.
          </p>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-background pt-16 pb-8 border-t border-border">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <img src={import.meta.env.BASE_URL + 'icon.png'} className="w-8 h-8 rounded-lg object-cover" alt="Fayage" />
              <span className="font-display font-bold text-2xl tracking-tight text-foreground">Fayage</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">
              La plateforme logistique marocaine qui connecte expéditeurs et chauffeurs en temps réel. Rapide, fiable, partout au Maroc.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold mb-4 text-foreground">Plateforme</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Pour les clients</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Pour les chauffeurs</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Tarifs</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Villes desservies</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4 text-foreground">Entreprise</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">À propos</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Carrières</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4 text-foreground">Légal</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="/fayage-website/conditions" className="hover:text-primary transition-colors">Conditions d'utilisation</a></li>
              <li><a href="/fayage-website/confidentialite" className="hover:text-primary transition-colors">Politique de confidentialité</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Mentions légales</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Fayage. Tous droits réservés.
          </p>
          <div className="flex gap-4">
            {/* Social placeholders */}
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd"></path></svg>
            </div>
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd"></path></svg>
            </div>
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path></svg>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <ValueProps />
        <Steps />
        <Features />
        <Fleet />
        <LocalTouch />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
