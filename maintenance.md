# Problems Encountered Over the Years

## ReferenceError: primordials is not defined” in Node.js

Date: 2021-06
Link: https://stackoverflow.com/questions/55921442/how-to-fix-referenceerror-primordials-is-not-defined-in-node-js

## 2026-08-01

- Replaced the EOL gulp/node html-to-html pipeline with markdown-to-html: sources in `posts_v2/`, built by `make` (incremental, one target per post), logic in `scripts/`.
- Toolchain versions: pandoc 3.7.0.2, typst 0.15.1 (9dfd3a08), GNU Make 4.4.1 — no node, no yarn, no python in the build anymore.
- typst installed by extracting the official `typst-x86_64-unknown-linux-musl.tar.xz` release tarball to `~/.local/bin/typst` (static binary, no apt/snap package exists).
- Math: `scripts/filter.lua` converts LaTeX to typst via pandoc's typst writer, compiles each formula with `typst compile --format svg`, inlines the SVG — replaces mathjax-node, ~10ms per formula.
- Math gotcha: pandoc's texmath rejects top-level `\\` line breaks that MathJax accepted, so the filter retries the formula wrapped in `\begin{gathered}`.
- Math SVGs are sized in em (12pt typst = 1em body) with `vertical-align` from a `typst query` baseline position, so formulas scale with the body font.
- Syntax highlighting now uses pandoc's built-in skylighting with `$highlighting-css$` in the template; dropped `src/processing/highlight.py` and the python/pygments dependency.
- Post metadata: title falls back to a leading `# ` heading (then dropped from the body), author hardcoded in the filter, date from `git log -1 --format=%ad` with mtime fallback for uncommitted drafts; yaml frontmatter overrides all three.
- Dates come from git because mtime is the checkout date in a fresh clone — every file in `posts/` reported the same useless date; a shallow clone (`fetch-depth: 1`) degrades the same way.
- Table borders needed `tr.odd`/`tr.even`/`tr.header` classes re-added in the filter: the site css was uncss'd against the old writer's markup and pandoc 3 no longer emits them.
- Table text was optically too large: `.table` is Roboto Mono (x-height .528em) inside a Latin Modern body (x-height .431em), so set `.table{font-size:.85em}` to match x-heights, plus `.table code{font-size:1em}` to stop bootstrap's 90% inline-code rule compounding.
- Plain fenced blocks (no language) needed `pre:not([class]){line-height:1.25}` in the template: the site's `pre{line-height:.8em}` was only ever survivable because the old pygments markup set its own line-height.
- Mobile horizontal scrollbar was a wide display equation (55em ≈ 880px in a ~330px column), made worse by centering via `left:50%;transform:translate(-50%,0)`, which overflows both sides and is invisible in devtools since only `html` gets the scroll badge.
- Fixed with `p>span.math.eq{display:flex;justify-content:safe center;overflow-x:auto}` — `safe` matters, plain `center` strands the left end of a wide formula outside the scroll origin; unsupporting browsers drop the declaration and fall back to left-aligned but still scrollable.
- `make publish` replaces `publish.sh`: builds, refuses unless on branch `build` with a clean tree, then force-pushes the `dist` subtree to `origin/master`.
- The clean check exists because `git subtree split` publishes committed history, so an uncommitted build silently ships the previous commit's html.
- Vertical rhythm rule of thumb for future css edits: `body` sets `line-height` as an absolute px length that descendants inherit, so changing a font-size alone keeps text on the baseline grid — adding a `line-height` is what breaks it.
