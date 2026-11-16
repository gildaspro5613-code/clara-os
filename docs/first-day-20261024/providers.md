# Fournisseurs — niveau de preuve exact

| Fournisseur | Existant préservé | Preuve de ce lot | Première journée isolée | Reste à autoriser/certifier |
|---|---|---|---|---|
| IONOS | Cinq boîtes existantes, CredentialStore, ACL, messages chiffrés/pagination, approbations et relève opt-in | Vrais services/SQL, faux transport ; approbation exacte et compteur SMTP zéro dans le parcours guidé. Les essais concurrents d’envoi du groupe PostgreSQL utilisent uniquement SimulatedMail. | Message fictif → contact/mission explicites → brouillon → version figée → approbation → Journal/Cockpit. Aucun SMTP réel. | Source V1 absente ; langues/sujets financiers et antifraude complets non reçus. Avis nodemailer à traiter avant SMTP réel. Réception réelle propriétaire séparée. |
| Make/Brevo | Scénarios propriétaire 7294540 et 7291299, connexion MelodieDigital_Brevo déclarée OK ; connecteurs non reconstruits | Erreurs explicites et ack neutre testés ; routes natives fermées. Aucun contact/notification réel. | Reportés. Contacts et missions OS continuent sans Make. | Mapping réel workspace/email/source et message/recipient/priority/missionId ; retours contactId/messageId ; reçus métier durables/dédoublonnage et circuit commercial. Ne pas utiliser Notify Team comme envoi IONOS alternatif. |
| Google Workspace / Drive / Agenda | Connexion et parcours fonctionnels déclarés par le propriétaire, aucune demande de reconfiguration | Preuves Google/Drive/Agenda historiques sous transport simulé ; nouvelle consultation Agenda dans le même parcours documentaire/mission. OAuth de connexion testé avec clés synthétiques dans le parcours existant, pas login propriétaire réel. | Autorités, ressource explicite et consultation ; sources conservées. | Certification réelle du candidat/version et runtime sous autorisation, sans réinitialiser les consentements existants. |
| OpenAI | Runtime/Brain/compositeur existants | Réponses déterministes, traçage du contexte et des sources ; pas certification sémantique réelle. | Vérifier le raccord et l’isolation ; textes simulés explicitement identifiés. | Qualité, pertinence et erreurs sur service réel, limites/dépendances et autorisation distincte. |
| Twilio | Essais réels réussis déclarés par propriétaire | Contrats et barrières natifs préservés, aucun appel | Reporté, utiliser le dialogue écrit | Voix + contexte mission + reprise + Journal à prouver ensemble ; aucune rotation/configuration demandée sans anomalie. |
| ElevenLabs | Essais réels réussis déclarés par propriétaire | Pas de fournisseur/microphone réel testé | Reporté ; Hero natif indisponible | Même réserve de contextualisation ; aucune clé lue ou modifiée. |

Aucune de ces déclarations ne certifie une exécution réelle de ce candidat dans
Vercel/Neon. Ne pas copier les secrets de Recette vers Production. Les données
sources restent dans leur langue originale ; les textes UI nouveaux sont présents
et testés en FR/EN/ES/DE/IT. La détection/réponse sémantique multilingue des mails
réels n’est pas validée par des chaînes déterministes de test.
