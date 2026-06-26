#!/usr/bin/env zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Checking repository"
git diff --check
if git ls-files | rg -q '(^|/)\..*\.sw[op]$|\.sw[op]$'; then
  echo "Swap files are tracked. Remove them before publishing."
  git ls-files | rg '(^|/)\..*\.sw[op]$|\.sw[op]$'
  exit 1
fi

HEXO_CONFIG="_config.yml"
if [[ -f "_config.local.yml" ]]; then
  HEXO_CONFIG="${HEXO_CONFIG},_config.local.yml"
fi

echo "==> Building Hexo site"
./node_modules/.bin/hexo --config "$HEXO_CONFIG" clean
./node_modules/.bin/hexo --config "$HEXO_CONFIG" generate

echo "==> Checking generated core files"
test -f public/index.html
test -f public/sitemap.xml
test -f public/baidusitemap.xml
test -f public/content.json

echo "==> Checking asset version"
VERSION="$(awk -F': ' '/^source_version:/{print $2}' themes/archer/_config.yml | tr -d ' ')"
if [[ -n "$VERSION" ]]; then
  rg -q "style\\.css\\?v=$VERSION" public/index.html
fi

echo "==> Check complete"
