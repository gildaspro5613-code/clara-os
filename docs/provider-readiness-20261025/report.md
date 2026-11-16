# Clara OS V1 — préparation d’exploitation des fournisseurs existants

**Production : NO-GO.** Le socle de réception isolée précédent est préservé.
Aucun fournisseur n’est déclaré en panne parce que sa dernière recette n’a pas été
rejouée. Aucun essai fournisseur réel n’est exécuté. La décision technique finale figure ci-dessous, après contrôles exécutés.

## Référence et préservation

Base : `b40386f4673c5e7cc26e0d2938c5bef06a2324d5`.
Branche locale unique : `finalization/os-v1-provider-readiness-20261025`.
Ancienne branche `reception/os-v1-first-day-20261024` conservée intacte, bundle
vérifié ; base nécessaire à sa restauration : #202 `01e3d253ea435d99462e5f80ba68c9c5e0582986`.
Les 137 preuves, 025/026/028, contrats canoniques et historiques sont préservés.

Lecture GitHub actualisée : #176 OPEN Draft `22ee77e…`, #199 OPEN Draft `d3dbe8e…`,
#202 OPEN Draft `01e3d25…`, mêmes bases. Aucun push/merge/CI distante déclenché.
IONOS V1 b02b1dd reste absent : pas de checkout/branche/objet/chemin d’archive ;
GitHub répond HTTP422 au commit. Les 117 tests ne sont pas comptés et la messagerie
n’est pas réécrite. Le socle contrôlé effectivement présent reste reçu séparément.

## Correctifs démontrés

1. Make : un HTTP 200 vide/`Accepted` sans complétion explicite devenait `completed`.
   Désormais `accepted` ; des statuts contradictoires échouent fermement. Un timeout,
   une erreur réseau ou HTTP n’autorise plus un retry automatique de POST. Pas de
   changement d’URL/configuration, de scénario, d’input métier ou de scope.
2. L’audit `CapabilityToolBridge` devenait `SUCCEEDED` pour ce simple ack. Il reste
   `REQUESTED` jusqu’à preuve explicite de complétion. États et magasin existants,
   aucun deuxième Journal ni extension de contrat canonique.
3. Téléphonie : HTTP 200 sans identifiant d’appel produisait une annonce de départ.
   Il est refusé ; une réponse valide conserve les mêmes IDs et le même transport.
4. Page Téléphonie : le bouton fermé pouvait être contourné avec Entrée. Tous les
   chemins UI respectent la fermeture ; aucune activation fournisseur n’est faite.
5. Dépendances : avis officiels Nodemailer confirmés. Versions minimales compatibles
   Nodemailer **10.1.1 → 10.1.4**, Mailparser **3.9.39 → 3.9.43** (qui embarque la version
   corrigée). Axios **1.19.0 → 1.20.0**, follow-redirects **1.16.0 → 1.16.1**, qs
   **6.15.3 → 6.16.1**, zod **4.4.3 → 4.6.7**, brace-expansion compatible corrigé.
   Pas de mise à niveau majeure ni override/force, SDK Google/Twilio/OpenAI/ElevenLabs
   et Next 16.4.3 inchangés. Lock/install cohérents. Audit runtime : **7 → 0 alertes**.
   L’audit complet conserve **3 alertes dev préexistantes** (js-yaml haute, vitest et @vitest/mocker modérées), versions identiques à b40386f. Elles ne sont pas masquées par le résultat runtime et sont qualifiées séparément. Les anciens résultats et avertissements peer/dépréciations npm restent en preuve.

## Ce qui est prouvé, sans extrapolation

- [Matrice d’exploitation](exploitation-matrix.csv) : acquis réels historiques
  déclarés par propriétaire, preuves isolées avec SHA, nouveaux correctifs et limites.
- [Chaînes par fournisseur](provider-chains.md) : premier maillon manquant explicite.
- [Seuls blocages d’exploitation](blockers.csv).
- [Protocole réel](real-provider-protocol.md) : opération, effet, GO, résultat et arrêt.
- Ancienne journée guidée : `../first-day-20261024/first-day-guide.md` ; aucune
  autonomie ou prétendue synthèse globale n’est activée pour la transformer en succès.

Les corrections de reçus sont une réduction concrète de risque avant essais réels,
mais n’ouvrent pas automatiquement une capacité encore fermée par l’autorité.

## Validations et limites

Installation `npm ci` réussie, versions installées égales au lock. TypeScript, lint
ciblé et build contrôlés. Tests providers, politiques, PostgreSQL natif et navigateur
sont tracés dans `evidence.json` après leur fin ; aucune campagne historique entière
recomptée comme nouvelle. Reproductions avant correction conservées, aucune assertion
supprimée ni barrière relâchée. Aucun schéma/migration/rôle distant modifié.

Un premier navigateur a échoué pendant les tests SQL parallèles : timeout de réponse
lecture documentaire et resets du proxy. Ce n’est pas présenté comme une panne
Google, ni attribué définitivement à la charge sans preuve. La trace est préservée ;
une recette séparée est faite une fois les campagnes SQL terminées. Aucune relance
métier automatique et aucune modification applicative pour masquer ce timeout.

Lint global, Vitest global et épisodes HTTP503 historiques ne sont pas déclarés
corrigés. La nouvelle photo de l’audit dépendances remplace la réserve des sept
alertes pour ce lock, sans effacer la preuve historique et sans certifier un fournisseur.

## Bilan exécuté et décision

**89 tests finaux PASS, 0 FAIL, 0 skip** : 56 fournisseurs/autorités/MIME/langues,
25 natifs PostgreSQL et 5 politiques/audit, plus 3 tests TCP du proxy. Les essais
intermédiaires et les tests historiques ne sont pas additionnés à ce total.
**Trois recettes navigateur finales PASS** : journée guidée (467,3 s), arrêt/reprise
réels (93,7 s), puis surfaces Téléphonie/Make/Brevo (6,2 s). Les compteurs de la journée
restent à zéro pour SMTP et mutations Google. TypeScript, lint ciblé et build final
16.4.3 réussis ; `npm ci` réussi ; runtime audit 0, audit complet 3 dev préexistantes.

Le proxy final trace 904 réponses. Les cinq GET /clara 503 sont immédiatement
précédés d’ECONNREFUSED au démarrage/aux redémarrages de Next, pendant le contrôle
de disponibilité du runner. Les autres 5xx correspondent aux fences Make/Brevo,
à l’Agenda avant sélection/attestation et à la météo simulée indisponible. La lecture
documentaire finale répond en 13,0 s maximum ; ne pas attribuer pour autant tous
les anciens 503 ou le timeout initial à cette seule cause. Aucun retry métier ajouté.

Une première édition locale du garde d’audit était placée avant le résultat : les
tests ont refusé cette erreur de placement ; elle a été corrigée avant le commit
applicatif correspondant. Les traces avant/après sont conservées. Aucun de ces
échecs intermédiaires n’est présenté comme un PASS final ni comme une panne fournisseur.

**GO technique conservé pour la réception isolée du socle. Préparation prête pour
solliciter R1–R4 (Google/Drive et IONOS contrôlé), sous autorisations distinctes.**
**NO-GO exploitation réelle transverse complète et NO-GO Production.**

Les acquis réels Google/voix restent reconnus. Le candidat actuel est reçu en
isolation avec les correctifs et dépendances livrés, pas certifié auprès des
fournisseurs réels. Les défauts reproduits sont corrigés ; aucune nouvelle
régression n’est démontrée dans les parcours rejoués, sans promettre une couverture
réelle universelle.

Il reste deux raccords métier démontrés : Make natif → résultat contact/mission
persisté avec reprise, et voix native → autorité/ID d’opération durable/Journal.
Une simple autorisation d’essai ne les remplace pas ; R5/R6 sont délimités dans le
protocole pour ne jamais simuler leur disponibilité. Il n’est pas demandé de
recréer les scénarios, connexions ou fournisseurs. Hors ces raccords, la prochaine
étape utile est l’autorisation de présenter le code dans l’instance de réception
existante, puis les essais contrôlés R1–R4. Aucun GO de publication/déploiement/envoi
n’est pris par cette mission.
