#!/usr/bin/env node
/**
 * Merge a raw activities payload into GaslampActivities.json.
 *
 *   node merge-downtown.mjs [rawFile]   (default: gaslamp-downtown-raw.json)
 *
 * - Appends raw.items into GaslampActivities.json items[], skipping duplicates.
 * - Dedup/collision key mirrors the seeder's doc-hash inputs: kind|slug|start.
 *   (seed-activities.mjs hashes `${shellId}|${kind}|${slug||title}|${startLocal}`,
 *   so two rows sharing kind+slug+start collide into ONE seeded doc.)
 * - Reports: added, duplicates-vs-existing, and INTERNAL collisions within the
 *   raw payload (e.g. different venues both producing slug `karaoke-<date>-21-00`).
 * - Merges raw._deferred_placeholders.items into the target's _deferred bucket.
 * - Writes GaslampActivities.json.bak before overwriting.
 */
import fs from 'node:fs';
import process from 'node:process';

const RAW = process.argv[2] || 'gaslamp-downtown-raw.json';
const TARGET = 'GaslampActivities.json';

const raw = JSON.parse(fs.readFileSync(RAW, 'utf8'));
const tgt = JSON.parse(fs.readFileSync(TARGET, 'utf8'));
tgt.items = tgt.items || [];

const key = (it) => `${it.kind || 'activity'}|${it.slug || it.title}|${it.start}`;

// Internal collisions inside the raw payload (same seeded-doc identity).
const seen = new Map();
const internalCollisions = [];
for (const it of raw.items || []) {
  const k = key(it);
  if (seen.has(k)) internalCollisions.push({ key: k, a: seen.get(k).locationName, b: it.locationName });
  else seen.set(k, it);
}

const existing = new Set(tgt.items.map(key));
let added = 0;
let dupVsExisting = 0;
for (const it of raw.items || []) {
  const k = key(it);
  if (existing.has(k)) { dupVsExisting++; continue; }
  existing.add(k);
  tgt.items.push(it);
  added++;
}

// Fold in deferred placeholders (never-seed reference rows).
let deferredAdded = 0;
if (raw._deferred_placeholders?.items?.length) {
  tgt._deferred_placeholders = tgt._deferred_placeholders || { _why: raw._deferred_placeholders._why, items: [] };
  tgt._deferred_placeholders.items.push(...raw._deferred_placeholders.items);
  deferredAdded = raw._deferred_placeholders.items.length;
}

fs.copyFileSync(TARGET, TARGET + '.bak');
fs.writeFileSync(TARGET, JSON.stringify(tgt, null, 2) + '\n');

console.log(`raw items:            ${(raw.items || []).length}`);
console.log(`added to items[]:     ${added}`);
console.log(`skipped (dup vs file):${dupVsExisting}`);
console.log(`deferred placeholders:${deferredAdded}`);
console.log(`GaslampActivities now:${tgt.items.length} items`);
if (internalCollisions.length) {
  console.log(`\n⚠ ${internalCollisions.length} INTERNAL collisions (same kind|slug|start across venues — only ONE seeds):`);
  for (const c of internalCollisions.slice(0, 20)) console.log(`   ${c.key}   [${c.a}] vs [${c.b}]`);
  if (internalCollisions.length > 20) console.log(`   …and ${internalCollisions.length - 20} more`);
}
