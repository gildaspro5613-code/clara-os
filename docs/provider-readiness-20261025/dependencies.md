# Dépendances : correction bornée, pas de certification globale implicite

Le lock livré à b40386f conservait sept paquets runtime signalés. La lecture des
avis officiels Nodemailer confirme un risque de parsing du destinataire, pertinent
avant réception SMTP. Mailparser 3.9.39 épinglait lui-même Nodemailer 10.1.1 : mettre
à jour uniquement la dépendance directe n’aurait pas suffi.

- Nodemailer 10.1.4 et Mailparser 3.9.43 sont épinglés : premières versions retenues
  corrigeant ce chemin, sans passer à une nouvelle version majeure.
- Les autres changements ciblent les paquets signalés dans leurs contraintes
  existantes : axios, follow-redirects, qs, zod, brace-expansion. Aucun override,
  suppression d’avis ou `audit fix --force`. Les sous-dépendances MIME nécessaires
  et variantes brace-expansion sont listées dans `evidence/dependency-delta.json`.
- `npm ci` réussit ; versions installées = lock. SDK Google/Twilio/OpenAI/ElevenLabs,
  React et Next ne sont pas remplacés. Les avis et scans avant/après sont conservés.
- **Audit production (`--omit=dev`) : 7 → 0 vulnérabilité déclarée au contrôle.**
  Ce résultat n’atteste pas le fournisseur réel, ses credentials ou ses permissions.

L’**audit complet** conserve trois paquets dev signalés : js-yaml (haute), vitest et
@vitest/mocker (modérées). Les versions sont exactement celles de b40386f ; ce ne
sont pas des régressions introduites ici. js-yaml vient de l’outillage ESLint,
Vitest/mocker du runner dev. Les tests de ce lot emploient Node et n’exposent pas un
serveur Vitest ; aucune entrée YAML non fiable n’est traitée comme configuration.
Cela borne l’exposition de cette réception, sans déclarer ces avis inoffensifs dans
tous les usages. Pas de nouvelle campagne de migration de l’outillage dans ce lot.

Le lint global et les échecs Vitest historiques restent réservés ; le lint ciblé est
exécuté sans désactiver de règle. Les avertissements de peer dependency WASM et
paquets dépréciés de `npm ci` restent dans le journal, sans option legacy/force.
