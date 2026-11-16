# Clara OS Connector Builder — réception unique / garde-fous de livraison
14 novembre 2026 — Branche `fix/connector-builder-native-gateway-20261114`

## État de la preuve au moment de la rédaction

- Registre, sélection conversationnelle, coffre résolu après autorisation, journal, révocation, administration native, panneau Connexions et READ Make spécifique : sources enregistrées sur la branche isolée.
- Fonctions SQL de qualification installées seulement sur le clone Neon `br-nameless-dew-b2v6asgj`, sans nouvelle connexion ni grant. Les requêtes avec fausse session ont effectivement été refusées ; 0 capacité activée et 0 scénario Make exécuté.
- Migration `032_connector_builder_native_read.sql` écrite pour plusieurs entreprises, mais **non exécutée sur la Production**.
- **Pas de preuve** d'un `tsc` complet, d'un build, d'un test utilisateur signé, ni du passage fournisseur via la passerelle générique. Ne pas annoncer « livré » ou « certifié ».
- Le jeton Make du clone utilise une clé distincte de celle de l'ancien `CredentialStore`. Aucune hypothèse de déchiffrement inter-environnements.

## Une seule campagne de validation hors Production, sans nouvelle Recette Vercel

À exécuter dans un runner déjà autorisé à accéder à la branche, **sans identifiants fournisseurs ni base Production** :

```bash
node --import tsx --test \
  src/tests/connector-builder-native-gateway.test.ts \
  src/tests/connector-builder-native-selection.test.ts \
  src/tests/connector-builder-read-reception.test.ts \
  src/tests/make-connector.test.ts \
  src/tests/make-on-demand-contract.test.ts
npx tsc --noEmit --pretty false
npm run build
```

Lancer sur un clone de travail uniquement. Conserver les traces et corriger les échecs avant de poursuivre. Les tests ne doivent appeler aucun fournisseur. Ne pas créer de Preview Vercel.

## Préflight migration après GO explicite

1. Contrôler le commit candidat, la sauvegarde fraîche Neon et le compte PostgreSQL **déjà utilisé par Clara OS Production**. Ne pas supposer que le rôle du clone correspond.
2. Vérifier SQL de `032` (additif, rôles de service désactivés par défaut, zéro grant client, zéro fournisseur actif) et faire valider le droit `SECURITY DEFINER` par un administrateur de la base.
3. N'ouvrir pour le rôle applicatif retenu que **USAGE sur le schéma et EXECUTE sur les fonctions nécessaires**, pas de `SELECT` sur les tables de grants, secrets et journaux ; configurer une ligne autorisée dans `service_roles`, et rien pour `PUBLIC`.
4. Préparer une procédure de conversion **chiffré → chiffré** approuvée pour les identifiants Make si leur clé de qualification diffère de celle du coffre du service cible. Ne jamais exposer les valeurs, réutiliser un enregistrement existant sans réimport manuel et ne pas activer WRITE/SEND.
5. Préparer un retour arrière sur le déploiement et une restauration maîtrisée de la migration **sans supprimer les grants ou credentials déjà présents**. Toute mise en Production exige une autorisation GO distincte.

## Certification réelle — une session Clara, deux fournisseurs

Une fois le déploiement expressément autorisé, sur un projet Mélodie Digital choisi depuis OS :

1. Le propriétaire se connecte normalement, sans jeton/SQL/Codespaces. Le panneau Connexions affiche uniquement les READ candidats déjà revus ; une connexion `CONFIGURED` seule n'est pas marquée opérationnelle.
2. La personne autorisée confirme le droit READ d'une capacité via l'interface. Le journal durable comporte `GRANT`; une demande naturelle de lecture passe par Clara et le Builder, avec une réponse fournisseur **réellement terminée** puis `REQUESTED` / `SUCCEEDED`.
3. Révoquer depuis le panneau, vérifier `REVOKE`, puis vérifier le refus d'une nouvelle lecture et d'un résultat arrivé après révocation. Contrôler la session, l'utilisateur, le client, le projet et le compte cible.
4. Répéter la même réception sur un **deuxième fournisseur** (Brevo après résolution de son OAuth M2M, ou GitHub avec une connexion habilitée). Pas de développement métier, pas de seconde migration, pas de nouvelle Recette.
5. Marquer « certifié » uniquement si toutes les preuves existent ; ne jamais le déduire du simple succès des tests ou de la présence d'un token.

## Points qui restent spécifiques à un fournisseur

- **Make** : `make.drive.find` est la seule lecture reconnue sur cette branche ; le catalogue SQL doit associer l'exact scope `make:scenario:find-drive-document` à une connexion `ACTIVE` revue, pas la capacité générale `make.scenario.execute`.
- **Brevo** : le flux OAuth M2M de la PR Draft #270 n'est pas automatiquement intégré à cette branche. Ne pas contourner le filtrage IP API ou employer une clé globale du serveur comme identité client.
- **Stripe** : il existe un adaptateur mais toutes les capacités READ ne sont pas déclarées au registre central ; ne pas activer paiement, facturation ou WRITE par ce chantier.
- **Clients futurs** : le socle d'autorisation et la page de consentement sont communs. La création d'un **nouveau fournisseur jamais intégré** pourra encore demander son adaptateur/manifest, mais **pas** de clone SQL, d'identifiant MD ni de travail de développement par client.

**Blocages de diffusion maintenus** : NO-GO READY, merge, Vercel Preview, Production, WRITE et SEND sans GO explicite. Ce document est un protocole de réception, pas une autorisation de livraison.
