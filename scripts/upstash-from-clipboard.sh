#!/usr/bin/env bash
# Install the Upstash REST credentials straight from the clipboard.
#
# Why the clipboard: the value goes from Upstash -> pbpaste -> wrangler without
# ever being printed, logged, or shown to the assistant. Reading a token off a
# screenshot or pasting it into chat puts it in the conversation permanently;
# this does not.
#
# In Upstash: your Redis database -> REST API section -> click Copy on the
# .env block (it contains both UPSTASH_REDIS_REST_URL and
# UPSTASH_REDIS_REST_TOKEN). Copying just the token alone also works.
#
#   bash scripts/upstash-from-clipboard.sh
#
# Prints only pass/fail. Never prints the credentials.

set -u
cd "$(dirname "$0")/.." || exit 1

CLIP="$(pbpaste 2>/dev/null)"
[ -z "$CLIP" ] && { echo "Clipboard is empty. Copy from Upstash first."; exit 1; }

extract() { printf '%s' "$CLIP" | grep -oE "$1" | head -1 | sed -E 's/^[^=]*=//' | tr -d '"'"'"' \r'; }

URL="$(extract 'UPSTASH_REDIS_REST_URL[[:space:]]*=[[:space:]]*[^[:space:]]+')"
TOKEN="$(extract 'UPSTASH_REDIS_REST_TOKEN[[:space:]]*=[[:space:]]*[^[:space:]]+')"

# Fall back to a bare value: a lone https:// URL, or a lone token.
if [ -z "$URL" ] && printf '%s' "$CLIP" | grep -qE '^https://[^[:space:]]+\.upstash\.io/?$'; then
  URL="$(printf '%s' "$CLIP" | tr -d ' \n\r')"
fi
if [ -z "$TOKEN" ] && ! printf '%s' "$CLIP" | grep -q '=' && ! printf '%s' "$CLIP" | grep -q '^https://'; then
  TOKEN="$(printf '%s' "$CLIP" | tr -d ' \n\r')"
fi

URL="${URL%/}"
echo "clipboard parsed:  URL=$([ -n "$URL" ] && echo yes || echo no)   TOKEN=$([ -n "$TOKEN" ] && echo "yes (${#TOKEN} chars)" || echo no)"

if [ -z "$TOKEN" ]; then
  echo
  echo "No token found. Copy either:"
  echo "  - the whole .env block from Upstash's REST API section, or"
  echo "  - just the UPSTASH_REDIS_REST_TOKEN value on its own"
  exit 1
fi

if [ -z "$URL" ]; then
  echo
  echo "Token found but no REST URL. Re-copy including the URL line, or run:"
  echo "  bash scripts/set-upstash-token.sh"
  exit 1
fi

KEY="hashrial:tokencheck:$$"
echo "1/3  testing WRITE (the read-only token fails here)…"
SET=$(curl -sS --max-time 20 -X POST -H "Authorization: Bearer $TOKEN" "$URL/set/$KEY/ok?EX=60" 2>&1)
if echo "$SET" | grep -qi "NOPERM"; then
  echo "     FAILED — this is the READ-ONLY token. Copy UPSTASH_REDIS_REST_TOKEN instead."
  exit 1
fi
echo "$SET" | grep -q '"result"' || { echo "     FAILED: $(echo "$SET" | head -c 200)"; exit 1; }
echo "     write accepted"

echo "2/3  reading back…"
GET=$(curl -sS --max-time 20 -H "Authorization: Bearer $TOKEN" "$URL/get/$KEY" 2>&1)
echo "$GET" | grep -q '"ok"' && echo "     correct" || { echo "     FAILED: $GET"; exit 1; }
curl -sS --max-time 20 -X POST -H "Authorization: Bearer $TOKEN" "$URL/del/$KEY" >/dev/null 2>&1

echo "3/3  installing into the Worker…"
cd api-worker || exit 1
printf '%s' "$TOKEN" | CI=1 wrangler secret put UPSTASH_REDIS_TOKEN 2>&1 | grep -Ei "success|error" | sed 's/^/     /'
printf '%s' "$URL"   | CI=1 wrangler secret put UPSTASH_REDIS_URL   2>&1 | grep -Ei "success|error" | sed 's/^/     /'

echo
echo "Done. Clear your clipboard when convenient:  pbcopy </dev/null"
