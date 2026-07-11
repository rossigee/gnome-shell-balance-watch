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
	@cp src/metadata.json $@ 2>/dev/null || true

.PHONY: schemas
schemas: build/schemas/gschemas.compiled

build/schemas/gschemas.compiled: res/schemas/$(SCHEMA)
	mkdir -p build/schemas
	glib-compile-schemas res/schemas/ 2>/dev/null || cp $< build/schemas/

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

FORCE: