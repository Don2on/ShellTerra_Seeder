#!/usr/bin/env node
/**
 * merge-activities.mjs — merge a new activity dump into a shell's seed file.
 *
 * Adds items from --from into --into (default HillcrestActivities.json),
 * skipping any whose slug already exists, and skipping any that belong to
 * another neighborhood (zip not in ALLOWED_ZIPS, or a denylisted venue).
 * Incoming items are normalized to the seed file's field shape (the extra
 * venue-direct fields — vendor/pricing/flags/source/subcategory — are dropped).
 *
 * USAGE
 *   node merge-activities.mjs --from ./HillcrestVenueDirect.json --dry-run
 *   node merge-activities.mjs --from ./HillcrestVenueDirect.json
 *   node merge-activities.mjs --from x.json --into ./HillcrestActivities.json
 *
 * FLAGS
 *   --allow-zip 92103,92104   override the kept zip list
 *   --exclude-venue "<substr>"  drop a venue by locationName substring (repeatable)
 *   --all                     keep every zip (disable the neighborhood filter)
 *   --dry-run                 report only; do not write
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const args = process.argv.slice(2);
const valOf = (f) => { const i = args.indexOf(f); return i > -1 ? args[i + 1] : null; };
const allOf = (f) => args.reduce((a, v, i) => (args[i - 1] === f ? [...a, v] : a), []);

const FROM = valOf('--from');
const INTO = valOf('--into') || './HillcrestActivities.json';
const DRY = args.includes('--dry-run');
const KEEP_ALL_ZIPS = args.includes('--all');
const ALLOWED_ZIPS = new Set((valOf('--allow-zip') || '92103,92104').split(','));
const EXCLUDE_VENUES = allOf('--exclude-venue').map((s) => s.toLowerCase());

if (!FROM) { console.error('Missing --from <file>'); process.exit(1); }

// Pull a 5-digit zip out of an address string.
const zipOf = (addr) => (String(addr || '').match(/\b(\d{5})\b/) || [])[1] || null;

// Keep only the fields the seeder + existing file use.
function normalize(it) {
  const out = {
    kind: it.kind || 'activity',
    slug: it.slug,
    title: it.title,
    description: it.description || '',
    locationName: it.locationName || '',
    address: it.address || '',
    lat: it.lat,
    lng: it.lng,
    category: it.category ?? null,
    start: it.start,
    end: it.end ?? null,
    url: it.url || '',
  };
  if (it.recurrence) out.recurrence = it.recurrence;
  if (it.recurDays) out.recurDays = it.recurDays;
  return out;
}

const intoDoc = JSON.parse(readFileSync(INTO, 'utf8'));
if (!Array.isArray(intoDoc.items)) { console.error(`${INTO} has no items[]`); process.exit(1); }
const fromRaw = JSON.parse(readFileSync(FROM, 'utf8'));
const fromItems = Array.isArray(fromRaw)
  ? fromRaw
  : (fromRaw.items || fromRaw.activities || []);

const existingSlugs = new Set(intoDoc.items.map((i) => i.slug));
const seenIncoming = new Set();

let added = 0, dupSlug = 0, otherHood = 0, noCoords = 0, badSlug = 0;
const otherList = new Map(); // venue -> count
const toAdd = [];

for (const it of fromItems) {
  if (!it.slug) { badSlug++; continue; }
  if (seenIncoming.has(it.slug)) { dupSlug++; continue; }
  seenIncoming.add(it.slug);
  if (existingSlugs.has(it.slug)) { dupSlug++; continue; }
  if (it.lat == null || it.lng == null) { noCoords++; continue; }

  const venue = (it.locationName || '').toLowerCase();
  const zip = zipOf(it.address) || zipOf(it.vendor?.venueZip);
  const venueDenied = EXCLUDE_VENUES.some((v) => venue.includes(v));
  const zipDenied = !KEEP_ALL_ZIPS && zip && !ALLOWED_ZIPS.has(zip);
  if (venueDenied || zipDenied) {
    otherHood++;
    const k = `${it.locationName} (${zip || '?'})`;
    otherList.set(k, (otherList.get(k) || 0) + 1);
    continue;
  }
  toAdd.push(normalize(it));
  added++;
}

console.log(`from ${FROM}: ${fromItems.length} items`);
console.log(`into ${INTO}: ${intoDoc.items.length} existing\n`);
console.log(`will ADD          ${added}`);
console.log(`skip duplicate    ${dupSlug}  (slug already present)`);
console.log(`skip other hood   ${otherHood}`);
console.log(`skip no coords    ${noCoords}`);
if (badSlug) console.log(`skip no slug      ${badSlug}`);
if (otherList.size) {
  console.log('\nother-neighborhood venues skipped:');
  for (const [k, n] of otherList) console.log(`  ${String(n).padStart(3)}  ${k}`);
}

if (DRY) { console.log('\nDRY RUN — nothing written. Re-run without --dry-run to apply.'); process.exit(0); }
if (!added) { console.log('\nNothing to add.'); process.exit(0); }

intoDoc.items.push(...toAdd);
writeFileSync(INTO, JSON.stringify(intoDoc, null, 1) + '\n', 'utf8');
console.log(`\n✅ wrote ${INTO} — now ${intoDoc.items.length} items (+${added}).`);
console.log('Next: node --env-file=.env seed-activities.mjs --create-only --file ' + INTO);
