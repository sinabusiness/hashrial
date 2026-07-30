#!/usr/bin/env bash
# Publish a blog article: flip its status, rebuild, deploy.
#
#   bash scripts/publish-article.sh <slug> [fa|en|all]
#   bash scripts/publish-article.sh connect-asic-to-mining-pool-from-iran fa
#
# Editing the markdown alone changes nothing on the site — the build converts
# markdown to data, so an article only goes live once the site is rebuilt AND
# deployed. This does all three steps, and shows the live figures first so a
# stale number does not go out.
#
#   bash scripts/publish-article.sh <slug> --unpublish   to take one back down

set -euo pipefail
cd "$(dirname "$0")/.."

SLUG="${1:-}"
LANG_ARG="${2:-all}"

if [ -z "$SLUG" ]; then
  echo "Usage: bash scripts/publish-article.sh <slug> [fa|en|all|--unpublish]"
  echo
  echo "Available articles:"
  for f in content/blog/*.md; do
    case "$f" in *EDITORIAL*) continue;; esac
    st=$(grep -m1 '^status:' "$f" | cut -d'"' -f2)
    lg=$(grep -m1 '^lang:' "$f" | cut -d'"' -f2)
    sl=$(grep -m1 '^slug:' "$f" | cut -d'"' -f2)
    printf "  %-9s %-3s %s\n" "$st" "$lg" "$sl"
  done
  exit 1
fi

TARGET_STATUS="published"
if [ "$LANG_ARG" = "--unpublish" ]; then TARGET_STATUS="draft"; LANG_ARG="all"; fi

# Which files
FILES=()
for f in content/blog/${SLUG}.*.md; do
  case "$f" in *EDITORIAL*) continue;; esac
  [ -e "$f" ] || continue
  lg=$(grep -m1 '^lang:' "$f" | cut -d'"' -f2)
  if [ "$LANG_ARG" = "all" ] || [ "$LANG_ARG" = "$lg" ]; then FILES+=("$f"); fi
done

if [ ${#FILES[@]} -eq 0 ]; then
  echo "No article matched slug \"$SLUG\"" ; exit 1
fi

echo "About to set status=$TARGET_STATUS on:"
for f in "${FILES[@]}"; do echo "  $f"; done

if [ "$TARGET_STATUS" = "published" ]; then
  echo
  echo "───────────────────────────────────────────────────────────────"
  echo "LIVE FIGURES — check these against the numbers in the article."
  echo "Articles are built on worked examples; a stale price makes the"
  echo "arithmetic wrong in front of readers who can check."
  echo "───────────────────────────────────────────────────────────────"
  node scripts/fact-check-figures.mjs || echo "  (fact-check could not run — verify by hand)"
  echo
  ED="content/blog/${SLUG}.EDITORIAL.md"
  if [ -f "$ED" ]; then
    echo "Its editorial checklist ($ED):"
    sed -n '1,40p' "$ED" | sed 's/^/  /'
    echo
  fi
  read -r -p "Have you verified every figure in this article? [y/N] " ans
  case "$ans" in [yY]*) ;; *) echo "Aborted — nothing changed."; exit 0;; esac
fi

for f in "${FILES[@]}"; do
  if [ "$TARGET_STATUS" = "published" ]; then
    sed -i '' 's/^status: "draft"/status: "published"/' "$f"
  else
    sed -i '' 's/^status: "published"/status: "draft"/' "$f"
  fi
  echo "  $(grep -m1 '^status:' "$f")  $f"
done

echo
echo "Rebuilding…"
( cd dashboard && CI=true npm run build >/tmp/hashrial-build.log 2>&1 ) || {
  echo "BUILD FAILED — the site was NOT deployed. Last lines:"; tail -20 /tmp/hashrial-build.log; exit 1; }
grep -E "published, .* draft|prerendered" /tmp/hashrial-build.log | sed 's/^/  /' || true

echo
echo "Deploying…"
CI=1 npx wrangler pages deploy dashboard/build --project-name hashrial --branch main --commit-dirty=true 2>&1 | tail -2

echo
echo "Done. It can take a minute to appear. Check:"
echo "  https://hashrial.com/blog"
echo
echo "Remember to commit:  git add -A && git commit -m 'content: publish $SLUG'"
