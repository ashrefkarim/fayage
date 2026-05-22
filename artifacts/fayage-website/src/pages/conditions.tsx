import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Conditions() {
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
        <h1 className="font-display text-4xl font-bold mb-2">Conditions d'utilisation</h1>
        <p className="text-muted-foreground text-sm mb-10">Dernière mise à jour : janvier 2025</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="font-display text-2xl font-bold mb-3">1. Présentation de Fayage</h2>
            <p className="text-muted-foreground leading-relaxed">
              Fayage est une plateforme de mise en relation entre des expéditeurs (clients) et des transporteurs professionnels (chauffeurs) au Maroc. La plateforme permet de publier des demandes de transport, de recevoir des offres de chauffeurs, et de suivre les livraisons en temps réel.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-3">2. Acceptation des conditions</h2>
            <p className="text-muted-foreground leading-relaxed">
              En téléchargeant ou en utilisant l'application Fayage, vous acceptez d'être lié par les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre application.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-3">3. Comptes utilisateurs</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Pour utiliser Fayage, vous devez créer un compte. Vous êtes responsable de :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Fournir des informations exactes et à jour lors de l'inscription.</li>
              <li>Maintenir la confidentialité de vos identifiants de connexion.</li>
              <li>Toute activité effectuée sous votre compte.</li>
              <li>Nous notifier immédiatement de tout accès non autorisé à votre compte.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-3">4. Conditions spécifiques aux chauffeurs</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Pour s'inscrire en tant que chauffeur sur Fayage, vous devez :
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Être titulaire d'un permis de conduire valide et adapté au type de véhicule utilisé.</li>
              <li>Posséder un véhicule de transport en règle (assurance, visite technique à jour).</li>
              <li>Disposer d'une carte professionnelle de transporteur ou d'une autorisation équivalente.</li>
              <li>Accepter les vérifications d'identité et de documents effectuées par Fayage.</li>
              <li>Respecter la réglementation marocaine en matière de transport routier.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-3">5. Utilisation de la plateforme</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Il est strictement interdit de :</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Utiliser la plateforme à des fins illégales ou frauduleuses.</li>
              <li>Transporter des marchandises prohibées, dangereuses ou illicites.</li>
              <li>Harceler, menacer ou nuire à d'autres utilisateurs.</li>
              <li>Contourner le système de paiement de la plateforme.</li>
              <li>Reproduire ou exploiter commercialement la plateforme sans autorisation.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-3">6. Tarification et paiements</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les prix sont calculés automatiquement par l'application selon la distance, le type de véhicule, la priorité choisie (Standard, Urgent, Express) et les options supplémentaires. Fayage prélève une commission sur chaque transaction. Les paiements sont traités de manière sécurisée via les prestataires intégrés à l'application.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-3">7. Responsabilités et limitations</h2>
            <p className="text-muted-foreground leading-relaxed">
              Fayage agit en tant qu'intermédiaire et ne peut être tenu responsable des dommages survenus lors du transport, des retards indépendants de notre volonté, ou des actes des utilisateurs. Les chauffeurs sont des prestataires indépendants et non des employés de Fayage.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-3">8. Annulations et remboursements</h2>
            <p className="text-muted-foreground leading-relaxed">
              Les annulations doivent être effectuées avant le départ du chauffeur. Des frais d'annulation peuvent s'appliquer selon les conditions définies dans l'application au moment de la réservation. Les remboursements sont traités sous 5 à 10 jours ouvrables.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-3">9. Modifications des conditions</h2>
            <p className="text-muted-foreground leading-relaxed">
              Fayage se réserve le droit de modifier ces conditions à tout moment. Les modifications prennent effet dès leur publication. Votre utilisation continue de l'application après modification vaut acceptation des nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-3">10. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question relative aux présentes conditions, vous pouvez nous contacter à l'adresse : <a href="mailto:support@fayage.ma" className="text-primary hover:underline">support@fayage.ma</a>
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
