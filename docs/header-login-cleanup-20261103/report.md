# Nettoyage des bandeaux et entrée Google

Base exacte : `073d04aaedc368d8fe59a7635354798f80eeac37`. Branche dédiée : `fix/header-login-cleanup-20261103`. Cible de PR : `delivery/clara-os-v1-20261025`.

## Correctif

- `MainLayout.tsx` injectait `NativeScopeSelector` sous le header, sauf sur le Cockpit. Cette injection est retirée sur toutes les pages.
- Le libellé « Espace de travail » existant dans le pied de la Sidebar devient la commande d'ouverture d'une fenêtre native `<dialog>`. `NativeContextMenu.tsx` y monte le **même** `NativeScopeSelector`, uniquement sur demande. Les sélections, commandes, routes et contrôles d'autorité sont inchangés. Échap, clic extérieur, bouton Fermer, focus et clavier mobile sont pris en charge ; la Sidebar cède la gestion du clavier à la fenêtre ouverte.
- Sur cette base, il n'existe pas de page `/login` : l'entrée sans contexte autorisé est le rendu de `nativePageFence()`. Seul son habillage change : logo officiel `/brand/clara-os-symbol.svg`, bleu nuit/cyan, carte responsive et quatre textes traduits en FR/EN/ES/DE/IT. Le lien reste `/api/auth/google/start`. Un utilisateur déjà connecté peut choisir son contexte par la commande Sidebar, sans nouvelle connexion imposée.
- `vercel.json` ajoute uniquement l'exclusion de déploiement automatique de cette branche. Les crons et toutes les autres protections sont conservés. Référence historique : `docs/delivery-v1-20261025/publication-protection-evidence.md`. Aucun workflow déclenché ni configuration distante modifiée.

`NativeScopeSelector`, Header, menu de compte, Cockpit/Hero/GlassPanels, vocal, Brain, routes OAuth, cookies, sessions, ACL et bases Production ne sont pas modifiés. Aucun élément de la branche vocale locale A+B n'est repris.

## Comparaison visuelle

Captures prises sur le runtime Next optimisé avec PostgreSQL local jetable et données fictives. Le socle avant correction a le même arbre Git que la Production de référence. Aucune donnée Production utilisée.

| Vue | Avant | Après |
|---|---|---|
| Entrée ordinateur | [Capture](captures/login-desktop-before.png) | [Capture](captures/login-desktop-fr-after.png) |
| Entrée mobile | [Capture](captures/login-mobile-before.png) | [Capture](captures/login-mobile-fr-after.png) |
| Missions ordinateur | [Capture](captures/missions-desktop-before.png) | [Capture](captures/missions-desktop-after.png) |
| Missions mobile | [Capture](captures/missions-mobile-before.png) | [Capture](captures/missions-mobile-after.png) |

La sélection existante reste accessible : [ordinateur](captures/context-desktop-after.png), [mobile](captures/context-mobile-after.png). Le dossier contient également les 13 pages après correction et les entrées dans les cinq langues. [Matrice des 130 rendus vérifiés](captures/matrix.json).

## Validation et limites

Les tests navigateur historiques utilisant l'ancien bandeau sont adaptés pour ouvrir explicitement la commande Espace de travail. Leurs assertions métier et de sécurité sont conservées ; les nouvelles assertions exigent l'absence de sélecteur automatiquement monté sur toutes les pages. La nouvelle recette est importée par le point d'entrée CI navigateur existant `operational-delivery-browser.e2e.mjs`, sans nouveau workflow.

La validation Google locale couvre les primitives canoniques d'identité, appartenance, expiration, révocation et nonce à usage unique. Elle ne certifie **pas** une authentification réelle chez Google. Aucun cookie, secret ou paramètre OAuth Production n'est utilisé ou modifié. Le bouton conserve sa destination existante ; une connexion Google réelle reste à réceptionner après un déploiement explicitement autorisé.

Résultats chiffrés et commandes : voir `results.txt` à la clôture. Le build Webpack optimisé utilise la fixture de polices locale préexistante ; il ne contacte pas Google Fonts. L'avertissement lint sur l'image historique de Sidebar est préexistant.

GO technique isolé uniquement après succès des contrôles consignés. Validation graphique propriétaire et connexion Google réelle restent distinctes. Aucun merge, migration ou déploiement autorisé/exécuté.
