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
    style = string.format(' style="vertical-align: -%s"', pt_to_em(depth_pt))
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
  return pandoc.Pandoc(doc.blocks, meta)
end
