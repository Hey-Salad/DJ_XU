#!/usr/bin/env bash
# Purge a leaked file from git history and force-push.
# Usage: scripts/purge-secrets.sh cloudflare-worker/.dev.vars

set -euo pipefail

FILE_TO_PURGE=${1:-}
if [[ -z "$FILE_TO_PURGE" ]]; then
  echo "Usage: $0 <path-to-secret-file>" >&2
  exit 2
fi

if [[ ! -d .git ]]; then
  echo "Run from the repository root." >&2
  exit 2
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is dirty. Commit or stash changes first." >&2
  exit 2
fi

echo "[1/3] Removing $FILE_TO_PURGE from HEAD..."
if git ls-files --error-unmatch "$FILE_TO_PURGE" >/dev/null 2>&1; then
  git rm --cached "$FILE_TO_PURGE"
  git commit -m "chore(security): remove leaked file $FILE_TO_PURGE from HEAD"
else
  echo "File not tracked in HEAD; continuing."
fi

echo "[2/3] Purging file from history..."
if command -v git-filter-repo >/dev/null 2>&1; then
  git filter-repo --invert-paths --path "$FILE_TO_PURGE"
elif command -v java >/dev/null 2>&1 && [[ -f ./bfg.jar ]]; then
  java -jar ./bfg.jar --delete-files "$(basename "$FILE_TO_PURGE")"
  git reflog expire --expire=now --all
  git gc --prune=now --aggressive
else
  cat >&2 <<EOF
Neither git-filter-repo nor BFG found.
Install one of:
  pip install git-filter-repo
or download BFG: https://rtyley.github.io/bfg-repo-cleaner/
Then run one of:
  git filter-repo --invert-paths --path "$FILE_TO_PURGE"
  # OR using BFG
  java -jar bfg.jar --delete-files "$(basename "$FILE_TO_PURGE")"
  git reflog expire --expire=now --all && git gc --prune=now --aggressive
EOF
  exit 3
fi

echo "[3/3] Force-pushing cleaned history (includes tags)."
git push --force --tags origin HEAD

echo "Done. Ensure any forks/clones force-pull, and rotate any exposed secrets."
