# Dépendances et réserves — pas de déclaration « audit propre »

Le lock et les SDK sont inchangés depuis `fff3fb2` : Next/eslint-config-next 16.4.3.
Le précédent audit conservé signale **7 paquets vulnérables, 4 hauts et 3 modérés**.
Aucune exclusion/override ni `npm audit fix --force`. Ce lot ne transforme pas
l’isolation par fixtures en remédiation des dépendances.

| Paquet installé | Chemin constaté avec npm ls --omit=dev | Impact / décision |
|---|---|---|
| axios 1.19.0 / follow-redirects 1.16.0 (hauts) | Twilio 6.1.0 | Gadgets de pollution de prototype, redirections/headers/DoS. Voix reportée J1, aucun transport réel. Pas de preuve générale d’inexploitabilité. Qualifier/corriger avant activation réelle concernée. |
| brace-expansion 2.1.4 (haut) | googleapis → gaxios → rimraf/glob/minimatch | DoS selon les motifs. Présence runtime dans l’arbre, pas une preuve que cette chaîne s’exécute sur une entrée utilisateur. Garder ouvert, pas déclarer « dev uniquement ». |
| zod 4.4.3 (haut) | OpenAI 7.3.0 | Épuisement mémoire sur collections contraintes trop grandes. Les tests utilisent un fournisseur borné simulé ; aucune certification du flux réel. |
| mailparser 3.9.39 / nodemailer 10.1.1 (modérés) | IONOS direct et transitif | Avis de parsing d’adresse, destinataire différent possible selon syntaxe : **bloquant avant activation SMTP réelle**, même avec approbation. Les tests d’enveloppe n’annulent pas ces avis. J1 isolé : adresses `.invalid`, transport injecté, réseau IONOS désactivé, zéro envoi. |
| qs 6.15.3 (modéré) | Google et Twilio | DoS/parsing ; limites des entrées applicatives ne constituent pas une preuve globale d’absence d’exposition. |

Avis, plages et preuves : `../reception-v1-20261024/evidence/npm-audit-final.json`.
Arbre installé : `evidence/dependency-runtime-tree.json`. Aucun appel fournisseur
ou nouvelle requête d’audit réseau pour répéter le même constat inchangé.

Le lint global historique conserve 9 erreurs et 9 avertissements, sources
comparées à la base dans le dossier précédent. Le lint des fichiers de ce lot est
exécuté. Vitest global n’est pas déclaré vert : ses échecs historiques restent des
réserves distinctes. Les épisodes HTTP 503 anciens restent non attribués ; le
proxy local corrigé n’est pas une preuve rétroactive sur tous les épisodes.
