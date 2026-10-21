#!/usr/bin/env bash
# Clara OS PR #176 — exécution future uniquement après GO distinct.
set -Eeuo pipefail
umask 077
: "${NEON_TEST_URL:?Configurer NEON_TEST_URL dans Codespaces (secret, jamais dans le terminal/chat)}"
: "${RECIPE_SQL:?Chemin absolu du script SQL audité}"
[[ -f "$RECIPE_SQL" ]] || { echo 'STOP: script absent' >&2; exit 2; }
command -v psql >/dev/null || { echo 'STOP: psql absent' >&2; exit 2; }
# Exiger une connexion non-poolée à l'endpoint explicite de la branche isolée.
python3 - <<'PY'
import os,sys,urllib.parse
u=urllib.parse.urlsplit(os.environ['NEON_TEST_URL'])
h=(u.hostname or '').lower()
if u.scheme not in ('postgresql','postgres') or h != 'ep-young-cake-b2ekuozh.c-6.eu-central-1.aws.neon.tech':
    sys.exit('STOP: hôte Neon inattendu (vérifier le hostname exact dans la console Neon)')
if u.path != '/neondb' or u.username != 'neondb_owner' or '-pooler' in h:
    sys.exit('STOP: base, rôle ou endpoint poolé inattendu')
q=urllib.parse.parse_qs(u.query)
if q.get('sslmode',[''])[0] not in ('require','verify-full'):
    sys.exit('STOP: sslmode=require ou verify-full obligatoire')
print('Cible SQL contrôlée : endpoint isolé, neondb, neondb_owner, TLS.')
PY
# Ce contrôle de l'URL n'atteste pas à lui seul l'ID de branche Neon.
# Confirmer manuellement dans la console Neon que cet endpoint appartient à
# br-autumn-heart-b2ei69zx avant d'utiliser ce lanceur.
if [[ "${CONFIRM_ISOLATED_BRANCH:-}" != 'br-autumn-heart-b2ei69zx' ]]; then
  echo 'STOP: confirmation explicite de la branche isolée absente' >&2; exit 2
fi
# Garde : aucun COMMIT exécutable ni inclusion d'autre fichier dans le script.
python3 - "$RECIPE_SQL" <<'PY'
import pathlib,sys,re
s=pathlib.Path(sys.argv[1]).read_text()
lines=[line.split('--',1)[0] for line in s.splitlines()]
code='\n'.join(lines)
if re.search(r'(?im)^\s*(?:COMMIT|END\s*TRANSACTION|\\i(?:nclude)?)\b',code):
    sys.exit('STOP: COMMIT ou inclusion interdits')
if len(re.findall(r'(?im)^\s*ROLLBACK\s*;',code))!=1:
    sys.exit('STOP: ROLLBACK unique obligatoire')
if len(re.findall(r'(?im)^\s*BEGIN\s*;',code))!=1:
    sys.exit('STOP: BEGIN unique obligatoire')
print('Garde statique minimal : BEGIN et ROLLBACK uniques, aucun COMMIT ni include.')
PY
# Pas de --single-transaction : le script gère BEGIN/ROLLBACK.
# -X ignore .psqlrc ; ON_ERROR_STOP provoque la fermeture de session sur erreur.
# En cas d'erreur, la fermeture de session annule la transaction non validée.
psql -X -v ON_ERROR_STOP=1 "$NEON_TEST_URL" -f "$RECIPE_SQL"
echo 'Session recette fermée. Vérification indépendante en nouvelle connexion.'
psql -X -v ON_ERROR_STOP=1 "$NEON_TEST_URL" <<'SQL'
DO $verify$
BEGIN
 IF EXISTS(SELECT 1 FROM public.clara_native_mail_authority)
 OR EXISTS(SELECT 1 FROM public.clara_native_mail_monitor_grants)
 OR EXISTS(SELECT 1 FROM public.clara_native_mail_messages)
 OR EXISTS(SELECT 1 FROM public.clara_native_mail_sync)
 OR EXISTS(SELECT 1 FROM public.clara_auth_users WHERE id LIKE 'recette176_l5_%')
 OR EXISTS(SELECT 1 FROM public.clara_auth_workspaces WHERE id LIKE 'recette176_l5_%')
 OR EXISTS(SELECT 1 FROM public.clara_auth_identities WHERE issuer='recette176' AND subject LIKE 'recette176_l5_%')
 OR EXISTS(SELECT 1 FROM public.clara_workspace_memberships WHERE user_id LIKE 'recette176_l5_%')
 OR EXISTS(SELECT 1 FROM public.clara_connections WHERE id LIKE 'recette176_l5_%')
 THEN RAISE EXCEPTION 'FAIL: données persistantes détectées après recette'; END IF;
 RAISE NOTICE 'PASS: aucune fixture persistante';
END $verify$;
SQL
