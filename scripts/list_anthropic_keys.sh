#!/usr/bin/env bash
set -euo pipefail

# List Anthropic organization API keys (non-secret metadata only).
# Usage:
#   scripts/list_anthropic_keys.sh -k YOUR_ORG_ADMIN_KEY
# or
#   export ANTHROPIC_ADMIN_KEY=YOUR_ORG_ADMIN_KEY
#   scripts/list_anthropic_keys.sh
#
# Requires: curl, jq

TOKEN="${ANTHROPIC_ADMIN_KEY:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -k|--key)
      if [[ $# -lt 2 ]]; then
        echo "ERROR: Missing value for $1" >&2
        exit 2
      fi
      TOKEN="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [-k|--key ANTHROPIC_ADMIN_KEY]"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Usage: $0 [-k|--key ANTHROPIC_ADMIN_KEY]"
      exit 2
      ;;
  esac
done

if [[ -z "${TOKEN:-}" ]]; then
  echo "ERROR: Admin key missing. Provide via -k/--key or export ANTHROPIC_ADMIN_KEY." >&2
  exit 1
fi

curl -sS "https://api.anthropic.com/v1/organizations/api_keys" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -H "x-api-key: ${TOKEN}" \
| jq 'if has("data") then {count: (.data|length), keys: (.data|map({id, name, state, token_prefix, scopes, created_at, last_used_at}))} else . end'
