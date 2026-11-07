# Messagerie — réception visuelle du 4 novembre 2026

Base : `c68683f257d0d2cbacae8e1321d99898164af34d`, branche de livraison, incluant #236 (brouillon sans mission). Branche corrective : `fix/mail-visual-finalization-20261104`.

## Correctif limité à la présentation

- `NativeMailPanel.tsx` et `native-mail-presentation.css` : réutilisation du panneau natif bleu nuit/cyan, titres Messages / Brouillon / Validation, champs alignés en pleine largeur, réponse haute et redimensionnable, lecture et listes avec défilement cyan. CSS limité à la Messagerie. Header, Sidebar et Cockpit inchangés.
- `mail-signature-presentation.ts` : séparation visuelle du message et de sa signature éditable. Les délimiteurs du format existant sont conservés en mémoire et reconstruits à l’identique avant le même appel d’enregistrement. La relecture présente le même texte sans ces délimiteurs ; aucun HTML de courrier n’est interprété. Un contenu ambigu ou incomplet n’est jamais tronqué.
- Les cinq dictionnaires existants reçoivent cinq libellés de présentation.
- Dossiers/synchronisation, provisionnement existant, gestion du message et autorités restent accessibles et repliés par défaut. Aucun appel de synchronisation ou d’envoi automatique.
- `vercel.json` : seule la branche corrective est explicitement exclue des déploiements Git. Aucun réglage distant ni workflow modifié.

Les requêtes, actions, paramètres, contrôles de propriétaire, chiffrement, jetons d’approbation et routes existants sont conservés. Aucun fichier backend, contrat d’autorité, migration ou credential modifié. La liste des connexions réellement autorisées reste la seule source des boîtes affichées : aucune boîte fictive ajoutée au produit.

## Comparaison mesurée

| Format | Réponse avant | Réponse après |
|---|---:|---:|
| Desktop 1440 px | 204 × 61 px | 988 × 384 px |
| Tablette 820 px | 204 × 61 px | 671 × 384 px |
| Mobile 390 px | 227 × 67 px | 282 × 320 px |

Mesures issues du navigateur dans `captures/*-metrics.json`. L’étroitesse provenait des labels hérités en `inline-flex`, pas du moteur de brouillons.

| Référence | Avant | Après | Rédaction après |
|---|---|---|---|
| Desktop | [capture](captures/before-fr-desktop.png) | [capture](captures/after-fr-desktop.png) | [capture](captures/after-composer-fr-desktop.png) |
| Tablette | [capture](captures/before-fr-tablet.png) | [capture](captures/after-fr-tablet.png) | [capture](captures/after-composer-fr-tablet.png) |
| Mobile | [capture](captures/before-fr-mobile.png) | [capture](captures/after-fr-mobile.png) | [capture](captures/after-composer-fr-mobile.png) |

Les captures utilisent exclusivement des données fictives et un compte local de test. Le layout possède une zone de défilement interne : les captures de rédaction complètent celles de l’ouverture. La lecture du message est aussi capturée séparément. 48 captures : FR/EN/ES/DE/IT × trois formats contrôlés, avec vues de rédaction et de lecture.

## Validation

- 30 tests ciblés de présentation, signatures, langues, multipart et tri : PASS.
- TypeScript, lint ciblé, build optimisé Webpack : PASS. Polices Geist locales fournies au mécanisme de fixture existant ; aucun contrôle TLS désactivé.
- Recette navigateur avant : PASS ; recette visuelle après : PASS. PostgreSQL réel, routes natives et chiffrement réels ; IMAP et génération du brouillon simulés. Corps enregistré avant/après strictement identique, paramètres fermés, zone de réponse élargie, scrollbars fines, absence de débordement horizontal et d’erreur JavaScript vérifiées.
- Recette historique `native-mail-browser.e2e.mjs` : PASS. Préparation, sauvegarde, reprise après rechargement et nouvelle authentification, soumission, relecture, approbation propriétaire, envoi simulé unique, délégation limitée, résultat incertain sans renvoi automatique et refus sans session conservés. Seuls l’ouverture explicite des paramètres repliés et les assertions de représentation de signature sont adaptés.
- Sécurité PostgreSQL complémentaire : 3 tests PASS, incluant autorités indépendantes, refus interprojets, révocation, approbations exactes et envoi simulé concurrent à usage unique.

### Réserve préexistante, reproduite sur la base exacte

`native-mail-signature-native-integration.test.ts`, test « durable draft still encrypts content and increments revision » : l’assertion source attend encore `revision:(mission.emailDraft?.revision??0)+1`. Depuis #236, le code distingue révision de mission et révision de brouillon autonome. Même échec sur la base et sur le correctif (3/4 PASS dans ce fichier). Aucun backend ni assertion de sécurité modifié pour masquer cet échec. Les recettes PostgreSQL/navigateur contrôlent la sauvegarde et la reprise réelles. Cette réserve statique n’est pas présentée comme un succès.

## Limites et décision

GO pour réception visuelle isolée du correctif, sous validation du propriétaire. Aucun essai fournisseur réel : ces tests ne certifient ni les cinq connexions IONOS Production, ni IMAP/SMTP réels. Leur configuration est préservée par absence de modification ; aucune lecture de credential Production effectuée. Merge et déploiement restent interdits sans GO distinct. CI distante et création effective de PR à confirmer séparément via GitHub.
