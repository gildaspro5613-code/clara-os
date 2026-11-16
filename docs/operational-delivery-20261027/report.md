# Clara OS — livraison technique et opérationnelle, 27 octobre 2026

## Références effectivement vérifiées

Base : `56ac97fa8fe9d3225fef3c1fb036b256f13923b5`, branche distante `delivery/clara-os-v1-20261025`. PR #214 fusionnée le 27 octobre à 09:48:48 (Paris), merge exact 56ac97f. HEAD #176 `22ee77e03701c6d581678a5b309a431074d7e7b7` est ancêtre de cette base : aucune seconde fusion. #209 est ouverte et son HEAD a évolué à 56ac97f ; les anciens SHA ne sont pas revendiqués comme état courant. #210 reste ouverte à 3bb986a. Issue métier : #213.

Branche unique de cette intervention : `fix/clara-os-operational-delivery-20261027`. Les anciens checkouts, commits et 137 preuves historiques ne sont ni réécrits ni remplacés. Les rapports #214 restent dans docs/operational-recovery-20261027. La migration 030 Production et sa sauvegarde sont **attestées par le propriétaire**, pas réexécutées ni certifiées à distance ici. Aucune nouvelle migration n’est nécessaire pour les changements de cette branche.

## Causes démontrées et correctifs limités

1. **Logo** : Sidebar pointait déjà vers /brand/clara-os-symbol.svg, mais les octets livrés étaient l’ancien symbole blanc/gris. Reprise du SVG exact de `7f6ef76779f9c6bc3ad7bf27e9f2e047afe603c3`, aucun redessin. SHA-256 public du fichier : `12065771011973e476ac35b80f0d50fc5ff05314240841e332074325a9237406`. Raccord desktop/mobile existant, proportions et viewBox préservés. Le favicon était encore le symbole Vercel (inspection visuelle du .ico) : remplacement de cet ancien asset par src/app/icon.svg, copie exacte du SVG officiel et convention native de métadonnées Next, sans moteur graphique ni redessin.
2. **Documents / administration** : NativeDocumentsPanel exposait OAuth, délégations, révocation et inspection par identifiant au même niveau que les documents. Ces mêmes contrôles restent montés et protégés, dans « Connexion et autorisations avancées », repliée par défaut, traduite FR/EN/ES/DE/IT. La sélection explicite d’une connexion, les références, questions et analyses restent accessibles ; aucune connexion implicite choisie. Aucun consentement automatique.
3. **Diagnostic incomplet** : page Documents avait reçu le filtrage #214, mais NativeDocumentsPanel perdait encore les codes des commandes et références. Réutilisation de documentDiagnostic : code public autorisé, sinon DOCUMENT_REQUEST_FAILED ; jamais de message fournisseur brut. Le test injecte une réponse hostile au niveau navigateur uniquement et vérifie l’absence de fuite.
4. **Contexte technique omniprésent** : le résumé affichait les identifiants internes et le sessionId sur chaque page. Réutilisation des listes autorisées du registre pour afficher les noms exacts client/projet ; identifiants conservés dans une section dédiée. Les valeurs envoyées aux API, les sélections explicites, les identités et les permissions ne changent pas. L’API de workspace ne fournit pas de nom distinct : son identifiant canonique reste affiché, sans nom inventé ni rapprochement par défaut.

Aucun changement backend, store, contrat, migration, capacité ou adaptateur fournisseur. La politique de non-régression et les gardes serveur sont conservés. Le workflow natif existant exécute le nouveau navigateur ; aucune nouvelle infrastructure CI.

## Concordance : ce qui était réellement raccordé

Voir [concordance.csv](concordance.csv). Comparaison réelle avec #176 : MainLayout, Header et Sidebar utilisent déjà les composants existants. Documents utilise NativeDocumentsPanel et NativeGoogleWorkPanel ; Messagerie utilise NativeMailPanel ; Brain utilise BrainStage. Aucun second écran métier finalisé masqué n’a été identifié sur ces chemins. Les changements entre #176 et la base concernent notamment les panneaux natifs et le diagnostic Documents ; ils ne démontrent pas une disparition des interfaces.

Les formulaires de sélection ne doivent pas être supprimés au prix d’un contexte implicite. CanonicalArchivesPanel a son autorité propre : son sélecteur n’est pas remplacé par une inférence. Le Header désactive explicitement la recherche globale ; les recherches métier existantes restent distinctes. Automatisations affiche déjà un avertissement non certifié : nativeOperationFence refuse les anciens adapters globaux, sauf la lecture Agenda native bornée de #214. Ce sont des limitations explicites, pas une régression de cette livraison. Aucune exécution Make/Brevo n’est déclarée disponible ou réussie sans adapter natif autorisé et réception correspondante.

## Google Drive : levée ciblée restante

Google/Drive/Agenda historiquement fonctionnels selon le propriétaire ; connexion historique préservée. Routes réelles : /api/connections/google → sélection de connexion ; /api/documents → références mission et lecture ; /api/native/google/work → consentements/ressources/opérations versionnées. Les contrôles session, propriétaire, projet, sélection, identité Google, version et droits restent serveur.

**Le code du refus Production authentifié n’est pas disponible dans cet environnement.** Il faut reproduire une seule consultation dans la session du propriétaire, avec les connexions existantes, puis conserver uniquement statut HTTP et code public filtré. EXPLICIT_SELECTION_REQUIRED appelle une sélection explicite ; RESOURCE/SCOPE/REVISION_DENIED impose de vérifier le rattachement exact ; REAUTH_REQUIRED justifie une procédure OAuth seulement après approbation. Aucun reset OAuth, aucune délégation ou permission élargie sur la seule absence de délégation active. Aucun secret ou réponse complète à copier dans GitHub.

## IONOS : acquis et opération administrative distincte

Routes et stores existants : NativeMailPanel → /api/native/mail → NativeMail/nativeMailCommand → credentials chiffrés et transport IONOS. Signatures et langues de #207 préservées ; brouillon, opération, approbation exacte et envoi sont distincts. Le résumé cognitif de #214 ne lit que le cache déjà autorisé ; ce n’est pas une relève fraîche.

`mailCredentialStore.save` refuse MAIL_PROVISIONING_DISABLED ; la route native n’offre pas de provisionnement de credentials. Une connexion historique ne constitue pas automatiquement une autorité native. Si les autorités manquent, l’administration doit rapprocher les IDs de connexion, propriétaire/workspace, adresses et références chiffrées existantes dans un canal approuvé, après sauvegarde et revue du changement exact. **Aucun script générique d’écriture ou nouveau coffre n’est inventé ici.** docs/reception-175/lot-2-bis-ionos.md et ionos-autonomous-monitor-reception.md documentent les mécanismes reçus. Le monitoring a son autorité dédiée ; il reste désactivé. Les cinq boîtes ne sont pas recréées.

Aucune relève IMAP réelle, aucun SMTP ni activation autonome effectués. support@/gildas@ requièrent l’approbation ; les autres boîtes restent en mode contrôlé avant certification et activation explicites. Les signatures ne sont pas une preuve d’envoi.

## Qualification et limites

Voir [validation.md](validation.md), les journaux et captures. PostgreSQL et vrais endpoints Next locaux, utilisateurs/données synthétiques, providers simulés. Les captures prouvent le rendu sur ce code et cet environnement ; elles ne certifient pas les données Production ni tous les effets métier. Les recettes documentaires et #214 fournissent séparément les preuves d’actions/persistance.

Les réserves antérieures HTTP 503, lint global et alertes de dépendances ne sont pas effacées. Aucun audit npm général ni lint global rejoué sans changement de dépendances ; package.json et lockfile sont inchangés. Une erreur de harnais local (lien node_modules hors racine Turbopack, puis reconstruction pendant une reprise) a imposé une exécution finale sur build figé ; elle n’est pas attribuée aux 503 historiques ni à un fournisseur. Aucun retry applicatif ajouté.

## Publication et décisions

Publication uniquement GitHub, sur nouvelle branche non Production. Protections historiques réutilisées : docs/delivery-v1-20261025/publication-protection-evidence.md, Only build production et absence de tracking de cette branche. Exclusion complémentaire explicite git.deploymentEnabled=false pour cette branche dans vercel.json, sans modification distante, sans toucher les crons. Les workflows de déploiement restent manuels ; aucun n’est exécuté. Vérifier les checks/déploiements GitHub observables après publication, sans prétendre inspecter Vercel.

**GO technique** seulement après build, TypeScript, lint ciblé, recettes impactées et CI réussis. **NO-GO opérationnel complet Production** tant que la version n’est pas autorisée/déployée et reçue dans la session réelle, Drive qualifié et IONOS rapproché selon le périmètre activé. Cela ne retire pas les acquis historiques des fournisseurs. Clara Live reste en lecture seule ; son état est dans [live-readonly.md](live-readonly.md).

## Ordre minimal de mise en exploitation, sous GO séparés

1. Examiner cette PR Draft et ses preuves. Aucune migration nouvelle proposée ; ne pas réappliquer 030 par défaut.
2. Avec la version actuelle déjà diagnostiquable (#214), relever le code public du seul refus Drive authentifié. Ne changer que le rattachement/consentement démontré nécessaire, sous autorisation s’il écrit ; préserver les connexions.
3. Pour IONOS, approuver le rapprochement administratif exact uniquement si les autorités natives manquent. Sauvegarde préalable propre à la base effective, modification limitée et réversible ; pas d’envoi/monitoring implicite. Les secrets restent dans les canaux sécurisés existants.
4. Sous GO explicite : merge puis déploiement volontaire du SHA approuvé sur le projet OS existant, sans Live, sans changement des fournisseurs ni des domaines. Conserver l’ID de déploiement précédent et son SHA 56ac97f comme référence de retour arrière (l’ID actuel n’a pas été relu ici).
5. Réception propriétaire : connexion → contexte autorisé → consultation sans mutation → mission explicite → contact → document autorisé/Brain → conversation → Agenda → brouillon signé/approbation → Journal → refresh/reconnexion. Vérifier les refus interprojets, sans effet fournisseur non autorisé. Pour Drive/Agenda/IMAP/voix réels, GO d’essai précis ; aucun SMTP inclus.
6. Vérifier les événements et états durables, absence de faux succès et d’effet non approuvé ; décider GO/NO-GO opérationnel sur le périmètre effectivement reçu.
7. Arrêt au premier défaut d’autorité/intégrité : suspendre les écritures concernées, conserver les reçus, restaurer le déploiement précédent sous GO. Aucune migration de cette PR à annuler ; conserver 030 et les historiques. Ne pas rejouer un envoi ou résultat incertain. Révoquer seulement les nouvelles autorisations explicitement concernées après décision du propriétaire.

### Limite de la capture Connexions

Le statut Microsoft est un refus 403 simulé à la frontière de la recette visuelle : sa lecture d’authentification relève d’un autre harnais que l’allowlist native utilisée ici. Aucun connecteur Microsoft n’est modifié ni déclaré certifié. L’échec initial lié au marqueur partagé et la correction du harnais sont détaillés dans validation.md ; les tests interdisant les chargements globaux restent actifs.

### Accès aux preuves visuelles

- [Documents desktop](evidence/screens/documents-desktop.png) et [menu mobile](evidence/screens/navigation-mobile.png).
- [Diagnostic filtré](evidence/screens/filtered-diagnostic.png).
- [Documents avec analyse](evidence/screens/documents.png) et [Cockpit après redémarrage](evidence/screens/cockpit-after-restart.png).
- [Première journée : résultat synthétique](evidence/first-day-result.json) ; [reprise documentaire](evidence/document-restart-result.json).

Ces données sont synthétiques ; aucune capture Production, aucun cookie ou credential n’est publié.
