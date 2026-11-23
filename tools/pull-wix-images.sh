#!/usr/bin/env bash
# Copies the last few files that still load from Wix into this repo:
#   - the custom heading font  -> assets/fonts/display.woff2
#   - URS media videos + development-history images -> assets/wix/
# and rewrites the content files to use the local copies.
#
# Run once from the repo root on your own computer, before cancelling Wix:
#   bash tools/pull-wix-images.sh
# Then commit and push.
set -euo pipefail
cd "$(dirname "$0")/.."

# 1. Heading font
mkdir -p assets/fonts
FONT_URL=$(grep -oE 'https://static\.wixstatic\.com/ufonts/[^" ]+' _data/settings.yml || true)
if [ -n "$FONT_URL" ]; then
  echo "↓ heading font"
  curl -fsSL "$FONT_URL" -o assets/fonts/display.woff2
  perl -pi -e 's#^display_font:.*#display_font: ""#' _data/settings.yml
fi

# 2. Any other Wix-hosted images / videos in the content
OUT="assets/wix"
mkdir -p "$OUT"
FILES=$(ls _shows/*.md index.md about.md projects.md team.md contact.md _data/*.yml)
URLS=$(grep -ohE 'https://(static|video)\.wixstatic\.com/[^" )]+' $FILES | sort -u || true)
for url in $URLS; do
  case "$url" in
    https://video.wixstatic.com/*)
      id=$(echo "$url" | sed -E 's#.*/video/([^/]+)/.*#\1#'); name="$id.mp4" ;;
    *)
      base=$(echo "$url" | sed -E 's#https://static\.wixstatic\.com/media/([^/]+).*#\1#')
      name=$(echo "$base" | sed -E 's/~mv2//') ;;
  esac
  if [ ! -s "$OUT/$name" ]; then echo "↓ $name"; curl -fsSL "$url" -o "$OUT/$name"; fi
  URL="$url" NEW="/$OUT/$name" perl -pi -e 's/\Q$ENV{URL}\E/$ENV{NEW}/g' $FILES
done
echo "Done. Nothing on the site loads from Wix any more:"
grep -l "wixstatic" $FILES || echo "  (no Wix links left)"
