#!/usr/bin/env bash
# Publish: force-push the built site (dist subtree) to origin/master, which is
# what github pages serves, then push the source branch.
# Usage: scripts/publish.sh [dist-dir]
set -euo pipefail

dist=${1:-dist}
branch=build

current=$(git branch --show-current)
if [ "$current" != "$branch" ]; then
  echo "publish: on branch '$current', expected '$branch'" >&2
  exit 1
fi

# subtree split publishes committed history, not the working tree -- an
# uncommitted build would silently not ship, so require a clean tree.
if [ -n "$(git status --porcelain)" ]; then
  echo "publish: working tree is not clean, commit or stash first:" >&2
  git status --short >&2
  exit 1
fi

git push origin "$(git subtree split --prefix "$dist")":master --force
git push origin "$branch"
