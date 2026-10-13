#!/usr/bin/env node
/**
 * merge-verify.mjs — fold the verify-output-<region>.json corrections back into
 * each additions-<region>-raw.json (matched by name). Overlays corrected
 * address / phone / website / schedules, drops sites verified as not operating
 * or explicitly excluded, and applies manual coordinate overrides for addresses
 * Mapbox mis-pins. Overwrites the raw files in place so prepare re-reads them.
 *
 * USAGE: node merge-verify.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const REGIONS = [
  ['sacramento', './additions-sacramento-raw.json', './verify-output-sacramento.json'],
  ['yolo', './additions-yolo-raw.json', './verify-output-yolo.json'],
  ['longbeach', './additions-longbeach-raw.json', './verify-output-longbeach.json'],
  ['sanbernardino', './additions-sanbernardino-raw.json', './verify-output-sanbernardino.json'],
  ['nnv', './additions-nnv-raw.json', './verify-output-nnv.json'],
  ['la', './additions-la-raw.json', './verify-output-la.json'],
  ['sd', './additions-sd-raw.json', './verify-output-sd.json'],
  ['oc', './additions-oc-raw.json', './verify-output-oc.json'],
];

// Sites to drop outright (phantom / duplicate of an existing pin).
const DROP_NAME = [/J Street/i];
// Manual coordinate overrides: region -> {nameSubstring: [lat,lng]}
const MANUAL = {
  sd: { 'Mision Vida Nueva': [33.139923, -117.073702] }, // 980 N Ash St interpolated on-street (Mapbox mis-pins to Beverly Way)
  sanbernardino: { 'Set Free Church 29 Palms': [34.164260, -115.859290] }, // 82575 Amboy Rd rooftop (SB bbox clips -115.86)
  la: { "St. Mark's Church": [33.992347, -118.451654] }, // 940 Coeur D'Alene Ave Venice rooftop (Mapbox matches Johannesburg/Park Ave)
};

const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

let totalDrop = 0, totalFix = 0;
for (const [region, rawFile, verFile] of REGIONS) {
  const raw = JSON.parse(readFileSync(rawFile, 'utf8'));
  const ver = existsSync(verFile) ? JSON.parse(readFileSync(verFile, 'utf8')).sites : [];
  const byName = new Map(ver.map((v) => [norm(v.name), v]));
  const out = [];
  let drop = 0, fix = 0;

  for (const s of raw.sites) {
    if (DROP_NAME.some((re) => re.test(s.name))) { drop++; console.log(`  [${region}] DROP (excluded): ${s.name}`); continue; }
    const v = byName.get(norm(s.name));
    if (v) {
      if (v.operating === false) { drop++; console.log(`  [${region}] DROP (not operating): ${s.name}`); continue; }
      let changed = [];
      if (v.address && v.address !== s.address) { changed.push('addr'); s.address = v.address; }
      if (v.phone && v.phone !== s.phone) { changed.push('phone'); s.phone = v.phone; }
      if (v.website && v.website !== s.website) { changed.push('web'); s.website = v.website; }
      if (Array.isArray(v.schedules)) { // replace schedules (even with [] -> call-ahead)
        const before = JSON.stringify(s.schedules || []);
        if (JSON.stringify(v.schedules) !== before) changed.push('sched');
        s.schedules = v.schedules;
        if (!v.schedules.length && v.note) s.note = v.note;
      }
      if (v.verified) s.confidence = v.verified === 'high' ? 'high' : 'medium';
      if (changed.length) { fix++; console.log(`  [${region}] fix ${s.name}: ${changed.join(',')}`); }
    }
    // manual coordinate override
    const man = MANUAL[region];
    if (man) for (const [frag, [lat, lng]] of Object.entries(man)) {
      if (norm(s.name).includes(norm(frag))) { s.lat = lat; s.lng = lng; console.log(`  [${region}] manual coords ${s.name} -> ${lat},${lng}`); }
    }
    out.push(s);
  }

  raw.sites = out;
  writeFileSync(rawFile, JSON.stringify(raw, null, 2));
  console.log(`[${region}] ${out.length} sites kept, ${drop} dropped, ${fix} corrected\n`);
  totalDrop += drop; totalFix += fix;
}
console.log(`TOTAL: ${totalFix} sites corrected, ${totalDrop} dropped`);
