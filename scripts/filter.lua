-- Pandoc filter: LaTeX math -> typst -> inline SVG, table classes,
-- and document metadata (title / author / date).

local SCRATCH = os.getenv("MATH_TMP") or "/tmp"
local AUTHOR = "Yiran Sheng"
local counter = 0

-- top-edge/bottom-edge default to font metrics (roughly cap-height to
-- baseline), so an auto-sized page crops whatever sits outside that band:
-- overlines and other tall marks at the top, descenders and subscripts at the
-- bottom. "bounds" fits the page to the actual ink instead. The margin is
-- headroom for antialiasing at the edges; it cancels out of the baseline
-- offset, which is measured from the page top.
local MARGIN_PT = 1
local PREAMBLE = [[
#set page(width: auto, height: auto, margin: 1pt, fill: none)
#set text(size: 12pt, top-edge: "bounds", bottom-edge: "bounds")
]]

-- Baseline grid. An inline formula is a replaced element, so its margin box
-- takes part in line box sizing: anything reaching past the strut makes that
-- one line taller and shifts every following line off the grid. These are the
-- strut's extents for the body face (latin modern: ascent 1.127em, descent
-- 0.290em, content area 1.417em) at the tightest line-height in the site css
-- (1.2em), where half-leading is negative. Clamping to the tightest breakpoint
-- keeps the grid at all four.
local STRUT_ABOVE = 1.1270 + (1.2 - 1.4170) / 2  -- 1.0185em
local STRUT_BELOW = 0.2900 + (1.2 - 1.4170) / 2  -- 0.1815em

-- (min-width, line-height) per breakpoint, from src/less/layout.less
local BREAKPOINTS = {
  { query = nil,     line = 1.2 },
  { query = "48em",  line = 1.3 },
  { query = "62em",  line = 1.5 },
  { query = "75em",  line = 1.4 },
}
local display_rules = {}

local function file_read(path)
  local f = io.open(path, "r")
  if not f then return nil end
  local s = f:read("a")
  f:close()
  return s
end

local function file_write(path, s)
  local f = io.open(path, "w")
  f:write(s)
  f:close()
end

-- em size: math is typeset at 12pt, so 12pt == 1em of surrounding text
local function pt_to_em(pt)
  return string.format("%.4fem", pt / 12.0)
end

-- rewrite svg header dimensions from pt to em so math scales with body font
local function svg_scale(svg, depth_pt)
  local w = svg:match('width="([%d%.]+)pt"')
  local h = svg:match('height="([%d%.]+)pt"')
  if not (w and h) then return svg end
  local style = ""
  if depth_pt then
    -- Negative margins shrink the margin box back inside the strut so the
    -- line box never grows; the ink still paints (margins do not clip), it
    -- just overlaps the neighbouring line instead of displacing it. The
    -- vertical-align offset is measured to the bottom margin edge, so it
    -- absorbs the bottom margin to leave the ink where it belongs.
    local em_h, em_d = tonumber(h) / 12.0, depth_pt / 12.0
    local over_top = math.max(0, (em_h - em_d) - STRUT_ABOVE)
    local over_bot = math.max(0, em_d - STRUT_BELOW)
    style = string.format(' style="vertical-align: -%.4fem', em_d - over_bot)
    if over_top > 0 or over_bot > 0 then
      style = style .. string.format("; margin: -%.4fem 0 -%.4fem", over_top, over_bot)
    end
    style = style .. '"'
  end
  local repl = string.format('width="%s" height="%s"%s',
    pt_to_em(tonumber(w)), pt_to_em(tonumber(h)), style)
  svg = svg:gsub('width="[%d%.]+pt" height="[%d%.]+pt"', repl, 1)
  return svg
end

local function typst_compile(src, base)
  local typ = SCRATCH .. "/" .. base .. ".typ"
  local out = SCRATCH .. "/" .. base .. ".svg"
  file_write(typ, src)
  local ok = os.execute(string.format(
    "typst compile --format svg %q %q 2>%q.err", typ, out, typ))
  if not ok then
    io.stderr:write("[math2svg] typst failed: " .. (file_read(typ .. ".err") or "") .. "\n")
    return nil
  end
  return file_read(out)
end

-- Distance from the top of the ink to the baseline. With bounds edges the page
-- box hugs the ink, so `here().position()` reports the ink bottom rather than
-- the baseline and cannot be used; measuring the same content with a baseline
-- bottom edge gives the ascent directly.
local function typst_ascent(base)
  local typ = SCRATCH .. "/" .. base .. ".typ"
  local pipe = io.popen(string.format(
    "typst query %q '<asc>' --field value 2>/dev/null", typ))
  local json = pipe:read("a")
  pipe:close()
  return tonumber(json:match('([%d%.]+)pt'))
end

local function to_typst(el)
  local out = pandoc.write(pandoc.Pandoc({ pandoc.Plain({ el }) }), "typst")
  return out:gsub("%s+$", "")
end

function Math(el)
  counter = counter + 1
  local base = "eq_" .. counter
  -- convert LaTeX math to typst syntax via pandoc's typst writer
  local typst_math = to_typst(el)
  -- texmath rejects top-level \\ line breaks (MathJax tolerated them) and
  -- falls back to escaped literal text; retry wrapped in gathered
  if typst_math:find("\\%$") then
    typst_math = to_typst(pandoc.Math(el.mathtype,
      "\\begin{gathered} " .. el.text .. " \\end{gathered}"))
  end
  if typst_math:find("\\%$") then
    io.stderr:write("[math2svg] unconvertible math: " .. el.text .. "\n")
    return nil
  end
  -- Source line wrapping must not survive into the formula: a newline landing
  -- inside a quoted run -- mono("exists\nv1.D(") -- renders as a line break,
  -- where latex would have set a space. An explicit \ line break is kept.
  typst_math = typst_math:gsub("([^\\])[ \t]*\n[ \t]*", "%1 ")

  local src, class
  if el.mathtype == "DisplayMath" then
    class = "math display eq"
    src = PREAMBLE .. typst_math .. "\n"
  else
    class = "math inline"
    src = PREAMBLE
      .. "#let f = " .. typst_math .. "\n"
      .. "#f#context [#metadata(measure(text(bottom-edge: \"baseline\", f)).height)<asc>]\n"
  end

  local svg = typst_compile(src, base)
  if not svg then return nil end -- keep original on failure

  -- how far the ink descends below the baseline: the page top edge sits one
  -- margin above the ink, so the baseline is MARGIN_PT + ascent from the top
  local depth = nil
  if el.mathtype == "InlineMath" then
    local h = tonumber(svg:match('height="([%d%.]+)pt"'))
    local asc = typst_ascent(base)
    if h and asc then depth = math.max(h - (MARGIN_PT + asc), 0) end
  end

  -- A display equation is as tall as its content, which is never a whole
  -- number of lines, so everything after it lands off the grid. Pad each one
  -- up to the next whole line -- per breakpoint, since the line-height in em
  -- differs at each and no single static value can satisfy all four.
  if el.mathtype == "DisplayMath" then
    local h_em = tonumber(svg:match('height="([%d%.]+)pt"')) / 12.0
    for _, bp in ipairs(BREAKPOINTS) do
      local lines = math.ceil(h_em / bp.line - 0.0001)
      local pad = lines * bp.line - h_em
      local rule = string.format("p>span.math.eq.%s{padding-bottom:%.4fem}", base, pad)
      if bp.query then
        rule = string.format("@media (min-width:%s){%s}", bp.query, rule)
      end
      table.insert(display_rules, rule)
    end
    class = class .. " " .. base
  end

  svg = svg_scale(svg, depth)
  return pandoc.RawInline("html",
    '<span class="' .. class .. '">' .. svg .. "</span>")
end

function Table(el)
  el.attr.classes = pandoc.List({ "table", "table-condensed" })
  -- site css draws row borders via tr.odd/tr.even (uncss'd against the old
  -- pandoc writer's markup); pandoc 3 no longer emits these classes itself
  for _, row in ipairs(el.head.rows) do
    row.attr.classes = pandoc.List({ "header" })
  end
  for _, body in ipairs(el.bodies) do
    for i, row in ipairs(body.body) do
      row.attr.classes = pandoc.List({ i % 2 == 1 and "odd" or "even" })
    end
  end
  return el
end

-- Metadata: yaml frontmatter wins, otherwise fill in defaults. Title falls
-- back to a leading h1 (which is then dropped, as the template renders it),
-- date to the source file's mtime, passed in as POST_DATE by render.sh.
function Pandoc(doc)
  local meta = doc.meta
  if not meta.title then
    local first = doc.blocks[1]
    if first and first.t == "Header" and first.level == 1 then
      meta.title = pandoc.MetaInlines(first.content)
      table.remove(doc.blocks, 1)
    end
  end
  meta.author = meta.author or pandoc.MetaString(AUTHOR)
  local mtime = os.getenv("POST_DATE")
  if not meta.date and mtime and mtime ~= "" then
    meta.date = pandoc.MetaString(mtime)
  end
  if #display_rules > 0 then
    meta["math-css"] = pandoc.MetaBlocks({ pandoc.RawBlock("html",
      "<style>\n" .. table.concat(display_rules, "\n") .. "\n</style>") })
  end
  return pandoc.Pandoc(doc.blocks, meta)
end
