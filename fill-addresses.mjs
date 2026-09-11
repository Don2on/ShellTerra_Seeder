#!/usr/bin/env node
/**
 * ShellTerra — fill real street addresses (and accurate coords) on activities.
 *
 * Maps each venue (by locationName) to a verified street address. Businesses are
 * geocoded via OpenStreetMap Nominatim for an accurate pin; rotating/area events
 * use a fixed neighborhood-centroid coordinate (no geocode).
 *
 * USAGE
 *   node fill-addresses.mjs            # dry run: print the plan, write nothing
 *   node fill-addresses.mjs --write    # update the JSON files in place
 *
 * After --write, re-seed each affected shell with seed-activities.mjs.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const WRITE = process.argv.includes('--write');

// address: verified street address to store in `address` (-> locationText)
// fixed:   [lat,lng] to use as-is (rotating/area events); skips geocoding
// Businesses omit `fixed` -> geocoded via Nominatim.
const MAP = {
  // ---- Hillcrest ----
  'Gossip Grill':                                    { address: '1220 University Ave, San Diego, CA 92103' },
  'EQ':                                              { address: '1271 University Ave, San Diego, CA 92103' },
  'Negociant Winery':                                { address: '1263 University Ave, San Diego, CA 92103' },
  'The Brass Rail':                                  { address: '3796 Fifth Ave, San Diego, CA 92103', fixed: [32.7466, -117.1605] },
  'Main Stage':                                      { address: '3796 Fifth Ave, San Diego, CA 92103', fixed: [32.7466, -117.1605] }, // room inside The Brass Rail
  'First Unitarian Universalist Church of San Diego':{ address: '4190 Front St, San Diego, CA 92103' },
  'Cork & Stem':                                     { address: '1035 University Ave, San Diego, CA 92103' },
  'SHIFT Pilates':                                   { address: '1419 University Ave, San Diego, CA 92103' },
  'All Saints Episcopal Church':                     { address: '625 Pennsylvania Ave, San Diego, CA 92103' },
  'RESET':                                           { address: '3904 Park Blvd, San Diego, CA 92103' },
  'R Place Bar & Eatery':                            { address: '1027 University Ave, San Diego, CA 92103' },
  'Breakfast Bitch':                                 { address: '3825 Fifth Ave, San Diego, CA 92103', fixed: [32.7469, -117.1604] },
  "Urban MO's Bar & Grill":                          { address: '308 University Ave, San Diego, CA 92103' },
  'Alibi':                                           { address: '1403 University Ave, San Diego, CA 92103' },
  'Hillcrest Brewing Company':                       { address: '1458 University Ave, San Diego, CA 92103' },
  'ArtReach San Diego':                              { address: '1065 University Ave, San Diego, CA 92103' },
  // rotating in Hillcrest -> Hillcrest centroid (University Ave & Fifth Ave)
  'Location provided after booking':                 { address: 'Hillcrest, San Diego, CA 92103', fixed: [32.7473, -117.1596] },
  'Restaurant of the Week':                          { address: 'Hillcrest, San Diego, CA 92103', fixed: [32.7473, -117.1596] },
  'Hillcrest area':                                  { address: 'Hillcrest, San Diego, CA 92103', fixed: [32.7473, -117.1596] },

  // ---- Gaslamp ----
  'GARAGE Kitchen + Bar':                            { address: '655 Fourth Ave, San Diego, CA 92101', fixed: [32.7108, -117.1607] },
  'Horton Plaza Park':                               { address: '900 Fourth Ave, San Diego, CA 92101', fixed: [32.7114, -117.1606] },
  // rotating in Gaslamp -> Gaslamp Quarter centroid
  'Gaslamp Quarter (rotating venue)':                { address: 'Gaslamp Quarter, San Diego, CA 92101', fixed: [32.7104, -117.1596] },
  'Gaslamp Quarter (venue TBC)':                     { address: 'Gaslamp Quarter, San Diego, CA 92101', fixed: [32.7104, -117.1596] },

  // ---- Pacific Beach ----
  'Fitness Quest 10 Pacific Beach':                  { address: '875 Garnet Ave, San Diego, CA 92109' },
  'San Diego Holistic Wellness':                     { address: '2180 Garnet Ave, San Diego, CA 92109' },
  'Revel Fit Club at MARA':                          { address: '4275 Mission Bay Dr, San Diego, CA 92109' },
  'Studio Golf San Diego':                           { address: '4275 Mission Bay Dr, San Diego, CA 92109' },
  'Cafe of Life Chiropractic':                       { address: '4535 Fanuel St, San Diego, CA 92109' },
  'Hideaway Pacific Beach':                          { address: '4474 Mission Blvd, San Diego, CA 92109' },
  'Mindful Matters Counseling':                      { address: '2180 Garnet Ave, San Diego, CA 92109' },
  'PorchLight Coffee':                               { address: '4865 Cass St, San Diego, CA 92109' },
  'Pueblo':                                          { address: '877 Hornblend St, San Diego, CA 92109' },
  'Flamingo Deck':                                   { address: '4110 Mission Blvd, San Diego, CA 92109' },
  'Pacific Beach Town Council':                      { address: '4033 Ingraham St, San Diego, CA 92109' }, // Crown Pt Jr Music Academy (meetings)
  // area / street events -> representative address, fixed coords
  'Crown Point Drive':                               { address: '3700 Crown Point Dr, San Diego, CA 92109', fixed: [32.7920, -117.2360] },
  'Crown Point Park (start line)':                   { address: '3700 Crown Point Dr, San Diego, CA 92109', fixed: [32.7920, -117.2360] },
  'Garnet Ave (Dawes St to Lamont St)':              { address: 'Garnet Ave & Lamont St, San Diego, CA 92109', fixed: [32.7986, -117.2340] },
  'Pacific Beach Boardwalk':                         { address: 'Ocean Front Walk & Garnet Ave, San Diego, CA 92109', fixed: [32.7972, -117.2556] },
  'Pacific Beach Boardwalk (start line)':            { address: 'Ocean Front Walk & Garnet Ave, San Diego, CA 92109', fixed: [32.7972, -117.2556] },
  // rotating in PB -> PB centroid (Garnet Ave & Cass St)
  'Pacific Beach (rotating restaurant)':             { address: 'Pacific Beach, San Diego, CA 92109', fixed: [32.7997, -117.2340] },
  'Pacific Beach, San Diego':                        { address: 'Pacific Beach, San Diego, CA 92109', fixed: [32.7997, -117.2340] },
};

const FILES = [
  'HillcrestActivities.json', 'HillcrestToDo.json',
  'GaslampActivities.json', 'GaslampCrawls.json',
  'PacificBeachActivities.json', 'PacificBeachCrawls.json',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'shellterra-seeder/1.0 (donturner@totempoleapp.com)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  if (!j.length) return null;
  return [Number(Number(j[0].lat).toFixed(6)), Number(Number(j[0].lon).toFixed(6))];
}

// Resolve a coordinate for every mapped venue.
const coords = {};
for (const [venue, m] of Object.entries(MAP)) {
  if (m.fixed) { coords[venue] = { ll: m.fixed, src: 'fixed' }; continue; }
  try {
    const ll = await geocode(m.address);
    coords[venue] = ll ? { ll, src: 'geocoded' } : { ll: null, src: 'GEOCODE-FAILED' };
  } catch (e) {
    coords[venue] = { ll: null, src: `ERROR ${e.message}` };
  }
  await sleep(1100); // Nominatim: max ~1 req/sec
}

console.log('\nVENUE ADDRESS + COORD PLAN');
for (const [venue, m] of Object.entries(MAP)) {
  const c = coords[venue];
  console.log(`  ${venue}`);
  console.log(`      -> ${m.address}`);
  console.log(`      -> ${c.ll ? c.ll.join(', ') : '(no coord)'}   [${c.src}]`);
}

// Apply to files.
let totalRows = 0;
for (const f of FILES) {
  let raw; try { raw = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
  const items = raw.items || [];
  let changed = 0;
  for (const it of items) {
    const m = MAP[(it.locationName || '').trim()];
    if (!m) continue;
    const c = coords[(it.locationName || '').trim()];
    it.address = m.address;
    if (c && c.ll) { it.lat = c.ll[0]; it.lng = c.ll[1]; }
    changed++;
  }
  totalRows += changed;
  console.log(`\n${f}: ${changed} rows updated`);
  if (WRITE && changed) writeFileSync(f, JSON.stringify(raw, null, 2) + '\n');
}

console.log(`\n${WRITE ? 'WROTE' : 'DRY RUN'} — ${totalRows} rows total across ${FILES.length} files.`);
if (!WRITE) console.log('Re-run with --write to apply.\n');
