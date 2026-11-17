#!/usr/bin/env bash
# Downloads every image the site still loads from Wix into assets/images/wix/
# and rewrites the content files to point at the local copies.
# Run once from the repo root, on your own computer, before cancelling Wix:
#
#   bash tools/pull-wix-images.sh
#
# Then check the site locally, commit and push.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="assets/images/wix"
mkdir -p "$OUT"
FILES=$(ls _shows/*.md *.md _data/*.yml 2>/dev/null | grep -v README.md)

URLS=$(grep -ohE 'https://static\.wixstatic\.com/media/[^" )]+' $FILES | sort -u)
COUNT=0
for url in $URLS; do
  id=$(echo "$url" | sed -E 's#https://static\.wixstatic\.com/media/([^/~]+).*#\1#')
  ext=$(echo "$url" | sed -E 's#https://static\.wixstatic\.com/media/[^/]+~mv2\.([a-zA-Z]+).*#\1#')
  [ "$ext" = "$url" ] && ext="png"
  suffix=""
  case "$url" in *"/crop/"*) suffix="-crop" ;; esac
  name="${id}${suffix}.${ext}"
  if [ ! -s "$OUT/$name" ]; then
    echo "↓ $name"
    curl -fsSL "$url" -o "$OUT/$name"
  fi
  # replace this exact URL everywhere with the local path
  URL="$url" NEW="/$OUT/$name" perl -pi -e 's/\Q$ENV{URL}\E/$ENV{NEW}/g' $FILES
  COUNT=$((COUNT+1))
done
echo "Done: $COUNT images saved in $OUT and content files updated."
