#!/usr/bin/env bash
# Install the Upstash REST credentials into the Worker — but only after proving
# the token can actually WRITE.
#
# The Worker currently holds Upstash's READ-ONLY token. Every write fails with
# "NOPERM ... has no permissions to run the 'set' command", which silently
# disabled IP rate limiting, broke /pool/stats and payout requests, and stopped
# the BTC price ever caching. Installing the wrong token again would look like
# success and change nothing, so this checks first.
#
#   bash scripts/set-upstash-token.sh
#
# Nothing is echoed and nothing is written to disk or shell history.

set -u
cd "$(dirname "$0")/.." || exit 1

echo "Upstash console -> your Redis database -> REST API section."
echo "Copy UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
echo "Use the PLAIN token, NOT the one labelled Read-Only Token."
echo

read -r -p "REST URL (https://xxxx.upstash.io): " URL
read -r -s -p "REST TOKEN (input hidden): " TOKEN
echo; echo

if [ -z "$URL" ] || [ -z "$TOKEN" ]; then echo "Both values are required."; exit 1; fi
URL="${URL%/}"

KEY="hashrial:tokencheck:$$"

echo "1/3  testing WRITE (this is what the read-only token fails)…"
SET=$(curl -sS --max-time 20 -X POST -H "Authorization: Bearer $TOKEN" \
      "$URL/set/$KEY/ok?EX=60" 2>&1)

if echo "$SET" | grep -qi "NOPERM"; then
  echo "     FAILED — this is the READ-ONLY token."
  echo "     $SET"
  echo
  echo "     Go back and copy UPSTASH_REDIS_REST_TOKEN, not the read-only one."
  exit 1
fi
if ! echo "$SET" | grep -q '"result"'; then
  echo "     FAILED — unexpected response:"
  echo "     $(echo "$SET" | head -c 200)"
  exit 1
fi
echo "     write accepted"

echo "2/3  testing READ-BACK…"
GET=$(curl -sS --max-time 20 -H "Authorization: Bearer $TOKEN" "$URL/get/$KEY" 2>&1)
echo "$GET" | grep -q '"ok"' && echo "     read-back correct" || { echo "     FAILED: $GET"; exit 1; }
curl -sS --max-time 20 -X POST -H "Authorization: Bearer $TOKEN" "$URL/del/$KEY" >/dev/null 2>&1

echo "3/3  installing into the Worker…"
cd api-worker || exit 1
printf '%s' "$TOKEN" | CI=1 wrangler secret put UPSTASH_REDIS_TOKEN 2>&1 | grep -Ei "success|error" | sed 's/^/     /'
printf '%s' "$URL"   | CI=1 wrangler secret put UPSTASH_REDIS_URL   2>&1 | grep -Ei "success|error" | sed 's/^/     /'

echo
echo "Done. Verify with:"
echo "  curl -s https://hashrial-api.wold-brunch-0r.workers.dev/pool/stats"
echo "It returns 500 today; it should return JSON once the write token is live."
