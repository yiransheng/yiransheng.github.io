POSTS := posts_v2
DIST  := dist

SRCS   := $(wildcard $(POSTS)/*.md)
PAGES  := $(patsubst $(POSTS)/%.md,$(DIST)/%.html,$(SRCS))

# non-markdown files (images etc.) are copied to dist as-is
ASSET_SRCS := $(shell find $(POSTS) -type f ! -name '*.md' 2>/dev/null)
ASSETS     := $(patsubst $(POSTS)/%,$(DIST)/%,$(ASSET_SRCS))

all: $(PAGES) $(ASSETS)

$(DIST)/%.html: $(POSTS)/%.md scripts/render.sh scripts/filter.lua scripts/template.html
	@mkdir -p $(@D)
	scripts/render.sh $< $@

$(DIST)/%: $(POSTS)/%
	@mkdir -p $(@D)
	cp $< $@

clean:
	rm -f $(PAGES) $(ASSETS)

.PHONY: all clean
