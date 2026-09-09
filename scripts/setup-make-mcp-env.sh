#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env.local"

if git ls-files --error-unmatch "$ENV_FILE" >/dev/null 2>&1; then
  echo "ERROR: $ENV_FILE is tracked by Git. Refusing to write secrets." >&2
  exit 1
fi

if ! git check-ignore -q "$ENV_FILE"; then
  echo "ERROR: $ENV_FILE is not ignored by Git. Refusing to write secrets." >&2
  exit 1
fi

read -r -p "Make MCP server URL (use the /stateless endpoint): " MAKE_MCP_SERVER_URL
read -r -s -p "Make MCP bearer key: " MAKE_MCP_BEARER_TOKEN
printf '\n'

if [[ -z "$MAKE_MCP_SERVER_URL" || -z "$MAKE_MCP_BEARER_TOKEN" ]]; then
  echo "ERROR: URL and bearer key are required." >&2
  exit 1
fi

if [[ "$MAKE_MCP_SERVER_URL" != https://* ]]; then
  echo "ERROR: Make MCP server URL must use HTTPS." >&2
  exit 1
fi

cat > "$ENV_FILE" <<EOF
# Clara OS local Make MCP test configuration.
# Never commit this file or paste these secrets into source code.
MAKE_MCP_SERVER_URL=$MAKE_MCP_SERVER_URL
MAKE_MCP_BEARER_TOKEN=$MAKE_MCP_BEARER_TOKEN
EOF

chmod 600 "$ENV_FILE" 2>/dev/null || true

echo "Created $ENV_FILE safely (ignored by Git)."
echo "Restart the Clara OS dev server after changing environment variables."
