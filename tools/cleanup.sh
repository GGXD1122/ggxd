#!/usr/bin/env zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Stopping local Hexo preview on port 4000"
PIDS="$(lsof -tiTCP:4000 -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "$PIDS" ]]; then
  echo "$PIDS" | xargs kill
fi

echo "==> Stopping Hexo commands for this workspace"
ps -axo pid=,command= | awk -v root="$ROOT" '
  $0 ~ /hexo/ && $0 ~ root && $0 !~ /awk/ { print $1 }
' | while read -r pid; do
  [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
done

echo "==> Verifying no Hexo/Git service remains"
lsof -nP -iTCP:4000 -sTCP:LISTEN 2>/dev/null || true
ps aux | rg -i "hexo|node_modules/hexo|hexo/bin|git fsmonitor--daemon" | rg -v "rg -i|tools/cleanup\\.sh" || true
launchctl list | rg -i "\\b(hexo|git|node)\\b" || true

echo "==> Cleanup complete"
