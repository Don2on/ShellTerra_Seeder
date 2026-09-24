#!/usr/bin/env node
/**
 * build-capoc-vendors.mjs — geocode the net-new OC Food Bank partner sites
 * (OC-capoc-new.json) and emit them as call-ahead vendor cards for the
 * FoodDistributionOC shell. These sites publish no distribution schedule, so
 * they carry no events[] — they render as "call ahead" cards (hours vary).
 *
 * Coordinates come from Mapbox. Because a geocoder returns a city centroid on
 * failure rather than erroring, every pin is checked against known OC city
 * centroids and low-relevance matches are flagged in capoc-geocode-review.txt —
 * READ IT before seeding; a wrong pin sends someone who needs food to the wrong
 * place.
 *
 * USAGE: node --env-file=.env build-capoc-vendors.mjs
 * Writes OC-capoc-vendors.json (+ capoc-geocode-review.txt).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const TOKEN = process.env.MAPBOX_TOKEN;
const SHELL_ID = '6aac35296621e11030a0'; // FoodDistributionOC
if (!TOKEN) { console.error('Set MAPBOX_TOKEN (node --env-file=.env build-capoc-vendors.mjs)'); process.exit(1); }

const CENTROIDS = [
  ['Santa Ana', 33.7455, -117.8677], ['Anaheim', 33.8366, -117.9143],
  ['Garden Grove', 33.7739, -117.9414], ['Irvine', 33.6846, -117.8265],
  ['Fullerton', 33.8704, -117.9243], ['Costa Mesa', 33.6411, -117.9187],
  ['Huntington Beach', 33.6595, -117.9988], ['Orange', 33.7879, -117.8531],
  ['Tustin', 33.7458, -117.8261], ['Westminster', 33.7514, -117.9940],
  ['Buena Park', 33.8675, -117.9981], ['Stanton', 33.8003, -117.9931],
  ['Cypress', 33.8169, -118.0373], ['Placentia', 33.8722, -117.8703],
];
const centroidHit = (lat, lng) => CENTROIDS.find(([, la, ln]) => Math.abs(la - lat) < 0.004 && Math.abs(ln - lng) < 0.004);

// Constrain results to an Orange County bounding box so same-named streets in
// LA County (e.g. Euclid Ave in Pasadena) can't win.
const OC_BBOX = '-118.15,33.35,-117.40,33.95';
const PRECISE = new Set(['rooftop', 'parcel', 'address', 'point']);
// Source has stray spaces in ordinals ("4 th St" -> "4th St") that derail the geocoder.
const cleanAddr = (a) => a.replace(/\b(\d+)\s+(st|nd|rd|th)\b/gi, '$1$2').replace(/\s+/g, ' ').trim();
async function geocode(rawAddress) {
  const address = cleanAddr(rawAddress);
  const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/'
    + encodeURIComponent(address) + `.json?access_token=${TOKEN}&country=us&limit=1&proximity=-117.8677,33.7455&bbox=${OC_BBOX}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox ${res.status}`);
  const j = await res.json();
  const f = j.features?.[0];
  if (!f) return null;
  const [lng, lat] = f.center;
  return { lat, lng, matched: f.place_name, relevance: f.relevance, accuracy: f.properties?.accuracy || f.place_type?.[0] || '?' };
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
// Inside OC bbox with a usable relevance — else the address doesn't resolve in
// OC (out-of-county site or bad street) and a call-ahead card with a wrong pin
// is worse than none, so we exclude it and list it for manual review.
const inOC = (lat, lng) => lat >= 33.35 && lat <= 33.95 && lng >= -118.15 && lng <= -117.40;

const sites = JSON.parse(readFileSync('./OC-capoc-new.json', 'utf8'));
const vendors = [];
const review = [];
const excluded = [];
let failed = 0, suspect = 0;
const usedSlugs = new Set();

for (const s of sites) {
  let geo = null;
  try { geo = await geocode(s.address); }
  catch (e) { review.push(`ERROR    ${s.name}: ${e.message}`); failed++; }

  if (geo && (!inOC(geo.lat, geo.lng) || geo.relevance < 0.6)) {
    excluded.push(`EXCLUDED (rel ${geo.relevance.toFixed(2)}, ${inOC(geo.lat, geo.lng) ? 'low relevance' : 'outside OC'})  ${s.name} | ${s.address}\n    matched: ${geo.matched}`);
    continue;
  }

  if (!geo) { review.push(`NO MATCH ${s.name} | ${s.address}`); failed++; }
  else {
    // Only suspect a centroid fallback when the match is ALSO imprecise; a
    // rooftop/parcel hit that merely sits near the city center is fine.
    const c = !PRECISE.has(geo.accuracy) && centroidHit(geo.lat, geo.lng);
    const flag = c ? `SUSPECT (${c[0]} centroid)` : geo.relevance < 0.75 ? `LOW RELEVANCE ${geo.relevance.toFixed(2)}` : 'ok';
    if (flag !== 'ok') suspect++;
    review.push(`${flag.padEnd(28)} ${s.name}\n    input:   ${s.address}\n    matched: ${geo.matched}\n    coords:  ${geo.lat}, ${geo.lng}  [${geo.accuracy}]`);
  }

  let slug = slugify(`${s.name}-${s.city}`); let base = slug, i = 2;
  while (usedSlugs.has(slug)) slug = `${base}-${i++}`;
  usedSlugs.add(slug);

  vendors.push({
    slug, name: s.name, category: 'Food Assistance',
    tagline: 'Call ahead — OC Food Bank partner site',
    description: `Free food distribution site (OC Food Bank / Community Action Partnership of Orange County partner). No fixed public schedule is published${s.phone ? ` — call ${s.phone}` : ' — call 2-1-1'} to confirm current distribution days and hours before you go. Distributions often end early when supplies run out. Source: capoc.org distribution partners.`,
    logoUrl: '', website: 'https://www.capoc.org/distribution-partners/', phone: s.phone, email: '',
    instagram: '', facebook: '', tiktok: '',
    address: s.address, lat: geo?.lat ?? null, lng: geo?.lng ?? null,
    neighborhood: s.city.replace(/\b\w/g, (c) => c.toUpperCase()), hours: 'Call ahead — schedule varies',
    featured: false, verified: false, events: [], _eventCount: 0, _source: 'capoc',
  });
}

const out = {
  _comment: 'Net-new OC Food Bank (capoc.org) partner sites NOT already in FoodDistributionOC. No published schedule -> call-ahead cards (no events). Geocoded via Mapbox; read capoc-geocode-review.txt before seeding. Seed additively with seed-vendors.mjs --create-only.',
  _shell: 'FoodDistributionOC', _shellId: SHELL_ID, _collection: 'vendors',
  _source: 'Community Action Partnership of Orange County — OC Food Bank distribution partners (capoc.org), diffed against live shell vendors — Sep 2026.',
  _verify_before_running: 'Seed with --create-only so existing hand-tuned rows are untouched. Confirm capoc-geocode-review.txt has no wrong pins.',
  vendors,
};
writeFileSync('./OC-capoc-vendors.json', JSON.stringify(out, null, 2));
writeFileSync('./capoc-geocode-review.txt', [...review, '', '--- EXCLUDED (not seeded) ---', ...excluded].join('\n\n') + '\n');
console.log(`wrote OC-capoc-vendors.json — ${vendors.length} call-ahead cards`);
console.log(`  geocode: ${vendors.length} kept, ${excluded.length} excluded (out-of-OC / unresolved), ${suspect} flagged SUSPECT/LOW`);
console.log(`READ capoc-geocode-review.txt — ${suspect} flagged + ${excluded.length} excluded to review.`);
