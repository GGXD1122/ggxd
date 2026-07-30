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

echo "==> Testing article image placeholders"
node tools/test-blur-up-images.js

echo "==> Checking asset version"
VERSION="$(awk -F': ' '/^source_version:/{print $2}' themes/archer/_config.yml | tr -d ' ')"
if [[ -n "$VERSION" ]]; then
  rg -q "style\\.css\\?v=$VERSION" public/index.html
fi

echo "==> Checking frontend performance safeguards"
test -f public/assets/avatar-blur.webp
test -f public/font/iconfont-archer.woff
rg -q 'profile-avatar blur-up-image' public/index.html
rg -q 'assets/avatar-blur\.webp' public/index.html
rg -q "scripts/imageReveal\.js\?v=$VERSION" public/index.html
if rg -q 'cdn\.jsdelivr\.net/npm/(jquery|@fancyapps/fancybox)|at\.alicdn\.com' public/index.html; then
  echo "Critical frontend resources still depend on an external CDN."
  exit 1
fi
if find public -type f -name '*.map' | rg -q .; then
  echo "Production source maps must not be published."
  find public -type f -name '*.map'
  exit 1
fi
node --check public/lib/jquery.min.js
node --check public/lib/fancybox/source/jquery.fancybox.min.js
node --check public/scripts/main.js
node --check public/scripts/imageReveal.js
MAIN_JS_BYTES="$(wc -c < public/scripts/main.js | tr -d ' ')"
if (( MAIN_JS_BYTES > 300000 )); then
  echo "main.js exceeds the 300 KB production budget: ${MAIN_JS_BYTES} bytes"
  exit 1
fi
for icon in apple bolt download github globe windows; do
  test -f "public/assets/ui-icons/${icon}.svg"
done

echo "==> Check complete"
