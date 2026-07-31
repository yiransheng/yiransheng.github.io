-- Experimental pandoc filter: LaTeX math -> typst -> inline SVG,
-- code blocks -> pygments, tables -> bootstrap classes.

local SCRATCH = os.getenv("MATH_TMP") or "/tmp"
local counter = 0

local PREAMBLE = [[
#set page(width: auto, height: auto, margin: 0.4pt, fill: none)
#set text(size: 12pt)
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

local function typst_baseline(base)
  local typ = SCRATCH .. "/" .. base .. ".typ"
  local pipe = io.popen(string.format(
    "typst query %q '<pos>' --field value 2>/dev/null", typ))
  local json = pipe:read("a")
  pipe:close()
  return tonumber(json:match('"y":"([%d%.]+)pt"'))
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

  local src, class
  if el.mathtype == "DisplayMath" then
    class = "math display eq"
    src = PREAMBLE .. typst_math .. "\n"
  else
    class = "math inline"
    src = PREAMBLE .. typst_math .. "#context [#metadata(here().position())<pos>]\n"
  end

  local svg = typst_compile(src, base)
  if not svg then return nil end -- keep original on failure

  local depth = nil
  if el.mathtype == "InlineMath" then
    local h = tonumber(svg:match('height="([%d%.]+)pt"'))
    local y = typst_baseline(base)
    if h and y then depth = math.max(h - y, 0) end
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
