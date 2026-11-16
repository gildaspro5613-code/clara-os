# PR #223 — Finalisation du Header et préservation du Cockpit

Branche unique : `fix/historical-cockpit-restoration-20261031`. Base : `30d6ade57fde62f215a01494bd8a53beeb7546b8`. Aucun merge, migration ou déploiement.

## Synchronisation de #222

La branche distante `fix/header-account-menu-20261031` a été récupérée. Les six corrections `5038c090`, `ec0938ec`, `7e3a84e4`, `46579559`, `33f1180a`, `fb5b47a3` ont été reprises par cherry-pick, sans réécriture de l'historique. Les confirmations et erreurs de déconnexion utilisent désormais le catalogue `account` dans les cinq langues. `UserAccountMenu.tsx` est identique à la version distante corrigée : aucun changement graphique, de droits ou de mécanisme de déconnexion.

## Inventaire des capacités retrouvées avant raccordement

Historique Git et sources inspectés : ancien Header de `781976a3`, branche de livraison, PR #218/#220/#221/#222, recherches dans les chemins et l'historique versionnés. Les commits `94eb2ab3` et `1bc48182` contiennent une capacité Drive Search historique (`src/lib/capabilities/drive-search`), mais elle ne remplace pas les contrôles du parcours documentaire natif. Elle n'est pas rouverte globalement. L'ancien champ du Header n'avait pas de traitement de recherche ; sa version récente était un lien vers Documents.

| Catégorie | Lecture existante réutilisée | Périmètre réellement recherché / destination | Qualification |
|---|---|---|---|
| Missions | `nativeCommands(read)` / `withNativeScope`, même registre que `loadMissions` et `/api/native/runtime` | Titres et objectifs des missions autorisées du snapshot ; fiche MissionDetail existante | TESTÉ EN ISOLATION |
| Conversations | `ctx.session.conversation`, même source que Conversations ; pagination historique existante `/api/clara/conversation` | Contenu de la fenêtre du fil courant ; lien au message correspondant dans `/conversations` | TESTÉ EN ISOLATION ; pas de balayage inter-fils |
| Contacts | `ctx.intakes`, même vue canonique que `/api/contacts?q=...` | Noms et emails autorisés ; ancre vers la fiche du répertoire `/contacts` | TESTÉ EN ISOLATION |
| Documents | `/api/documents?query=...` → `selectedNativeDocuments().list` | Noms des fichiers explicitement autorisés et versionnés du projet ; téléchargement par le handler existant, droits revérifiés | TESTÉ EN ISOLATION avec Google simulé ; conditionné au choix/aux droits Google effectifs |
| Journal | `ctx.journal`, même source native que `getRuntime().getJournal` dans `/journal` | Résumés et détails de la fenêtre autorisée ; ancre vers l'entrée correspondante | TESTÉ EN ISOLATION |

Aucun index, base secondaire, cache global, moteur sémantique, connecteur ou parcours fournisseur n'est créé. `readNativeSearch` est une projection éphémère et bornée des vues natives déjà autorisées. La Server Action suit le mécanisme Next existant, reçoit uniquement le texte, résout les cookies côté serveur puis appelle `withNativeScope(..., false)`. Elle ne reçoit pas d'identité/workspace/projet arbitraire du navigateur et ne recourt à aucun magasin global en repli. Aucun endpoint `/api` supplémentaire.

Les résultats sont limités à huit éléments par catégorie et aux fenêtres natives disponibles. Recherche exhaustive de tous les fils, de tout l'historique et du corps complet des documents : NON DISPONIBLE dans ce panneau ; aucune capacité concurrente n'est ajoutée. Les cinq catégories disposent d'une lecture existante, mais leur disponibilité effective dépend de l'autorisation du contexte et, pour Documents, de la connexion sélectionnée et des droits Google. Un refus ou une indisponibilité ne devient jamais une liste vide.

## Fonctionnement et sécurité

Champ historique « Rechercher… », panneau bleu nuit/cyan réutilisant les styles des composants existants ; accès par icône sur mobile. ⌘K et Ctrl+K, Échap, clic extérieur, flèches/Haut/Bas/Home/End et liens natifs. Les ouvertures relisent les données ; réponses tardives ignorées, requêtes documentaires annulables, aucun résultat persistant conservé à la fermeture. Les états chargement/vide/indisponible/refusé sont traduits FR/EN/ES/DE/IT, sans codes techniques ni messages d'erreur bruts.

Les noms et contenus source ne sont pas traduits artificiellement. Les liens sont internes et construits à partir des identifiants autorisés ; les URL externes retournées par le fournisseur ne sont pas utilisées. Les pages de destination conservent leur garde natif et le téléchargement revérifie les droits documentaires. L'ouverture d'une fiche Mission reste une sélection locale de lecture, pas une mutation du rattachement durable du fil.

Les seules adaptations des pages sont des ancres sur les contacts/messages/entrées du Journal et la sélection de MissionDetail depuis un fragment appartenant aux missions déjà autorisées. Aucun chargement global, droit nouveau, nouvel écran ou moteur de navigation.

## Cockpit préservé

Aucun changement depuis 30d6ade5 dans `src/components/cockpit`, les moteurs Brain, la consultation/finalisation des missions #221 ou les API. Le Header conserve son Journal, son avatar, sa langue et son menu #222 ; seul l'emplacement de recherche est remplacé. Le test structurel compare le JSX du Header en excluant uniquement les deux emplacements explicitement approuvés (compte et recherche).

- Aucun bandeau technique ni enveloppe dans le Cockpit.
- MailOverviewPanel reste dans le Hero.
- Aucun AgendaPanel dans le Hero ; accès Agenda existants préservés.
- Aucune barre de raccourcis sous le Hero.
- Dialogue, GlassPanels et autorités inchangés.

Comparaison complète : [desktop avant](../cockpit-compliance-223/after/fr-desktop.png) / [après](cockpit-after/fr-desktop.png), [tablette avant](../cockpit-compliance-223/after/fr-tablet.png) / [après](cockpit-after/fr-tablet.png), [mobile avant](../cockpit-compliance-223/after/fr-mobile.png) / [après](cockpit-after/fr-mobile.png). Les données fictives des campagnes diffèrent ; la comparaison porte sur la composition, pas sur l'identité des contenus des missions de fixture.

Recherche ouverte : [desktop](screens/desktop-open.png), [tablette](screens/tablet-open.png), [mobile](screens/mobile-open.png). Captures réelles Chromium HTTPS de l'application optimisée. Menu synchronisé : captures dans `account/`. Validation graphique finale réservée au propriétaire.

## Validation

- 26 tests ciblés PASS, aucun ignoré : lecture PostgreSQL réelle, isolation propriétaire/projet/client, sessions expirées/révoquées, erreurs non sensibles, absence de modification des missions/sessions/Journal par la recherche, conservation des verrous de révocation concurrente #221, profil et traductions.
- Six recettes navigateur PASS : recherche, menu utilisateur, navigation/reprise du Cockpit, composition historique, parcours documentaire natif et contrôle des 13 pages du layout partagé.
- Recherche : cinq langues × trois formats, cinq destinations réellement ouvertes, PDF téléchargé via les droits existants, raccourcis, clavier, fermeture, chargement/vide/indisponibilité documentaire, panne de transport et refus d'un autre utilisateur.
- Menu : cinq langues × trois formats, quatre entrées, préférences de langue, vrai logout natif PostgreSQL et refus après déconnexion. Une autre session synthétique préexistante du même acteur est utilisée pour isoler les recettes suivantes ; aucune session révoquée n'est réactivée.
- TypeScript, lint ciblé et build Webpack PASS (fixture locale des polices) ; YAML et shell du workflow vérifiés.

Les tests antérieurs qui sélectionnaient globalement n'importe quel champ placeholder ou attendaient l'ancien lien du Header ont été ciblés sur leur vrai formulaire, ou adaptés au panneau attendu. Le test documentaire utilise la Sidebar conservée plutôt que la barre de raccourcis supprimée. Aucun contrôle de permission n'est affaibli. Les tests attendent une interaction hydratée avant de vérifier les raccourcis globaux.

PostgreSQL et runtime/services applicatifs réels en bases jetables ; génération et fournisseur Google simulés. Aucun fournisseur réel ni Production certifié. Résultats exacts dans `results.txt`. Les CI distantes sont à distinguer des vérifications locales.

## Fichiers concernés

- Menu et cinq catalogues : correctifs #222 repris, puis traductions `headerSearch` ajoutées sans modifier les autres namespaces.
- `src/components/layout/Header.tsx`, `HeaderSearch.tsx` : champ et panneau dans le Header existant.
- `src/app/actions/header-search.ts`, `src/lib/native/search-view.ts` : projection de lecture native, aucun stockage nouveau.
- `src/app/conversations/page.tsx`, `src/components/contacts/ContactsDirectory.tsx`, `src/modules/journal/JournalStage.tsx`, `src/modules/missions/MissionsStage.tsx` : destinations précises uniquement, sans changement graphique.
- Tests ciblés Header/recherche/compte/navigation/documentaire et `.github/workflows/native-authority-validation.yml` : intégration aux contrôles existants, aucun workflow de déploiement modifié.
- Ce dossier : preuves et résultats.

GO technique isolé ; pas de GO de merge, migration, déploiement ou activation fournisseur. Les réserves Production historiques ne sont pas levées par cette recette.
