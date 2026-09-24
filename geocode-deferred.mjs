#!/usr/bin/env node
/**
 * geocode-deferred.mjs — fill address + lat/lng on the _deferredEnrichment entries
 * in OceanBeachVendors.json / PacificBeachVendors.json from a 2026-09-16 research
 * pass, geocoding each street address via Nominatim. DOES NOT SEED — these vendors
 * stay OUT of the vendors collection (excluded from app + website) until explicitly added.
 *
 *   node geocode-deferred.mjs           # dry run
 *   node geocode-deferred.mjs --write   # write the files
 */
import { readFileSync, writeFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');

// slug -> researched address (null = no fixed public address; not geocoded).
const ADDR = {
  // Ocean Beach
  'mortarless-bricks':              { file: 'OB', address: '4967 Newport Ave #13, San Diego, CA 92107', src: 'directory.oceanbeachsandiego.com', conf: 'high' },
  'ocean-beach-historical-society': { file: 'OB', address: '1984 Sunset Cliffs Blvd, San Diego, CA 92107', src: 'obhistory.org/archives', conf: 'medium', note: 'Archive/mailing address (upstairs at Water’s Edge Church); appointment-only, not a walk-in.' },
  'ob-mainstreet-association':      { file: 'OB', address: '1868 Bacon St Ste A, San Diego, CA 92107', src: 'oceanbeachsandiego.com', conf: 'high' },
  'ocean-beach-green-center':       { file: 'OB', address: '4862 Voltaire St, San Diego, CA 92107', src: 'oceanbeachgreencenter.org', conf: 'medium', note: 'Public hours reduced (film nights on hold) but location active.' },
  'the-street-dog-coalition':       { file: 'OB', address: null, src: 'thestreetdogcoalition.org/san-diego-ca', conf: 'high', note: 'Mobile/clinic-at-host-site only; national HQ in Fort Collins CO. OB clinic hosted at 2083 Sunset Cliffs Blvd (Episcopal Church Center).' },
  // Pacific Beach
  'discover-pacific-beach':         { file: 'PB', address: '1001 Garnet Ave Suite 200, San Diego, CA 92109', src: 'pacificbeach.org/contact', conf: 'high' },
  'san-diego-running-co':           { file: 'PB', address: '4629 Cass St, San Diego, CA 92109', src: 'sandiegorunningco.com (footer)', conf: 'low-medium', note: 'Business/office address, NOT a public storefront.' },
};

const BOX = {
  OB: { top: 32.770, bottom: 32.720, left: -117.270, right: -117.220 },
  PB: { top: 32.825, bottom: 32.780, left: -117.270, right: -117.215 },
};
const inBox = (b, lat, lng) => lat <= b.top && lat >= b.bottom && lng >= b.left && lng <= b.right;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocodeOnce(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'shellterra-seeder/1.0 (donturner@totempoleapp.com)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  if (!j.length) return null;
  return [Number(Number(j[0].lat).toFixed(6)), Number(Number(j[0].lon).toFixed(6))];
}
// Nominatim fails on unit/suite tokens (#13, Ste A, Suite 200); retry without them.
const stripUnit = (a) => a.replace(/\s*(#\S+|(ste|suite|unit|apt)\.?\s+\S+)\s*,?/gi, ',').replace(/,\s*,/g, ',').replace(/,\s*,/g, ',');
async function geocode(q) {
  let ll = await geocodeOnce(q);
  if (ll) return ll;
  const stripped = stripUnit(q);
  if (stripped !== q) { await sleep(1100); ll = await geocodeOnce(stripped); }
  return ll;
}

const files = {
  OB: { path: './OceanBeachVendors.json', json: null },
  PB: { path: './PacificBeachVendors.json', json: null },
};
for (const k of Object.keys(files)) files[k].json = JSON.parse(readFileSync(files[k].path, 'utf8'));

for (const [slug, info] of Object.entries(ADDR)) {
  const de = files[info.file].json._deferredEnrichment;
  if (!de || !de[slug]) { console.log(`  ?? ${slug} not found in ${info.file} _deferredEnrichment`); continue; }
  const entry = de[slug];
  if (info.address == null) {
    entry.address = '';
    entry.lat = null; entry.lng = null;
    entry._addressSource = info.src; entry._addressConfidence = info.conf; entry._addressNote = info.note || 'No fixed public address.';
    console.log(`  ${slug.padEnd(32)} NO FIXED ADDRESS (null coords)  [${info.note || ''}]`);
    continue;
  }
  let ll = null, status = '';
  try {
    ll = await geocode(info.address);
    if (!ll) status = 'NO RESULT';
    else if (!inBox(BOX[info.file], ll[0], ll[1])) { status = `OUT OF BOX ${ll.join(',')}`; ll = null; }
    else status = 'geocoded';
  } catch (e) { status = `ERROR ${e.message}`; }
  entry.address = info.address;
  entry.lat = ll ? ll[0] : null;
  entry.lng = ll ? ll[1] : null;
  entry._addressSource = info.src; entry._addressConfidence = info.conf;
  if (info.note) entry._addressNote = info.note;
  console.log(`  ${slug.padEnd(32)} ${(ll ? ll.join(', ') : 'null').padEnd(24)} [${status}] "${info.address}"`);
  await sleep(1100);
}

if (WRITE) {
  for (const k of Object.keys(files)) writeFileSync(files[k].path, JSON.stringify(files[k].json, null, 2));
  console.log('\nWROTE OceanBeachVendors.json + PacificBeachVendors.json (deferred entries only; NOT seeded).');
} else {
  console.log('\nDRY RUN — re-run with --write to save. (Nothing is ever seeded by this script.)');
}
