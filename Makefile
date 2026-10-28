NAME = gnome-shell-balance-watch
UUID = balance-watch@rossigee.dev
SCHEMA = org.gnome.shell.extensions.balance-watch.gschema.xml

all: archive

.PHONY: test
test:
	TS_NODE_PROJECT=./tsconfig.test.json npm test

build: node_modules dist/.built res/metadata.json schemas archive

node_modules:
	npm install

.PHONY: archive
archive: $(NAME).zip

$(NAME).zip: dist/.built res/metadata.json schemas
	-rm $(NAME).zip
	cd dist/ && zip ../$(NAME).zip *.js *.map
	cd build && zip ../$(NAME).zip metadata.json stylesheet.css schemas/*.compiled

.PHONY: clean
clean:
	rm -rf dist/ build/ $(NAME).zip

.PHONY: check
check:
	npx tsc --noEmit

dist/.built: src/extension.ts
	node scripts/build.mjs
	@touch $@

res/metadata.json: FORCE
	@cp src/metadata.json $@

.PHONY: schemas
schemas: build/schemas/gschemas.compiled

build/schemas/gschemas.compiled: res/schemas/$(SCHEMA)
	mkdir -p build/schemas
	cp $< build/schemas/
	glib-compile-schemas build/schemas/

.PHONY: lint
lint:
	npx eslint ./src --quiet

.PHONY: install
install: archive
	rm -rf $$HOME/.local/share/gnome-shell/extensions/$(UUID)
	mkdir -p $$HOME/.local/share/gnome-shell/extensions/$(UUID)
	unzip $(NAME).zip -d $$HOME/.local/share/gnome-shell/extensions/$(UUID)

.PHONY: prefs
prefs: install
	gnome-extensions prefs $(UUID)

.PHONY: restart
restart:
	@echo "Press Alt+F2, type 'r', and press Enter to restart GNOME Shell"

.PHONY: watch
watch:
	@echo "Run 'node scripts/build.mjs' to rebuild"
	@echo "Then restart GNOME Shell to reload extension"

.PHONY: gs_nested
gs_nested:
	@echo "Nested GNOME Shell testing..."
	@echo "Note: GNOME Shell extensions require a reload to activate."
	@echo ""
	@echo "Options for testing without full restart:"
	@echo "  1. Log out and log back in (less disruptive)"
	@echo "  2. Use GNOME Extensions app to enable"
	@echo "  3. Wait for next reboot"
	@echo ""
	@echo "For nested testing, install weston:"
	@echo "  sudo apt install weston"
	@echo "Then run: weston --fullscreen"

.PHONY: reload
reload:
	@echo "To reload extensions without full restart:"
	@echo ""
	@echo "  Method 1: Log out and back in"
	@echo "  Method 2: Use GNOME Extensions app (search 'Extensions' in activities)"
	@echo "  Method 3: Alt+F2, enter 'lg', press Enter to open Looking Glass"
	@echo "            Then: Extensions tab > Reload Configuration"

.PHONY: logs
logs:
	journalctl /usr/bin/gnome-shell -f | grep -i "balance"

.PHONY: dev
dev:
	@echo "Balance Watch - Development Commands"
	@echo ""
	@echo "  Build & Install:"
	@echo "    make build    - Build extension (dist/, build/)"
	@echo "    make install  - Install to ~/.local/share/gnome-shell/extensions/"
	@echo "    make clean    - Remove build artifacts"
	@echo ""
	@echo "  Testing:"
	@echo "    make test     - Run unit tests"
	@echo "    make logs     - Monitor extension logs"
	@echo "    make gs_nested - Instructions for nested testing"
	@echo ""
	@echo "  Reload Extension:"
	@echo "    make reload   - Methods to reload without full restart"
	@echo ""
	@echo "  Quality:"
	@echo "    make lint     - Run ESLint"
	@echo "    make check    - TypeScript type check"
	@echo ""
	@echo "  Usage:"
	@echo "    make prefs    - Open extension preferences"
	@echo "    make restart  - Instructions to restart GNOME Shell"
	@echo ""
	@echo "  Workflow:"
	@echo "    1. make build && make install"
	@echo "    2. make reload (use Looking Glass or log out/in)"
	@echo "    3. Edit code, run: make build && make install"
	@echo "    4. make reload to see changes"
	@echo ""

FORCE: