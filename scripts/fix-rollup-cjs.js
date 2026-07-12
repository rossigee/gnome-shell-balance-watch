#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the bundled file
const bundlePath = path.join(__dirname, '../dist/extension.js');
let content = fs.readFileSync(bundlePath, 'utf8');

// Replace Rollup's __require helper with a simple passthrough to global require
// This allows external modules to be resolved at runtime by GJS
const oldHelper = `var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });`;

const newHelper = `var __require = require;`;

content = content.replace(oldHelper, newHelper);

// Write back
fs.writeFileSync(bundlePath, content, 'utf8');
console.log('✓ Fixed Rollup CommonJS helper in', bundlePath);
