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
        <h1 className="font-display text-4xl font-bold mb-2">Politique de confidentialité – FAYAGE</h1>
        <p className="text-muted-foreground text-sm mb-10">Dernière mise à jour : 07/05/2026</p>

        <p className="text-muted-foreground leading-relaxed mb-6">
          Bienvenue sur FAYAGE, une plateforme de services logistiques, de transport et de livraison reliant clients et conducteurs au Maroc.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-10">
          La protection de vos données personnelles est une priorité absolue. Cette politique explique clairement comment nous collectons, utilisons, partageons et protégeons vos informations, conformément à la <strong className="text-foreground">Loi n° 09-08</strong> relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel (Maroc).<br /><br />
          Les utilisateurs qui demandent des services sont appelés « <strong className="text-foreground">Clients</strong> ». Les utilisateurs qui fournissent les services de transport et de livraison sont appelés « <strong className="text-foreground">Conducteurs</strong> ». Ensemble, ils sont désignés par « <strong className="text-foreground">Utilisateurs</strong> ».<br /><br />
          FAYAGE est le responsable du traitement des données personnelles.
        </p>

        <div className="space-y-10 text-foreground">

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">1. Données collectées</h2>
            <p className="text-muted-foreground font-semibold mb-2">a. Données que vous fournissez directement</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
              <li>Nom et prénom</li>
              <li>Numéro de téléphone</li>
              <li>Adresse e-mail</li>
              <li>Adresses de collecte et de livraison</li>
              <li>Informations de paiement</li>
              <li>Détails des commandes (type, poids, contenu déclaré)</li>
              <li>Documents d'identité (CIN, permis de conduire) — Conducteurs uniquement</li>
              <li>Informations véhicule (immatriculation, type) — Conducteurs uniquement</li>
              <li>Photo de profil (facultatif)</li>
            </ul>
            <p className="text-muted-foreground font-semibold mb-2">b. Données collectées automatiquement</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-4">
              <li>Données de localisation GPS (en temps réel, uniquement pendant les trajets actifs)</li>
              <li>Adresse IP et type d'appareil (iOS / Android)</li>
              <li>Identifiants uniques de l'appareil (device ID)</li>
              <li>Activité dans l'application (écrans consultés, actions effectuées)</li>
              <li>Horodatage et historique des transactions</li>
            </ul>
            <p className="text-muted-foreground font-semibold mb-2">c. Vérification d'identité (traitement automatisé — IA)</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>Les documents d'identité des Conducteurs (CIN, permis de conduire) peuvent être analysés par des technologies d'intelligence artificielle pour vérifier leur authenticité.</li>
              <li>Ces données sont utilisées exclusivement à des fins de vérification.</li>
              <li>Aucune décision définitive n'est prise sur la seule base d'un traitement automatisé. Toute décision de refus ou de suspension peut faire l'objet d'une révision humaine sur simple demande à <a href="mailto:FAYAG.APP@GMAIL.COM" className="text-primary hover:underline">FAYAG.APP@GMAIL.COM</a>.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">2. Finalités du traitement</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Vos données sont traitées pour :</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
              <li>Fournir les services de transport et de livraison</li>
              <li>Mettre en relation Clients et Conducteurs</li>
              <li>Gérer les paiements, commissions et retraits</li>
              <li>Vérifier l'identité et prévenir la fraude</li>
              <li>Améliorer la qualité et la sécurité du service</li>
              <li>Assurer le support client et la résolution des litiges</li>
              <li>Envoyer des notifications relatives à vos commandes</li>
              <li>Respecter nos obligations légales et réglementaires</li>
            </ul>
            <p className="text-muted-foreground font-semibold mb-2">La base juridique du traitement est :</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>L'exécution du contrat (fourniture du service)</li>
              <li>Le consentement explicite (documents d'identité, localisation)</li>
              <li>L'intérêt légitime (sécurité, prévention de la fraude)</li>
              <li>L'obligation légale</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">3. Partage des données</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Vos données peuvent être partagées avec :</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">D'autres utilisateurs</strong> : uniquement les informations nécessaires à la mission (nom, numéro de téléphone, localisation pendant le trajet)</li>
              <li><strong className="text-foreground">Prestataires techniques</strong> : hébergement cloud (Railway, Supabase), stockage de fichiers, infrastructure serveur</li>
              <li><strong className="text-foreground">Fournisseurs de services de paiement</strong> : dans le strict cadre des transactions</li>
              <li><strong className="text-foreground">Autorités compétentes</strong> : sur réquisition judiciaire ou légale</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Nous ne vendons jamais vos données personnelles à des tiers à des fins commerciales. Les transferts hors Maroc sont encadrés par des garanties contractuelles appropriées.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">4. Données de localisation</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>La localisation GPS est collectée uniquement lorsqu'une mission est en cours.</li>
              <li>Elle sert au suivi en temps réel, à la sécurité des utilisateurs et à la qualité du service.</li>
              <li>Vous pouvez désactiver l'accès à la localisation dans les paramètres de votre appareil, mais certaines fonctionnalités (suivi de commande, mise en relation) ne seront alors plus disponibles.</li>
              <li>Les données de localisation ne sont pas utilisées à des fins publicitaires.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">5. Sécurité des données</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Nous mettons en œuvre les mesures suivantes :</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Chiffrement des données en transit (HTTPS/TLS)</li>
              <li>Accès restreint aux données (principe du moindre privilège)</li>
              <li>Surveillance continue des accès et des anomalies</li>
              <li>Stockage sécurisé des documents sensibles</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              ⚠️ Malgré toutes les précautions prises, aucun système d'information n'est inviolable à 100 %. En cas de violation de données susceptible d'affecter vos droits, nous nous engageons à vous en informer dans les meilleurs délais.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">6. Conservation des données</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Données de compte</strong> : conservées pendant toute la durée d'utilisation du service, puis supprimées sur demande.</li>
              <li><strong className="text-foreground">Données de transactions et factures</strong> : conservées 5 ans à compter de la transaction (obligation comptable et légale).</li>
              <li><strong className="text-foreground">Documents d'identité</strong> : conservés jusqu'à 1 an après la désactivation du compte Conducteur, sauf obligation légale contraire.</li>
              <li><strong className="text-foreground">Données de localisation</strong> : conservées 90 jours après la fin de la mission, puis supprimées automatiquement.</li>
              <li><strong className="text-foreground">Journaux techniques (logs)</strong> : conservés 30 jours.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">Après la fin de la période de conservation, les données sont supprimées ou anonymisées de façon irréversible.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">7. Vos droits</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Conformément à la Loi n° 09-08 et aux réglementations applicables, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Droit d'accès</strong> : obtenir une copie de vos données personnelles</li>
              <li><strong className="text-foreground">Droit de rectification</strong> : corriger des informations inexactes ou incomplètes</li>
              <li><strong className="text-foreground">Droit à l'effacement</strong> : demander la suppression de votre compte et de vos données</li>
              <li><strong className="text-foreground">Droit d'opposition</strong> : vous opposer à certains traitements (notamment à des fins de prospection)</li>
              <li><strong className="text-foreground">Droit à la portabilité</strong> : recevoir vos données dans un format structuré et lisible</li>
              <li><strong className="text-foreground">Droit de retirer votre consentement</strong> : à tout moment, sans que cela affecte la licéité des traitements antérieurs</li>
              <li><strong className="text-foreground">Droit à un examen humain</strong> : contester toute décision prise sur la seule base d'un traitement automatisé</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Pour exercer vos droits, contactez-nous à : <a href="mailto:FAYAG.APP@GMAIL.COM" className="text-primary hover:underline">FAYAG.APP@GMAIL.COM</a><br />
              Nous nous engageons à répondre dans un délai de 30 jours.<br /><br />
              Vous pouvez également adresser une réclamation à la Commission Nationale de contrôle de la protection des Données à caractère Personnel (CNDP) — <a href="https://www.cndp.ma" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.cndp.ma</a>
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">8. Lutte contre la fraude</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Pour garantir la sécurité de tous les utilisateurs, FAYAGE se réserve le droit de :</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Suspendre ou bloquer tout compte présentant des documents falsifiés ou des informations erronées</li>
              <li>Bloquer l'accès en cas d'activité suspecte ou de comportement abusif</li>
              <li>Procéder à une vérification manuelle supplémentaire si nécessaire</li>
              <li>Signaler aux autorités compétentes tout acte frauduleux avéré</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">9. Protection des données sensibles</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Les documents d'identité (CIN, permis de conduire, photos de véhicule) sont :</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Collectés uniquement avec votre consentement explicite</li>
              <li>Utilisés exclusivement à des fins de vérification et de sécurité</li>
              <li>Jamais partagés publiquement ni vendus</li>
              <li>Protégés par des mesures de sécurité renforcées (accès restreint, chiffrement)</li>
              <li>Supprimés conformément aux délais définis à la section 6</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">10. Mineurs</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le service FAYAGE est strictement réservé aux personnes âgées de 18 ans et plus. Nous ne collectons pas sciemment de données relatives à des mineurs. Si vous pensez qu'un mineur a créé un compte sur notre plateforme, contactez-nous immédiatement à <a href="mailto:FAYAG.APP@GMAIL.COM" className="text-primary hover:underline">FAYAG.APP@GMAIL.COM</a>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">11. Cookies et identifiants d'appareils</h2>
            <p className="text-muted-foreground leading-relaxed">
              Notre application mobile utilise des identifiants d'appareils (device ID) et des technologies de session pour assurer le bon fonctionnement du service et votre authentification. Ces identifiants ne sont pas utilisés à des fins publicitaires. Vous pouvez réinitialiser l'identifiant publicitaire de votre appareil depuis les paramètres de votre téléphone.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">12. Modifications de la politique</h2>
            <p className="text-muted-foreground leading-relaxed">
              FAYAGE se réserve le droit de modifier cette politique à tout moment. En cas de modification substantielle, les utilisateurs seront informés via une notification dans l'application et/ou par e-mail au moins 15 jours avant l'entrée en vigueur des changements. La date de dernière mise à jour figure en haut de ce document.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold mb-4">13. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pour toute question, demande d'exercice de droits ou réclamation relative à vos données personnelles :<br />
              📧 Email : <a href="mailto:FAYAG.APP@GMAIL.COM" className="text-primary hover:underline">FAYAG.APP@GMAIL.COM</a><br />
              📞 Téléphone : 0638563712<br />
              Responsable du traitement : FAYAGE
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
