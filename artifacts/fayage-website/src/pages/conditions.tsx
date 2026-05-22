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
        <h1 className="font-display text-4xl font-bold mb-2">Conditions d'utilisation – FAYAGE</h1>
        <p className="text-muted-foreground text-sm mb-10">Dernière mise à jour : 07/05/2026</p>

        <p className="text-muted-foreground leading-relaxed mb-10">
          Bienvenue sur FAYAGE, une plateforme qui met en relation des Clients et des Conducteurs pour des services de transport, de livraison et de logistique au Maroc.<br /><br />
          En téléchargeant l'application ou en créant un compte FAYAGE, vous reconnaissez avoir lu, compris et accepté sans réserve les présentes Conditions Générales d'Utilisation (CGU). Si vous n'acceptez pas ces conditions, vous ne pouvez pas utiliser le service.
        </p>

        <div className="space-y-10 text-foreground">

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">1. Définitions</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">FAYAGE</strong> : la plateforme numérique (application mobile et services associés) exploitée par ses responsables.</li>
              <li><strong className="text-foreground">Client</strong> : tout utilisateur qui passe une commande de transport, de livraison ou de logistique via la plateforme.</li>
              <li><strong className="text-foreground">Conducteur</strong> : tout utilisateur inscrit comme prestataire de service (chauffeur, livreur) fournissant des prestations via la plateforme.</li>
              <li><strong className="text-foreground">Utilisateur</strong> : désigne indifféremment un Client ou un Conducteur.</li>
              <li><strong className="text-foreground">Mission</strong> : une prestation de service de transport ou de livraison acceptée et réalisée via FAYAGE.</li>
              <li><strong className="text-foreground">Commission</strong> : la part prélevée par FAYAGE sur le montant de chaque Mission réalisée.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">2. Accès au service</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Pour utiliser FAYAGE, vous devez :</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Être âgé(e) d'au moins 18 ans</li>
              <li>Fournir des informations exactes, complètes et à jour lors de l'inscription</li>
              <li>Disposer d'un compte actif et en règle</li>
              <li>Pour les Conducteurs : posséder un permis de conduire valide, un véhicule en règle (assurance, carte grise) et une Carte Nationale d'Identité valide</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              L'accès à la plateforme est personnel et non cessible. Vous ne pouvez pas partager votre compte ni laisser un tiers l'utiliser en votre nom. FAYAGE se réserve le droit de refuser ou de suspendre l'accès à tout compte ne respectant pas ces conditions.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">3. Inscription et compte utilisateur</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Lors de la création de votre compte, vous vous engagez à :</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Fournir des informations véridiques et exactes (nom, numéro de téléphone, e-mail, documents d'identité)</li>
              <li>Mettre à jour vos informations en cas de changement</li>
              <li>Garder votre mot de passe confidentiel et sécurisé</li>
              <li>Notifier immédiatement FAYAGE en cas d'accès non autorisé à votre compte</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">Vous êtes responsable de toutes les actions effectuées depuis votre compte.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">4. Utilisation de la plateforme</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Vous vous engagez à utiliser FAYAGE de manière légale, loyale et respectueuse. Il est strictement interdit de :</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Fournir de faux documents (CIN, permis de conduire, carte grise, assurance…)</li>
              <li>Créer plusieurs comptes ou usurper l'identité d'un tiers</li>
              <li>Tenter de contourner, manipuler ou frauder le système de paiement ou de notation</li>
              <li>Utiliser la plateforme à des fins illégales, discriminatoires ou contraires à l'ordre public</li>
              <li>Harceler, menacer ou insulter d'autres utilisateurs</li>
              <li>Publier des contenus offensants, mensongers ou portant atteinte à des tiers</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">Tout manquement à ces règles peut entraîner la suspension immédiate du compte, sans préavis ni indemnité.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">5. Vérification d'identité (Conducteurs)</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Pour garantir la sécurité de tous les utilisateurs :</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>FAYAGE peut exiger la fourniture de documents officiels (CIN, permis de conduire, carte grise, assurance véhicule, photo de profil)</li>
              <li>Une vérification automatisée par intelligence artificielle peut être utilisée pour analyser l'authenticité des documents</li>
              <li>Toute décision de refus basée sur ce traitement automatisé peut faire l'objet d'une révision humaine sur simple demande écrite à <a href="mailto:FAYAG.APP@GMAIL.COM" className="text-primary hover:underline">FAYAG.APP@GMAIL.COM</a></li>
              <li>FAYAGE peut suspendre ou refuser un compte en cas de documents frauduleux, périmés ou incomplets</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">Les Conducteurs s'engagent à maintenir leurs documents à jour pendant toute la durée de leur utilisation de la plateforme.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">6. Rôle de FAYAGE et responsabilités</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              FAYAGE agit exclusivement en tant qu'intermédiaire technique facilitant la mise en relation entre Clients et Conducteurs. FAYAGE n'est pas partie prenante du contrat de transport conclu entre le Client et le Conducteur.
            </p>
            <p className="text-muted-foreground font-semibold mb-2">Responsabilités du Conducteur :</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li>Exécuter la Mission dans les délais et conditions convenus</li>
              <li>Se présenter à l'heure et à l'adresse indiquée</li>
              <li>Prendre soin des colis et marchandises confiés</li>
              <li>Respecter le Code de la route et les réglementations en vigueur</li>
              <li>Signaler tout incident ou problème à FAYAGE sans délai</li>
            </ul>
            <p className="text-muted-foreground font-semibold mb-2">Responsabilités du Client :</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li>Fournir des informations exactes (adresses, nature du colis, poids, dimensions)</li>
              <li>S'assurer que le contenu de la commande est légal et conforme</li>
              <li>Être disponible pour réceptionner la livraison</li>
              <li>Payer le montant convenu pour la Mission</li>
            </ul>
            <p className="text-muted-foreground font-semibold mb-2">FAYAGE ne garantit pas :</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>La disponibilité permanente et ininterrompue du service</li>
              <li>La disponibilité d'un Conducteur à tout moment</li>
              <li>L'absence d'erreurs techniques ou d'interruptions temporaires</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">7. Paiements et commissions</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Les paiements pour les Missions sont effectués via les mécanismes sécurisés de la plateforme.</li>
              <li>FAYAGE prélève une commission sur chaque Mission réalisée. Le taux de commission est indiqué dans l'application et peut évoluer avec un préavis de 15 jours.</li>
              <li>Les Conducteurs peuvent demander le retrait de leurs gains via les moyens disponibles dans l'application (ex : Wafacash, CashPlus, virement bancaire).</li>
              <li>Les demandes de retrait sont traitées dans les délais indiqués dans l'application.</li>
              <li>FAYAGE peut suspendre ou retarder un paiement en cas de suspicion de fraude, de litige en cours ou de violation des présentes CGU.</li>
              <li>Les prix affichés dans l'application sont susceptibles de varier selon la distance, le type de véhicule, la période et la demande.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">8. Annulation de commande</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Les conditions d'annulation applicables à chaque Mission sont précisées dans l'application au moment de la commande.</li>
              <li>Une annulation tardive (après acceptation par un Conducteur) peut entraîner des frais d'annulation.</li>
              <li>Les Conducteurs qui annulent de façon répétée ou abusive peuvent faire l'objet de mesures disciplinaires (avertissement, suspension, résiliation).</li>
              <li>En cas d'annulation par FAYAGE pour des raisons techniques ou d'indisponibilité, aucun frais ne sera facturé au Client.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">9. Litiges entre utilisateurs</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">En cas de litige entre un Client et un Conducteur :</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Les parties doivent d'abord tenter de résoudre le différend à l'amiable.</li>
              <li>Si aucune solution n'est trouvée, l'une ou l'autre des parties peut contacter FAYAGE à <a href="mailto:FAYAG.APP@GMAIL.COM" className="text-primary hover:underline">FAYAG.APP@GMAIL.COM</a> pour une médiation.</li>
              <li>FAYAGE peut intervenir en tant que médiateur neutre mais n'est pas tenu de trancher le litige.</li>
              <li>FAYAGE se réserve le droit de rembourser, compenser ou sanctionner l'une des parties selon les éléments disponibles.</li>
              <li>Les décisions prises par FAYAGE dans le cadre d'une médiation ne constituent pas une reconnaissance de responsabilité juridique.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">10. Suspension et résiliation du compte</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">FAYAGE peut suspendre ou résilier un compte à tout moment, avec ou sans préavis, en cas de :</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Violation des présentes CGU</li>
              <li>Fourniture d'informations ou de documents frauduleux</li>
              <li>Comportement abusif, frauduleux ou dangereux</li>
              <li>Inactivité prolongée</li>
              <li>Demande des autorités compétentes</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Un utilisateur suspendu peut contacter FAYAGE à <a href="mailto:FAYAG.APP@GMAIL.COM" className="text-primary hover:underline">FAYAG.APP@GMAIL.COM</a> pour contester la décision.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">11. Propriété intellectuelle</h2>
            <p className="text-muted-foreground leading-relaxed">
              L'application FAYAGE, son logo, son design, ses textes et ses fonctionnalités sont la propriété exclusive de FAYAGE et sont protégés par les lois applicables en matière de propriété intellectuelle. Toute reproduction, modification ou exploitation non autorisée est strictement interdite.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">12. Modification des CGU</h2>
            <p className="text-muted-foreground leading-relaxed">
              FAYAGE se réserve le droit de modifier les présentes CGU à tout moment. Les modifications entrent en vigueur dès leur publication dans l'application. En cas de modification substantielle, les utilisateurs seront informés au moins 15 jours à l'avance. La poursuite de l'utilisation du service après notification vaut acceptation des nouvelles CGU.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">13. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question relative aux présentes CGU :<br />
              📧 Email : <a href="mailto:FAYAG.APP@GMAIL.COM" className="text-primary hover:underline">FAYAG.APP@GMAIL.COM</a><br />
              📞 Téléphone : 0638563712
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
