NAME = gnome-shell-balance-watch
UUID = balance-watch@rossigee.dev
SCHEMA = org.gnome.shell.extensions.balance-watch.gschema.xml

all: archive

.PHONY: test
test:
	TS_NODE_PROJECT=./tsconfig.test.json npm test

-include scripts/make/gnome-shell-extension.mk