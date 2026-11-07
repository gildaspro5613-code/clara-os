# Lot 1 — continuité commerciale native et non-régression

**GO EN ISOLATION ; NO-GO Production.** Source testée : `5f03d349aa83787970d4ef4bd26640cf2dfc5264`, départ `80f6e1f`, branche `fix/os-operational-reception-175`, PR #176 Draft. Aucun nouveau connecteur, store métier ou système d'identité créé. Aucun merge, Preview, migration/déploiement Production, appel fournisseur réel ou envoi. Clara Live reste au SHA `48a2f94910d4a6111250e15046e0f471ddd6ac9b`, sans modification.

## Raccords réutilisés

- Identités vérifiées, sessions et memberships canoniques ; clients/projets et leurs ACL ; attestations de `clara_native_resource_authority` et runtime `clara_native_runtime_command`.
- `clara_project_intake_inbox` / `clara_acquisition_records`, qualification/brief/lifecycle existants, `loadAcquisitionRecord`, `loadProjectIntake`, `saveCommercialDraft`.
- `resolveCommercialDraft` / `updateCommercialDraft` / service de préparation existants. Destinataire et langue viennent du dossier autorisé existant ; ils ne déterminent jamais son propriétaire.
- Core, stores Mission/Session/Journal, composeur, sélecteur natif, éditeur de brouillon, panneaux Cockpit existants.

## Modifications nécessaires

Migration additive **014_native_commercial_continuity.sql** : ajoute le type `acquisition` aux attestations existantes et étend les deux fonctions natives actuelles. Elle initialise les deux tables commerciales déjà utilisées uniquement si absentes ; aucun backfill. Resource key `workspace/submission` (identifiants canoniques sans slash), empreinte couvrant record, intake, métadonnées source et brouillon. Lecture soumise au propriétaire, au tuple workspace/client/projet, à l'ACL, à la session et au snapshot exact. Le client ne dispose d'aucune API d'attribution.

Le contexte de requête hydrate les records/intakes réellement autorisés et stage les révisions du brouillon. Le commit revalide droits, snapshot commercial et snapshot Session, verrouille le record/intake et l'attestation, puis persiste **brouillon, Session, Mission, Journal et versions d'attestation dans la même transaction**. Conflit entre deux fils : 409 ; aucune garantie atomique fondée sur une simple seconde lecture. Les révisions intermédiaires d'une construction/révision dans la même requête sont comptées. Destinataire, révision, approbation pending et `delivery.allowed:false` sont contrôlés au commit.

Le sélecteur existant affiche uniquement les contacts attestés. La sélection explicite est persistée dans la Session ; une mission nouvellement créée reçoit son association et une mission liée existante peut être retrouvée. Les anciennes missions sans lien ne sont pas attribuées automatiquement. Changer de contact dans un fil déjà lié, ou lier un fil contenant une mission non associée, demande un nouveau fil : l'ancien historique reste intact.

`/api/contacts` et PATCH commercial-draft sont remplacés par des chemins contextualisés ; aucune ancienne lecture globale n'est réactivée. L'éditeur envoie la révision affichée et refuse une édition périmée. Clara reçoit le contact sélectionné dans son contexte conversationnel et le composeur ; le contexte est traité comme données, jamais comme autorité d'envoi. Les règles de décision du Brain ne sont pas réécrites. Le Cockpit reçoit intake/record autorisés par props, sans charger un intake global après sortie du contexte serveur.

Les tentatives d'envoi natives sont refusées avant composeur, bridge ou transport. Les routes d'approbation non certifiées et les neuf routes Google/Brevo/Make restent fermées. Documents/Drive, voix et exécution physique ne sont pas réouverts.

## Recette réellement exécutée

Base PostgreSQL Docker unique, migrations 001/002/008/012/013/014, deux utilisateurs, deux clients, trois projets. Records provenant des vrais builders de qualification/brief/lifecycle, attestations synthétiques explicites ; un historique non attribué conservé. Services et persistance métier réels ; OpenAI simulé et tous les autres fournisseurs bloqués.

Le browser HTTPS exerce : session canonique valide → sélection workspace/client/projet → contact privé → Mission → dialogue Clara → Journal → préparation du brouillon par le service → édition durable → Cockpit → rechargement → logout réel → reprise avec une autre session canonique valide du même utilisateur. Assertions PostgreSQL sur destinataire, révision et absence d'autorisation de livraison. Capture simulée : contact sélectionné présent dans le prompt du composeur, aucune donnée des contacts étrangers dans les appels capturés.

**Limite d'authentification :** les identités et bearers sont provisionnés dans la fixture canonique ; le logout révoque réellement le premier bearer en PostgreSQL, la reprise utilise un second bearer distinct de la même identité. Ce test ne déroule pas le login OIDC Google/Microsoft réel et ne certifie aucun fournisseur d'identité.

Refus exécutés : autre utilisateur dans le même client/projet, autre projet, autre client, session expirée, ACL révoquée, historique non attribué, PATCH de révision périmée et tentative d'envoi. Deux requêtes de révision depuis deux fils distincts se chevauchent réellement : une persistance, un 409. La révocation après préparation empêche la persistance des modifications staged. Aucun email ni appel fournisseur.

| Campagne / commande | Résultat | Périmètre |
|---|---|---|
| `node --import tsx --test src/tests/native-authority.test.ts src/tests/native-authority-postgres.test.ts src/tests/native-runtime-postgres.test.ts src/tests/native-commercial-postgres.test.ts` avec container canonique | 13/13, zéro ignoré | Vrais services/PG ; anciennes garanties réexercées après migration 014 |
| Browser native-runtime + native-commercial, HTTPS isolé | 2/2, zéro ignoré | Parcours métier complet et ancienne recette native ; OpenAI simulé |
| Registre/archive/concurrence OS↔Live | 4/4, zéro ignoré | PG/MongoDB réels isolés, 18 contrôles de concurrence ; aucun changement Live |
| Production P0 / event-jobs / document-failures / commerciale | 36/36, zéro ignoré | Handlers, PG et doubles fournisseur |
| Documents/PDF/routes/archive | 29/29, zéro ignoré | PDF local et PG ; droits Drive non certifiés, seams legacy qualifiées |
| i18n/réception/voix/commerciale/Google OAuth | 29/29, zéro ignoré | Modules réels, fournisseurs simulés |
| Brevo/Make/GitHub/Stripe/session/ACL | 39/39, zéro ignoré | Adapters simulés ; aucune connexion réelle réouverte |
| Browser documents/archives/i18n/refus HTTP/RSC | 10/10, zéro ignoré | UI documents/archives avec interceptions ; refus natifs réels, 60 visites de routes en cinq langues |
| TypeScript, lint ciblé, build Webpack | Succès | Build local, polices locales via hook de test ; aucun déploiement |

Ces campagnes se recouvrent : **ne pas additionner leurs nombres**. Logs et commandes structurés dans [lot-1-evidence.json](lot-1-evidence.json). Les échecs de recette intermédiaires ont été investigués : label select ambigu corrigé par aria-label ; attente de la réponse réelle de préparation ; diagnostic de body Playwright après navigation supprimé sans supprimer l'assertion du statut ; distinction prompt Brain/composeur. Le parcours positif final et toutes ses assertions passent.

## Politique permanente

[non-regression-policy.md](non-regression-policy.md) est référencée par AGENTS.md. Avant modification : inventaire des parcours/contrats et réutilisation ; ensuite tests positifs/négatifs, persistance/reprise et non-régressions ; preuves avec commit et limites ; réception bloquée sur toute régression démontrée. Aucun test désactivé.

Workflow natif existant étendu, sans nouveau workflow : paths commerciaux/core/Brain/politique/migration, tests commerciaux PG et browser, lint des frontières rouvertes. Déclenchement sur PR vers main et consolidation. Les workflows Documents, P0 et i18n existants restent en place. Application à Clara Live prévue dans un chantier séparé, non effectuée ici.

Lint global et Vitest sont **toujours en échec préexistant**, qualifiés par comparaison avec une archive exacte du commit 80f6e1f, sans worktree ni branche : 10 erreurs/13 avertissements lint, mêmes diagnostics normalisés ; 20 tests Vitest réussis, deux tests échoués et une suite en erreur d'initialisation, mêmes trois fichiers acquisition-store/decision-brief/project-intake. Le nombre de 14 avertissements des anciens rapports concernait une base antérieure. Aucun nouvel échec global démontré ; ces écarts restent à traiter/qualifier avant réception globale.

## Prérequis et limitations Production

014 est uniquement testée en isolation. Après 012/013, vérifier schéma réel, nom du CHECK resource_kind, colonnes commerciales et propriétaires ; les fonctions restent SECURITY INVOKER, helper snapshot avec EXECUTE retiré à PUBLIC. Le rôle applicatif doit disposer d'EXECUTE sur le helper et fonctions natives, SELECT des deux tables commerciales et privilèges appropriés aux verrous, ainsi que UPDATE de commercial_draft/updated_at. Ne jamais accorder ces droits à PUBLIC ; préparer/tester le profil de grants du rôle réel. Sauvegarde et restauration isolée obligatoires avant toute migration autorisée.

Les dossiers historiques restent non sélectionnables sans preuve indépendante, revue, ACL et attestation explicite. L'interface n'attribue pas de propriétaire ni ne crée de dossier à partir d'un email. Une modification externe du record/intake invalide l'ancien snapshot et ferme l'accès jusqu'à revue : elle ne réattribue pas l'historique.

Rollback non destructif : conserver les données et attestations 014 ; restaurer des barrières sûres. Ne pas réappliquer aveuglément 012/013 après 014 : cela remplacerait les fonctions actuelles par leur ancienne définition. Un ancien code 80f6e1f ne sait pas fournir le snapshot commercial attendu pour les fils liés ; leurs écritures doivent rester fermées en rollback. Ne pas DROP les métadonnées ni revenir au runtime global.

Reste hors certification : OIDC réel, Neon/Vercel Production, fournisseurs, Drive/documentaire, Live Production et envoi. GO lot 1 signifie **parcours complet isolé avec refus validés**, pas réception Production.
