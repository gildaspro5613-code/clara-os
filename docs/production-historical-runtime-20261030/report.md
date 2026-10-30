# Cockpit historique raccordé au runtime de livraison

Préparation Production uniquement — aucun merge, déploiement ou accès modifiable distant.

## Provenance et périmètre

- Référence visuelle main : `a4d865a3d4a307425c057e69ea2132c9e0361f00`.
- Base runtime et cible de PR : `delivery/clara-os-v1-20261025`, `adff3190863a9af07645091b740c2dffe202337d`.
- Branche distincte : `delivery/clara-os-historical-runtime-20261030`.
- #219 est uniquement une référence de diagnostic ; aucun merge/cherry-pick global, aucune invitation Google ou logique d’accueil Recette reprise.

La base de PR est la branche de livraison pour que le diff reste limité au raccord UI.
Partir de main pour écraser les fichiers du runtime réintroduirait des versions
anciennes des contrats et protections. Le socle main fournit l’image et la composition,
la livraison fournit les fonctions et autorités déjà consolidées.

## Raccord effectué

| Élément | Présentation retenue | Données / comportement |
|---|---|---|
| Hero | Image originale main, aucune régénération | Asset déjà présent et inchangé |
| Stage | Brief gauche, Tasks droite, voix bas-centre | Session native résolue par le HomePage existant |
| Brief | GlassPanel original de main | Identité et mission réelles du runtime, sources et historique préservés |
| Tasks | GlassPanel original de main, titre lié à Missions | Titre, objectif, progression et prochaine action de la mission ; vide explicite sinon |
| Raccourcis | Barre historique réutilisée | Six liens internes réels, aucun bouton décoratif ni mutation à la navigation |
| Widgets | Grille existante de livraison conservée | Conversations, missions, documents via leurs pages existantes, Journal, Agenda et capacités disponibles |
| Messagerie | Panneau existant déplacé sous le Hero | Même lecture native et mêmes autorités ; aucun SMTP activé |
| Widget vocal | Widget Clara existant, visible | Désactivé avec motif dans le contexte natif non certifié ; aucun microphone/fournisseur sollicité |
| Dialogue textuel | ClaraChatWidget existant | Certification du fil, autorisations, reçus et reprise inchangés |
| Sidebar / Header | Navigation et styles de livraison conservés | Liens, responsive et sélecteur natif opérationnels ; pas de retour aux contrôles inactifs de main |

Le composant GlassPanel est repris à l’identique de main (aucune variante graphique ajoutée).

Image originale : SHA-256 `fe59fdafc4917558cc01bb7a7f9890a52d7438e33f5533880801b6c916d1ef18`,
identique entre main et la branche préparée (`public/cockpit/cockpit-hero-final.png`).
Les panneaux sont en flux sur mobile/tablette, plutôt qu’aux positions absolues
historiques qui superposeraient les contenus longs/traduits. Sur desktop, les
ancrages historiques sont conservés avec défilement des panneaux longs.
La progression fictive 82 %, le prénom fixe et la mission de démonstration de
main ne sont pas réintroduits. Les données métier conservent leur langue source.

## Protections et conservation

Aucun fichier de `src/lib`, `src/app/api`, `src/app/page.tsx` ou `db/migrations`
n’est modifié. HomePage → nativePage → contexte autorisé reste le même chemin.
Sans sélection complète ou sans autorité valide, le garde reste fermé et le
sélecteur existant permet de choisir un contexte autorisé ; aucun nouvel accueil
ni client/projet/session fictif n’est ajouté au produit.
Les tests utilisent uniquement PostgreSQL jetable et fournisseurs simulés.
La séparation consultation/commande, les approvals IONOS et les connexions Google
restent les implémentations de livraison ; aucun nouveau droit ou adaptateur.

## Preuves

- `visual/` : captures FR/EN/ES/DE/IT, desktop/tablette/mobile, depuis le build optimisé et une mission synthétique réellement persistée par l’API native.
- Les captures FR supplémentaires montrent le widget vocal du Hero et la grille de widgets.
- Tests composants : données réelles d’une mission contrôlée, absence de la fixture 82 %, voix native désactivée dans cinq langues, six liens réels.
- Test historique HTTPS : mission via API, portrait, rendu, navigation, accès inter-utilisateur refusé, reprise et absence de deuxième mission créée par navigation.
- Recette Cockpit existante : navigation, restrictions fournisseurs, dialogue, perte d’acquittement et reprise durable.
- Tests d’autorité et récupération existants : PostgreSQL réel jetable, droits et consultation sans mutation.

Le premier ciblage de mission dans la nouvelle recette atteignait une copie
desktop masquée en format tablette ; le ciblage visible est désormais explicite.
Une erreur HTTPS loopback après des navigations répétées a motivé des contextes
navigateur indépendants par capture, avec le certificat local épinglé, sans retry
réseau ni changement applicatif. Les captures attendent aussi la fin du chargement
du sélecteur natif et des polices pour ne pas photographier l’état intermédiaire.

Le build local optimisé utilise Webpack et la fixture de polices déjà utilisée
pour les réceptions isolées ; aucun script de build ni font applicative n’est
modifié. Les CI distantes restent une preuve distincte à consulter après publication.

## Qualification et limites

Le raccord UI ne certifie pas les fournisseurs réels. Google/Drive/Agenda, IONOS,
Make/Brevo et les contrats OS ↔ Live restent ceux de la livraison, sans
reconfiguration ; leur réception réelle ne peut pas être déduite des fixtures.
La voix native contextualisée reste bloquée comme avant : restaurer son aspect
ne fournit ni délégation ni certification manquante. Aucun transport historique
non certifié n’est activé pour afficher un faux succès.

Avant toute bascule : approbation du candidat exact et de sa réception visuelle,
confirmation du SHA actuellement servi et des bindings Production, vérification
uniquement du delta SQL indispensable sur la base réelle, récupération et retour
arrière approuvés. Aucune migration proposée par ce raccord UI.

Publication : preuves anti-déploiement historiques `docs/delivery-v1-20261025/publication-protection-evidence.md`
réutilisées pour la nouvelle branche delivery, sans changement Vercel. Les workflows
versionnés de déploiement restent manuels et ne sont pas lancés.


## Résultat exécuté

- Autorités natives et récupération opérationnelle : 26 PASS, 0 FAIL, 0 SKIP.
- Composants historiques : 3 PASS, 0 FAIL, 0 SKIP.
- Nouvelle recette HTTPS avec PostgreSQL réel jetable : 1 PASS (15 combinaisons).
- Recette Cockpit existante : 1 PASS (navigation, refus fournisseurs, dialogue et reprise).
- TypeScript, lint ciblé, build optimisé Webpack, YAML/shell : PASS.
- 21 captures PNG ; FR desktop/tablette/mobile examinés visuellement.
- Preuves de commande et résultats : validation.txt. Aucun fournisseur réel.

Décision locale : GO préparation de livraison et réception visuelle propriétaire.
NO-GO déploiement Production sans approbation et vérification ciblée du déploiement
réel/bindings/récupération. Aucun blocage logiciel reproduit sur le raccord testé.
Restent distincts : certification voix native et essais fournisseurs autorisés,
qui ne sont ni activés ni déclarés réussis par les fixtures.
