#!/usr/bin/env bash
# Render one markdown post to html: scripts/render.sh <input.md> <output.html>
set -euo pipefail

src=$1
out=$2
scripts_dir=$(dirname "$0")

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

MATH_TMP=$tmp pandoc "$src" \
  -f markdown -t html5 \
  --section-divs \
  --template "$scripts_dir/template.html" \
  --lua-filter "$scripts_dir/filter.lua" \
  -o "$out"
