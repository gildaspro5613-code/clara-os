# Make clone — single-use encrypted credential provisioning

**Only for the isolated Neon branch:** br-nameless-dew-b2v6asgj.
No Production, no Vercel Preview, no Make run, no direct grant to WRITE/SEND.

## Current state
- Vendor Make API has been verified by HTTP GET and a real READ Drive scenario.
- Clone connection make-read-fixture-249-20261106 has status RECONNECT_REQUIRED and no ciphertext.
- Dedicated LOGIN role clara_make_provisioner_login has no direct privileges on public.clara_connections or public.clara_connection_credentials.
- The SECURITY DEFINER function clara_make_runtime_scope.provision_make_read_ciphertext_once(text) allows a one-time insert of an AES-256-GCM envelope and sets the connection to CONFIGURED, never ACTIVE.
- Only find-drive-document (7295042) is configured. Provisioning does not grant execution.

## Prerequisites: use Codespaces secrets and the password manager
1. In Neon Console select project fragrant-dream-31652403, branch test/make-native-authority-249-20261106, database neondb, and **role clara_make_provisioner_login**. Obtain its **direct** connection URI (not neondb_owner), with sslmode=require, and place it into a Codespaces secret named CLARA_MAKE_CLONE_PROVISIONER_URL. If the limited role's password is unavailable, reset **only that role's password** in the Neon Console. Never paste or commit the URI.
2. Generate a distinct base64 32-byte encryption key using `openssl rand -base64 32`. Store it in the password manager and in a Codespaces secret named CLARA_MAKE_CLONE_ENCRYPTION_KEY. Do **not** reuse the existing CLARA_CREDENTIALS_ENCRYPTION_KEY.
3. Rebuild/restart the Codespace session if needed for newly added Codespaces secrets. Do not set DATABASE_URL or POSTGRES_URL. Never remove Recette markers to bypass the block.

If Codespaces is on the delivery branch, check `git status --porcelain` before switching. If there are no local changes:
`git fetch origin ops/make-clone-credential-preflight-20261114`
`git switch --track origin/ops/make-clone-credential-preflight-20261114`

An independent clean worktree also works. **Do not merge** into delivery.

## Safe local check — no Make token needed
`node --test src/scripts/provision-make-clone-credential.test.mjs`
`node src/scripts/provision-make-clone-credential.mjs --check`

The --check mode verifies the exact Neon host, role, database and minimal SQL privileges. It does not read or write secrets or run Make.

## Provisioning — only after successful check and explicit permission
In an interactive Codespaces terminal:
`read -r -s -p "Jeton Make : " CLARA_MAKE_API_TOKEN; echo`
`export CLARA_MAKE_API_TOKEN`
`node src/scripts/provision-make-clone-credential.mjs --commit`
`unset CLARA_MAKE_API_TOKEN`

The script requests the explicit word CLONE before its only database write. Never disclose the token, key, ciphertext, database URL or unredacted driver errors in chat or CI.

**No automatic retry** on a timeout/unknown outcome. Verify clone metadata read-only before any further action. On confirmed success, connection is CONFIGURED, not ACTIVE; one ciphertext record exists; READ catalog still disabled; grants remain revoked.

## Independent prerequisites before Clara can call Make
- An authenticated Clara session bound to this exact clone.
- Correct runtime SQL/credential authority and access to the same clone encryption key, without broad table privileges.
- Explicit grant → READ → revoke review and audit.
- The existing Vercel Recette blocks external Make calls; do not disable its guard or use Production as a shortcut.

No merge, Ready, Production deployment or additional provider run without separate GO.
