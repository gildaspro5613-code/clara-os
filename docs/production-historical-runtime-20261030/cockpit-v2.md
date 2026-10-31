# Cockpit attendu — composition 781976a3

Référence approuvée par le propriétaire : `781976a3b53d6a8a53d31a892c33168af0b3b4f5`.
Base fonctionnelle conservée : `141648d51b9f3bd7173eeeecfd59d5c3b9fd9b48`.
Même branche : `delivery/clara-os-historical-runtime-20261030`.
Cette livraison remplace la référence graphique du premier rapport, pas ses acquis métier.
Aucun merge de #219, migration, accès Production ou fournisseur réel.

## Composition et écarts précis

| Élément | Référence 781976a3 | Raccord corrigé |
|---|---|---|
| Hero | Architecture CSS bleu nuit/cyan, sans portrait | Même décor CSS ; aucune image ou nouvelle identité |
| Brief | Gauche 5 %, haut 12 % | Même ancrage, mission autorisée et prénom de connexion Google vérifié |
| Accès vocal | Gauche 6 %, haut 61 %, barre compacte | Composant original ; désactivé en natif, indicateur neutre et motif explicite |
| Agenda | Droite 5 %, haut 7 % | Même panneau et endpoint protégé |
| Mission | Droite 5 %, haut 61 % | Tasks raccordé de 141648d5 conservé : titre, objectif, progression, prochaine action réels |
| GlassPanel | Liseré cyan, surfaces vitrées | Composant identique à 781976a3 |
| Widgets | Résumé/attention/raccourcis, conversations/agenda, mission/Waze/météo, dialogue | Même structure ; barre de six liens et aperçu courrier autorisé de 141648d5 conservés |
| Dialogue | Saisie et lecture sous le Hero | ClaraChatWidget natif existant, mode compact retiré ; FR « Parler avec Clara » |
| Navigation | Pages métier existantes | Sidebar et destinations de livraison conservées, aucune route concurrente |

Écarts volontaires : flux vertical reçu sur mobile/tablette au lieu des anciens
ancrages absolus superposables ; hauteur/défilement bornés des colonnes desktop
pour les textes longs et traductions ; voix native non activée ; aucun ancien
prénom par défaut, 82 % ou contenu de démonstration réintroduit. Pas de bandeau
documentaire global dans le Cockpit ; références toujours sur Clara/Documents.

## Accueil personnalisé, sans nouveau registre ni autorité

L’autorité actuelle stocke l’association Google et la session, mais pas le prénom.
La connexion existante demande déjà `openid profile email` ; aucun nouveau scope,
client OAuth ou endpoint fournisseur n’est introduit.

Après signature/issuer/audience/nonce/expiration vérifiés, consommation atomique
du state, résolution de l’utilisateur inscrit et émission de sa session, le
callback récupère uniquement `given_name`. Une métadonnée de présentation
HttpOnly/Secure/SameSite=Lax est chiffrée avec la primitive AES-GCM et la clé
`CLARA_CREDENTIALS_ENCRYPTION_KEY` existantes. Elle est bornée à 12 heures et liée
au digest de cette session précise. Pas de subject, email ou jeton Google conservé
dans ce cookie ; aucune donnée ni permission SQL nouvelle.

Le HomePage ne lit ce prénom qu’APRÈS le garde natif session/workspace/projet.
La métadonnée ne permet jamais d’authentifier ni d’autoriser une opération.
Un cookie altéré, dupliqué, expiré, étranger à la session ou sans clé exploitable
produit un accueil générique. Aucune déduction depuis l’email, une variable de
prénom ou le compte fictif. La déconnexion efface la métadonnée ; une session
révoquée reste refusée même si sa métadonnée est encore présente.

Les connexions déjà ouvertes restent valides mais ne possèdent pas rétroactivement
le prénom vérifié : il sera disponible après une connexion Google ordinaire réussie.
Sans `given_name` ou sans clé existante exploitable, « Bonjour. » est conservé.
Aucune réinitialisation OAuth, invitation, autorité ou élargissement de droit.

## Réception et niveau de preuve

- `v2-visual/` : 15 combinaisons FR/EN/ES/DE/IT × desktop/tablette/mobile,
  plus vues françaises des widgets, du vocal désactivé et des conversations.
- « Bonjour Gildas » provient d’une preuve chiffrée de profil simulé dans la
  fixture, jamais d’un nom codé dans l’application. Les tests du vrai vérificateur
  Google utilisent des JWT RSA signés synthétiques ; ils refusent la mauvaise
  signature, issuer, audience, nonce, expiration, rejeu et identité non inscrite
  avant toute émission du prénom. Cela ne certifie pas un appel Google réel.
- Le navigateur utilise PostgreSQL jetable et les véritables endpoints natifs :
  mission persistée, navigation, lecture, saisie, réponse simulée, rechargement,
  absence de nouvelle mission sur consultation, refus d’un autre utilisateur et
  révocation effective alors que le cookie de prénom existe encore.
- Les autorités, le contenu durable, l’idempotence et les mécanismes de reprise
  sont ceux de 141648d5. Aucune migration SQL, modification d’ACL ou nouvel outil.
- Les preuves portrait du dossier `visual/` restent conservées comme historique
  du raccord précédent ; elles ne sont PAS les captures de ce candidat corrigé.

Aucune capture originale de 781976a3 montrant le compte réel n’est inventée.
La comparaison à cette référence porte sur les composants et leurs ancrages Git ;
les captures du résultat sont de véritables rendus locaux isolés.

Les fournisseurs réels, la qualité d’un modèle distant et la voix native ne sont
pas certifiés par les simulations. La voix reste fermée. La validation visuelle
propriétaire et les CI distantes restent distinctes de cette réception locale.


## Résultats finaux

38 tests ciblés PASS, 0 FAIL, 0 SKIP (autorités, Google signé, callback, profil,
PostgreSQL et reprise opérationnelle). Deux recettes HTTPS PASS : composition
sur quinze combinaisons, dialogue/rechargement/révocation ; recette Cockpit
existante de navigation et reprise après perte d’acquittement.
TypeScript, lint ciblé, build optimisé Webpack et syntaxe YAML/shell : PASS.
24 captures V2 conservées, les captures FR de l’accueil et du dialogue ont été
examinées visuellement. Fournisseurs simulés, aucun appel métier réel.
Aucun merge, aucune migration ou nouvelle base, aucun déploiement.
CI distantes et création effective de PR à attester séparément : l’API GitHub
restait Forbidden lors de la préparation précédente.
