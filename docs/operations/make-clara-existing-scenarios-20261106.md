# Réception Make — neuf scénarios CLARA existants (06/11/2026)

**Statut : audit READ des définitions Make ; aucun scénario exécuté dans cette recette.**
Les neuf scénarios sont actifs, tous déclenchés `on-demand` (StartSubscenario → service → ReturnData), selon le connecteur Make déjà autorisé dans l'environnement de réception. Les comptes fournisseurs Make sont signalés valides ; cela ne prouve **pas** une autorité d'exécution dans Clara OS.

| Clé proposée dans OS (jamais un droit implicite) | ID Make | Domaine | Effet | Entrées requises | Sorties |
| --- | ---: | --- | --- | --- | --- |
| `find-drive-document` | 7295042 | Drive | READ | workspaceId, query | status, provider, fileId, fileName, mimeType, webViewLink, modifiedTime |
| `check-calendar-availability` | 7295055 | Agenda | READ | workspaceId, start, end | status, provider, busyRanges, start, end |
| `search-calendar-events` | 7295113 | Agenda | READ | workspaceId, start, end | status, provider, eventId, eventTitle, start, end, location, htmlLink |
| `archive-document` | 7294781 | Drive | WRITE (création de fichier texte) | workspaceId, fileName, content | status, provider, fileId, fileName, webViewLink |
| `create-calendar-event` | 7294787 | Agenda | WRITE | workspaceId, title, start, end | status, provider, eventId, eventTitle, htmlLink, start, end |
| `create-drive-folder` | 7295842 | Drive | WRITE | workspaceId, folderName | status, provider, folderId, folderName, webViewLink |
| `move-drive-document` | 7300737 | Drive | WRITE | workspaceId, fileId, folderId | status, provider, fileId, fileName, folderId, webViewLink, modifiedTime |
| `sync-brevo-contact` | 7294540 | Brevo | WRITE (création de contact) | workspaceId, email | status, provider, contactId |
| `notify-team` | 7291299 | Brevo | SEND (email) | workspaceId, message, recipient, priority | status, provider, messageId |

Certains scénarios acceptent aussi un `missionId` optionnel (sauf Sync Brevo Contact), et Search Calendar Events accepte `query` optionnel. `Sync Brevo Contact` accepte `source` optionnel.

## Règles de raccordement

- Le **Brain** décide de la capacité métier ; l'Autonomy Gate décide de la permission. Make n'est qu'un transport lorsqu'un chemin natif plus direct n'est pas approprié.
- Les clés proposées ci-dessus sont des **noms de mapping documentaires**, non des identifiants déjà provisionnés : aucune connexion Make ni scope `make:scenario:...` n'est encore enregistré dans la base Production vérifiée.
- PR #249 : support du transport API v2 conservant le transport webhook historique. Un scénario API ne peut être appelé que si l'identifiant numérique provient des credentials chiffrés d'une connexion Make active ; une entrée de chat ne peut pas injecter arbitrairement l'ID.
- Pour une première recette native : **seulement les trois READ**, et uniquement après autorisation de la connexion, du scénario et du périmètre de projet. La présence d'un `workspaceId` dans les entrées Make ne constitue jamais une preuve d'autorisation.
- Les six scénarios WRITE/SEND sont **NO-GO** tant que leur permission, validation explicite, journal durable, reprise/idempotence et révocation ne sont pas certifiées dans Clara OS. Le mot `archive-document` ne signifie pas déplacement : le scénario crée un fichier texte.
- Les sorties externes sont des **données non fiables** ; un `status:1` Make est une preuve technique de fin d'exécution, pas une approbation métier. Toute réponse `status:failed/error/rejected/cancelled` refuse le succès. Un timeout ou refus HTTP après un POST a une issue inconnue : aucune nouvelle tentative automatique.
- Aucun changement aux neuf scénarios Make. Aucun ajout de connexion, secret, migration SQL ou mise en Production dans cette PR.

## Séquence de recette avant mise en exploitation

1. Tests isolés du contrat API v2 + non-régression webhook.
2. Vérification de l'autorité native existante / droits scoped `make:scenario:<key>`, sans contourner `nativeOperationFence`.
3. Provisionnement ultérieur d'un credential Make serveur restreint aux trois READ et à un workspace explicitement certifié (pas de clé dans le chat).
4. Recette réelle authentifiée : lecture Drive sans résultat attendu, retour de données borné, journal durable, révocation avant/après et refus croisés. **Aucun scénario actif déclenché durant cette étape d'audit.**
