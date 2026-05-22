import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Confidentialite() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 md:px-6 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Retour</span>
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <img src={import.meta.env.BASE_URL + 'icon.png'} className="w-6 h-6 rounded object-cover" alt="Fayage" />
            <span className="font-display font-bold text-lg">Fayage</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-12 max-w-3xl">
        <h1 className="font-display text-4xl font-bold mb-2">Politique de confidentialité</h1>
        <p className="text-muted-foreground text-sm mb-10">Dernière mise à jour : janvier 2025</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="font-display text-2xl font-bold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Fayage s'engage à protéger la vie privée de ses utilisateurs. La présente politique décrit comment nous collectons, utilisons, stockons et protégeons vos données personnelles conformément à la loi marocaine n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-3">2. Données collectées</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Nous collectons les données suivantes :</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Données d'identité :</strong> nom, prénom, numéro de téléphone, adresse e-mail.</li>
              <li><strong className="text-foreground">Données de localisation :</strong> position GPS en temps réel lors de l'utilisation de l'application (uniquement pendant une course active).</li>
              <li><strong className="text-foreground">Données de transport :</strong> historique des demandes, itinéraires, photos de livraison.</li>
              <li><strong className="text-foreground">Données des chauffeurs :</strong> permis de conduire, documents du véhicule, photos de profil.</li>
              <li><strong className="text-foreground">Données de paiement :</strong> informations de transaction (nous ne stockons pas les données bancaires complètes).</li>
              <li><strong className="text-foreground">Données techniques :</strong> type d'appareil, version de l'OS, identifiant unique de l'appareil, journaux d'activité.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-3">3. Utilisation des données</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Vos données sont utilisées pour :</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Fournir et améliorer nos services de mise en relation transport.</li>
              <li>Calculer les tarifs et traiter les paiements.</li>
              <li>Assurer la sécurité des utilisateurs et prévenir les fraudes.</li>
              <li>Vous envoyer des notifications liées à vos courses (confirmations, statuts, alertes).</li>
              <li>Résoudre les litiges et assister le support client.</li>
              <li>Respecter nos obligations légales et réglementaires.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-3">4. Partage des données</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Nous partageons vos données uniquement dans les cas suivants :</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Entre clients et chauffeurs :</strong> les informations nécessaires à la réalisation d'une course (nom, téléphone, localisation) sont partagées entre les parties concernées.</li>
              <li><strong className="text-foreground">Prestataires de services :</strong> hébergement (Railway, Supabase), paiement, cartographie (Google Maps).</li>
              <li><strong className="text-foreground">Autorités compétentes :</strong> sur demande légale ou judiciaire uniquement.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Nous ne vendons jamais vos données personnelles à des tiers à des fins commerciales.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-3">5. Localisation</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'application utilise votre position GPS pour calculer les itinéraires, estimer les prix et suivre les livraisons en temps réel. La collecte de localisation n'est active que lorsque vous utilisez activement l'application. Vous pouvez désactiver la localisation depuis les paramètres de votre appareil, mais cela limitera les fonctionnalités principales de l'app.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-3">6. Notifications push</h2>
            <p className="text-muted-foreground leading-relaxed">
              Fayage envoie des notifications push pour vous informer de l'état de vos courses, des offres de chauffeurs, et des rappels avant les livraisons planifiées. Vous pouvez gérer vos préférences de notifications dans les paramètres de l'application ou de votre appareil.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-3">7. Conservation des données</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vos données sont conservées le temps nécessaire à la fourniture du service et au respect de nos obligations légales. Les données de compte inactif depuis plus de 3 ans peuvent être supprimées. Les données de transaction sont conservées 10 ans conformément à la réglementation fiscale marocaine.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-3">8. Vos droits</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Conformément à la loi 09-08, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Droit d'accès :</strong> obtenir une copie de vos données personnelles.</li>
              <li><strong className="text-foreground">Droit de rectification :</strong> corriger des données inexactes.</li>
              <li><strong className="text-foreground">Droit à l'effacement :</strong> demander la suppression de votre compte et de vos données.</li>
              <li><strong className="text-foreground">Droit d'opposition :</strong> vous opposer à certains traitements de vos données.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Pour exercer ces droits, contactez-nous à : <a href="mailto:privacy@fayage.ma" className="text-primary hover:underline">privacy@fayage.ma</a>
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-3">9. Sécurité</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, altération, divulgation ou destruction. Les communications entre l'application et nos serveurs sont chiffrées via HTTPS/TLS.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-3">10. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question relative à cette politique de confidentialité :<br />
              Email : <a href="mailto:privacy@fayage.ma" className="text-primary hover:underline">privacy@fayage.ma</a><br />
              Fayage — Maroc
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-border mt-16 py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Fayage. Tous droits réservés.</p>
        <div className="flex justify-center gap-6 mt-3">
          <a href="/fayage-website/conditions" className="hover:text-primary transition-colors">Conditions d'utilisation</a>
          <a href="/fayage-website/confidentialite" className="hover:text-primary transition-colors">Politique de confidentialité</a>
        </div>
      </footer>
    </div>
  );
}
