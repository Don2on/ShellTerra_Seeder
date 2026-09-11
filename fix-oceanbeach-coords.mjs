#!/usr/bin/env node
/**
 * ShellTerra — tighten the approximate OceanBeachActivities coordinates.
 *
 * Every OB pin came from unverified Eventbrite venue records. This geocodes each
 * venue's real STREET ADDRESS via OpenStreetMap Nominatim for an independent,
 * accurate pin. Results are accepted only if they land inside the OB bounding
 * box; anything outside is rejected and the original coord is kept (flagged).
 *
 * Area/beach/block-centroid venues (KEEP set) are intentionally not geocoded —
 * a rooftop pin would be wrong for them; their approximate centroid is correct.
 *
 *   node fix-oceanbeach-coords.mjs            # dry run: print the plan, write nothing
 *   node fix-oceanbeach-coords.mjs --write    # update OceanBeachActivities.json in place
 *
 * After --write, re-seed: SHELL_ID=6aa1aeb68b7e39770d76 node --env-file=.env \
 *   seed-activities.mjs --file OceanBeachActivities.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const WRITE = process.argv.includes('--write');
const FILE = 'OceanBeachActivities.json';

// OB bounding box (a little looser than the source search box) — a geocode
// outside this is wrong for Ocean Beach and gets rejected.
const BOX = { top: 32.770, bottom: 32.720, left: -117.270, right: -117.220 };

// Venues whose pin is intentionally an area/block/beach centroid, NOT a
// rooftop. Do not geocode these — keep their existing approximate coord.
const KEEP = new Set([
  'OB Farmers Market',            // 4900 block of Newport, closed to traffic
  'Newport Ave business district',
  'Newport Ave',                  // street-fair footprint
  'Newport Ave at the Pier',      // Oktoberfest footprint at foot of Newport
  'Ocean Beach',                  // bonfire on the sand, no fixed ring
]);

// Manual overrides that take precedence over geocoding. Geocoding a bare
// street name ("Adair St") snaps to the street centroid inland, but this class
// meets at the cliffs ACCESS where Adair meets Sunset Cliffs Blvd — the same
// corner the other Adair-cliffs yoga items use.
const OVERRIDE = {
  'Adair Street at the cliffs': [32.7356406, -117.2554619],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'shellterra-seeder/1.0 (donturner@totempoleapp.com)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  if (!j.length) return null;
  return [Number(Number(j[0].lat).toFixed(6)), Number(Number(j[0].lon).toFixed(6))];
}

const inBox = ([lat, lng]) =>
  lat <= BOX.top && lat >= BOX.bottom && lng >= BOX.left && lng <= BOX.right;

// Haversine, meters — how far the pin moved.
function metersBetween(a, b) {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)));
}

const raw = JSON.parse(readFileSync(FILE, 'utf8'));

// Unique venues, keyed by locationName -> {address, ll:[lat,lng]}
const venues = new Map();
for (const it of raw.items) {
  const ln = (it.locationName || '').trim();
  if (!venues.has(ln)) venues.set(ln, { address: it.address, ll: [it.lat, it.lng] });
}

// Resolve a tightened coord per venue.
const resolved = new Map();
for (const [ln, v] of venues) {
  if (OVERRIDE[ln]) { resolved.set(ln, { ll: OVERRIDE[ln], src: 'manual override', moved: metersBetween(v.ll, OVERRIDE[ln]) }); continue; }
  if (KEEP.has(ln)) { resolved.set(ln, { ll: v.ll, src: 'keep (area centroid)', moved: 0 }); continue; }
  let ll = null, src = '';
  try {
    ll = await geocode(v.address);
    if (!ll) { src = 'NO RESULT — kept original'; }
    else if (!inBox(ll)) { src = `OUT OF BOX ${ll.join(',')} — kept original`; ll = null; }
    else { src = 'geocoded'; }
  } catch (e) { src = `ERROR ${e.message} — kept original`; }
  if (ll) resolved.set(ln, { ll, src, moved: metersBetween(v.ll, ll) });
  else    resolved.set(ln, { ll: v.ll, src, moved: 0 });
  await sleep(1100); // Nominatim courtesy limit: ~1 req/sec
}

console.log('\nOCEAN BEACH COORD TIGHTENING PLAN');
console.log('(venue | moved | source)\n');
for (const [ln, r] of resolved) {
  const flag = /OUT OF BOX|NO RESULT|ERROR/.test(r.src) ? '  ⚠' : '';
  console.log(`  ${ln}`);
  console.log(`      ${r.ll.join(', ')}   moved ${r.moved}m   [${r.src}]${flag}`);
}

// Apply to items.
let changed = 0, big = 0;
for (const it of raw.items) {
  const r = resolved.get((it.locationName || '').trim());
  if (!r || !r.ll) continue;
  if (it.lat !== r.ll[0] || it.lng !== r.ll[1]) {
    it.lat = r.ll[0]; it.lng = r.ll[1]; changed++;
    if (r.moved > 150) big++;
  }
}

console.log(`\n${changed} item rows re-pinned (${big} moved >150m).`);
if (WRITE) { writeFileSync(FILE, JSON.stringify(raw, null, 2) + '\n'); console.log('WROTE ' + FILE); }
else console.log('DRY RUN — re-run with --write to apply, then re-seed.');
