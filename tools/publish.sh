#!/usr/bin/env zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MESSAGE="${1:-}"
BRANCH="$(git branch --show-current)"

finish() {
  "$ROOT/tools/cleanup.sh" >/dev/null || true
}
trap finish EXIT

echo "==> Running pre-publish check"
"$ROOT/tools/check.sh"

if [[ -n "$(git status --porcelain)" ]]; then
  if [[ -z "$MESSAGE" ]]; then
    echo "There are source changes. Run: tools/publish.sh \"your commit message\""
    git status --short
    exit 1
  fi

  echo "==> Committing source changes"
  git add -A
  git commit -m "$MESSAGE"
fi

echo "==> Pushing source branch: $BRANCH"
git push origin "$BRANCH"

echo "==> Deploying generated site"
./node_modules/.bin/hexo deploy

echo "==> Publish complete"
