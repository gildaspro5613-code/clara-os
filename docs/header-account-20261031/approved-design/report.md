# PR #222 — Application de la présentation validée

Base fonctionnelle : `74db628fa35ec3c002c37cd1e8a75753c87bf72a`. Même branche `fix/header-account-menu-20261031`.

Le seul composant applicatif modifié est `UserAccountMenu.tsx`. Header, avatar, Hero, Sidebar, GlassPanels, runtime, session, ACL, déconnexion, action serveur de profil et routes sont inchangés.

## Comparaison à la spécification propriétaire

| Élément demandé | Application |
|---|---|
| Mon espace / Mélodie Digital · Clara OS | En-tête dédié, traduit dans les cinq langues |
| Fond bleu nuit, accents cyan, coins arrondis | Fond #08111F, cartes #101E30 et bordures cyan discrètes |
| Mon profil — Compte utilisateur | Première entrée, déplie les informations authentifiées existantes |
| Préférences | Deuxième entrée, focus sur la langue existante, aucune personnalisation inventée |
| Connexions — Services autorisés | Troisième entrée, lien vers /connexions existante |
| Se déconnecter | Dernière entrée séparée, confirmation et POST natifs inchangés |
| Icônes cyan et chevrons | Présents sur les quatre entrées |
| Aucun changement du Header hors menu | Header.tsx identique à la référence ; avatar 40×40 et position vérifiés |

Captures réelles : `screens/desktop-open.png`, `screens/tablet-open.png`, `screens/mobile-open.png`. Elles représentent l'application optimisée dans un navigateur HTTPS et des identités fictives de test. Aucun fournisseur réel n'est sollicité. Les anciennes captures restent conservées au dossier parent.

## Réception

Tests existants de profil et sécurité PostgreSQL réel jetable ; recette navigateur dans les cinq langues et trois formats. Les quatre actions sont vérifiées, notamment l'accès réel à la page Connexions existante, le clavier, Échap, clic extérieur, le focus vers la préférence et la déconnexion avec révocation et refus des accès suivants.

Le contrôle de stabilité du Header exclut les descendants du menu : le nouveau lien Connexions doit naturellement devenir visible lors de son ouverture. Tous les autres liens, le sélecteur de langue et l'avatar conservent exactement leurs rectangles.

Aucun changement des mécanismes d'authentification ni des autorisations Google/Workspace. Aucun nouveau réglage, route, service ou page. TypeScript, lint ciblé et build Webpack avec fixture locale des polices ; résultats exacts dans results.txt.

La validation graphique finale appartient au propriétaire. Aucun merge ni déploiement.
