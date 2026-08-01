#!/usr/bin/env bash
# Render one markdown post to html: scripts/render.sh <input.md> <output.html>
set -euo pipefail

src=$1
out=$2
scripts_dir=$(dirname "$0")

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# Post date, unless the post pins one in its frontmatter: git author date of
# the last commit touching the file. Falls back to mtime for drafts that are
# not committed yet -- note mtime is the checkout date in a fresh clone, and
# a shallow clone (fetch-depth 1) has no history to read, so both degrade to
# "today" rather than the real date.
post_date=$(git log -1 --format=%ad --date=format:'%m/%d/%Y' -- "$src" 2>/dev/null || true)
[ -n "$post_date" ] || post_date=$(date -r "$src" +%m/%d/%Y)

# custom language grammars for the built-in highlighter, one xml per language
syntax=()
for def in "$scripts_dir"/syntax/*.xml; do
  [ -e "$def" ] && syntax+=(--syntax-definition "$def")
done

MATH_TMP=$tmp POST_DATE=$post_date pandoc "$src" \
  -f markdown -t html5 \
  --section-divs \
  ${syntax[@]+"${syntax[@]}"} \
  --template "$scripts_dir/template.html" \
  --lua-filter "$scripts_dir/filter.lua" \
  -o "$out"
