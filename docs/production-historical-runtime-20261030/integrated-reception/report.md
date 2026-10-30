# PR #220 — Réception intégrée des moteurs existants

Base : `ce51f0f706c9632169e4530afa3a9066ca0effdc`. Branche unique : `delivery/clara-os-historical-runtime-20261030`. Le Cockpit V2 est visuellement accepté par le propriétaire. Aucun fichier applicatif, composant, ACL, migration, dépendance ou workflow n'est modifié dans ce correctif. La voix native reste désactivée.

## Cause et correction

Échec reproduit sans modification : `native-documents-browser.e2e.mjs:54`, délai de 30 secondes sur `[data-native-document="document-a"]`. La lecture PDF, le Core/Brain, la persistance des références et leur autorisation ont déjà réussi à ce stade. La boucle vérifiait Journal, Cockpit puis Clara en supposant que le Cockpit contenait encore un panneau documentaire.

La composition V2 de `Cockpit.tsx` ne monte volontairement plus `NativeDocumentsPanel referencesOnly` : les références sont dans Documents et Clara. Ce n'est ni une perte du document ni une révocation ni un délai de chargement. Réintroduire ce panneau modifierait le graphisme gelé.

Correction exclusivement du parcours navigateur : sur le Cockpit, vérifier la mission active, l'absence de bibliothèque dupliquée et le lien Documents de la barre Actions Clara OS ; cliquer réellement ce lien, attendre la page Documents et y vérifier la référence. La vérification sur Clara, le Journal, la recharge, la nouvelle session, les refus interprojets/interutilisateurs, les versions et les révocations sont conservés. Aucun timeout augmenté, retry ajouté ou assertion de sécurité supprimée.

## Matrice des capacités

Les statuts concernent le candidat et le niveau de preuve indiqué, pas une certification générale de Production. PostgreSQL, les routes applicatives, le navigateur HTTPS, les stores et les contrôles d'autorité sont réels en local. Google, OpenAI et IONOS sont simulés ; les accès réseau métier réels sont interdits par les fixtures.

| Capacité | Statut | Preuve précise | Limite / prochaine opération utile |
|---|---|---|---|
| Composition Cockpit V2 et espace Clara | OPÉRATIONNEL pour la réception visuelle propriétaire | Acceptation explicite du propriétaire sur ce51 ; `../cockpit-v2.md`, captures `../v2-visual/` | Aucun changement graphique ici ; cette acceptation n'atteste pas les fournisseurs |
| Clara → Brain → mission explicite → conversation → Journal | TESTÉ EN ISOLATION | `operational-recovery*.test.ts`, `native-commercial-postgres.test.ts`, recettes commercial/conversation | OpenAI simulé ; question informative non mutante, commande explicite autorisée, historique et reçus persistants |
| Missions, contacts, reprise des contextes autorisés | TESTÉ EN ISOLATION | `native-authority*.test.ts`, `native-commercial-postgres.test.ts`, `native-conversation-postgres.test.ts` ; recettes runtime/commercial/mission-contact | Pas de copie Production ; conservation d'identité, reprise et refus étrangers vérifiés |
| Documents, recherche autorisée, analyse et Journal | TESTÉ EN ISOLATION | `native-documents-postgres.test.ts`, recette `native-documents-browser.e2e.mjs` corrigée | PDF/Core/Brain et PostgreSQL réels, Google et génération simulés ; recherche limitée au périmètre autorisé, pas de recherche globale implicite |
| IONOS : réception, classement, brouillon, signatures et approbation | TESTÉ EN ISOLATION | `native-mail-postgres.test.ts`, `native-mail-triage.test.ts`, `native-mail-monitor-postgres.test.ts`, tests signatures et recette mail | IMAP/SMTP simulés. Approbation exacte, concurrence, révocation, absence de double envoi et résultat incertain vérifiés ; aucune relève autonome activée |
| IONOS réel sur les cinq boîtes | NON CERTIFIÉ sur ce candidat | Historique et procédure de `docs/operational-recovery-20261027/report.md`, section D ; `docs/provider-readiness-20261025/provider-chains.md` | Rapprochement administratif des connexions/autorités et essai réel contrôlé restent soumis à GO. Leur absence de retest n'est pas une panne constatée |
| Hub Google et Agenda natifs | TESTÉ EN ISOLATION | `google-native-hub.test.ts`, `native-google-work-postgres.test.ts`, `operational-recovery-postgres.test.ts` | Autorité, connexion/ressource explicites, propositions, confirmations, reçus, refus et reprise ; Google simulé |
| Google Drive/Agenda réels | NON CERTIFIÉ sur ce candidat | Fonctionnement historique confirmé par propriétaire et conservé dans `docs/provider-readiness-20261025/provider-chains.md` | Pas de nouveau consentement présumé nécessaire. Réception authentifiée du candidat et code d'erreur non sensible si refus |
| GlassPanels, raccourcis, accès Documents et Clara | TESTÉ EN ISOLATION | Recette documentaire corrigée et preuves ce51 `historical-production-cockpit-browser.e2e.mjs`, 5 langues × 3 formats | Acquis visuels réutilisés ; aucun nouveau tour de captures ou nouveau design |
| Sessions, isolation, révocation, concurrence et reçus | TESTÉ EN ISOLATION | `native-authority*.test.ts`, `native-conversation-postgres.test.ts`, recettes navigateur | PostgreSQL jetable ; refus sans session, sessions expirées/révoquées, interprojets, rejeux et acquittements perdus |
| Contrats OS ↔ Live | TESTÉ EN ISOLATION côté OS | `canonical-conversation-postgres.test.ts`, `canonical-conversation-routes.test.ts`, `live-callback-transport.test.ts` | Sous-test bilatéral PostgreSQL+Mongo ignoré faute de runtime Mongo dans cette exécution ; aucune nouvelle certification du pont déployé |
| Make/Brevo depuis les routes natives | BLOQUÉ intentionnellement sur les routes protégées non certifiées | `src/lib/native/authority.ts::nativeOperationFence`, routes `api/connections/make/*`, `api/connections/brevo/*`, `native-authority.test.ts` | Barrière existante conservée, pas une régression du correctif ; adaptateurs historiques non reconstruits ni activés |
| Voix native | BLOQUÉ volontairement | Composant natif désactivé inchangé ; `voice-route-security.test.ts`, preuves ce51 | Reste hors périmètre activé jusqu'à certification ; les acquis téléphoniques historiques ne sont pas invalidés |

## Résultats et décision

**105 tests réussis, 0 échec, 1 non exécuté (bilatéral Mongo), et 6 recettes navigateur HTTPS réussies, 0 échec.** Voir `validation.txt` pour les résultats exécutés et les limites. Les preuves historiques sont réutilisées à leur SHA, sans être recomptées comme nouvelles recettes. Le build optimisé Webpack et les 15 vues de ce51 restent applicables : l'arbre applicatif de ce correctif est strictement identique. TypeScript et lint du test sont contrôlés de nouveau.

Les seuls points de livraison à lever sont : CI distante du SHA publié effectivement verte, autorisation du propriétaire pour la prochaine étape, puis réception authentifiée ciblée des fournisseurs et bindings réellement activés. Cette exécution n'établit ni qu'une migration manque en Production, ni qu'une connexion fournisseur est défaillante. Aucun contrôle de schéma distant ni migration n'est effectué.

Pas de P0 logiciel nouveau démontré dans les parcours testés. Les fonctions volontairement fermées ne doivent pas être présentées comme utilisables. GO technique en isolation sur les parcours exécutés ; NO-GO pour une certification Production automatique. Aucun merge, déploiement, envoi, appel fournisseur ou écriture distante exécuté.
