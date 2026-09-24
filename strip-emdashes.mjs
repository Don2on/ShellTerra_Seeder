#!/usr/bin/env node
/**
 * strip-emdashes.mjs — replace em dashes (—) and en dashes (–) with a plain
 * spaced hyphen " - " in the DISPLAYED text fields (title, description, tagline,
 * hours) of every seed file. Walks the parsed JSON so keys and _comment/_verify
 * metadata are left alone. Run from the seeder dir, then re-seed + rebuild.
 *
 * USAGE: node strip-emdashes.mjs
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';

const FIELDS = new Set(['title', 'description', 'tagline', 'hours', 'label', 'notes']);
const DASH = /[ \t]*[—–][ \t]*/g;
const clean = (s) => typeof s === 'string' && /[—–]/.test(s) ? s.replace(DASH, ' - ') : s;

let count = 0;
function walk(node) {
  if (Array.isArray(node)) { node.forEach(walk); return; }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (FIELDS.has(k) && typeof v === 'string') { const nv = clean(v); if (nv !== v) { node[k] = nv; count++; } }
      else if (Array.isArray(v) && k === 'deals') { node[k] = v.map((x) => { const nx = clean(x); if (nx !== x) count++; return nx; }); }
      else walk(v);
    }
  }
}

// Every seed JSON file in the dir (skip build outputs / raw scrapes / node_modules).
const files = readdirSync('.').filter((f) =>
  f.endsWith('.json') &&
  !/^(package|package-lock|tsconfig)/.test(f) &&
  !/-raw\.json$|BrowserData\.json$|-review\./.test(f)
);

const changed = [];
for (const f of files) {
  let data;
  try { data = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; } // skip invalid/concatenated files
  const before = count;
  walk(data);
  if (count > before) { writeFileSync(f, JSON.stringify(data, null, 2)); changed.push(`${f}: ${count - before}`); }
}

console.log(`Replaced ${count} em/en-dashes across ${changed.length} files:`);
changed.forEach((c) => console.log('  ' + c));
