/* Public asset integrity gate. Intentionally does not load any school or student data. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const loader = read('index.html');
const base = read('app-v05.html');

assert.match(loader, /fetch\(['"]\.\/app-v05\.html\?/,
  'The boot loader must fetch the existing base page');
for (const anchor of [
  '<link rel="stylesheet" href="app-v05.css">',
  '<script src="core-v05.js"></script>',
  '<script src="app-v05.js"></script>'
]) {
  assert(base.includes(anchor), 'Base page loader replacement anchor changed: ' + anchor);
}

const assetPattern = /(?:src|href)=["']([^"'<>]+?\.(?:js|css)(?:\?[^"'<>]*)?)["']/g;
const localAssets = new Set();
for (const htmlSource of [loader, base]) {
  for (const match of htmlSource.matchAll(assetPattern)) {
    const candidate = match[1];
    if (/^(?:https?:)?\/\//i.test(candidate)) continue;
    const asset = candidate.split(/[?#]/, 1)[0].replace(/^\.\//, '');
    assert(asset && !asset.startsWith('/') && !asset.split('/').includes('..'),
      'Invalid local asset path: ' + candidate);
    localAssets.add(asset);
  }
}

assert(localAssets.size >= 90,
  'Runtime references unexpectedly disappeared; inspect the boot loader');
const missing = [...localAssets].filter(file =>
  !fs.statSync(root, {throwIfNoEntry: false}) || !fs.existsSync(path.join(root, file)));
assert.deepEqual(missing, [],
  'The published boot loader references missing JS/CSS files');
console.log('Public loader integrity PASS: ' + localAssets.size +
  ' unique local JS/CSS assets exist; base loader anchors are intact.');
