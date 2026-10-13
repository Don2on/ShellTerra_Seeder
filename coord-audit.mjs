#!/usr/bin/env node
/**
 * coord-audit.mjs — independent coordinate sanity check for the seeded food
 * additions. For every vendor in the 8 <Region>Additions-vendors.json files it
 * REVERSE-geocodes the stored lat/lng (Mapbox) and compares the point Mapbox
 * reports back to the address ON FILE:
 *   - ZIP: stored-address ZIP vs the postcode at the coordinate
 *   - street #: stored street number vs the address number at the coordinate
 *   - precision: the reverse-geocode feature type (address/poi = good;
 *                place/region/postcode = the pin is only city/ZIP-level)
 * Flags MISMATCH (ZIP differs), NUMBER (street# differs), COARSE (low precision).
 * Writes coord-audit.csv and prints every flagged row. Read-only (no seeding).
 *
 * USAGE: node --env-file=.env coord-audit.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const TOKEN = process.env.MAPBOX_TOKEN;
if (!TOKEN) { console.error('Set MAPBOX_TOKEN'); process.exit(1); }

const FILES = [
  ['Sacramento', './SacAdditions-vendors.json'],
  ['Yolo', './YoloAdditions-vendors.json'],
  ['Long Beach', './LBAdditions-vendors.json'],
  ['San Bernardino', './SBAdditions-vendors.json'],
  ['Northern Nevada', './NNVAdditions-vendors.json'],
  ['Los Angeles', './LAAdditions-vendors.json'],
  ['San Diego', './SDAdditions3-vendors.json'],
  ['Orange County', './OCAdditions-vendors.json'],
];

const statedZip = (addr) => { const z = String(addr).match(/\b\d{5}\b/g); return z ? z[z.length - 1] : ''; };
const statedNo = (addr) => (String(addr).match(/(?:^|,\s*)(\d+)\s+[A-Za-z]/) || [])[1] || '';
const haversine = (a, b, c, d) => { const R = 6371000, r = Math.PI / 180, dLat = (c - a) * r, dLng = (d - b) * r; const x = Math.sin(dLat / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };

async function reverse(lng, lat) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${TOKEN}&types=address,poi&limit=1`;
  const res = await fetch(url); if (!res.ok) throw new Error('Mapbox ' + res.status);
  const f = (await res.json()).features?.[0]; if (!f) return null;
  const ctx = f.context || [];
  const postcode = (ctx.find((c) => c.id.startsWith('postcode')) || {}).text || '';
  return { place: f.place_name, number: f.address || '', type: f.place_type?.[0] || '?', postcode, center: f.center };
}
async function forward(addr) {
  const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(addr) + `.json?access_token=${TOKEN}&country=us&limit=1`;
  const res = await fetch(url); if (!res.ok) throw new Error('Mapbox ' + res.status);
  const f = (await res.json()).features?.[0]; return f ? { center: f.center, relevance: f.relevance } : null;
}

const COLS = ['region', 'flag', 'name', 'address', 'storedLat', 'storedLng', 'revZip', 'statedZip', 'revType', 'driftM', 'revPlace'];
const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const rows = [];
let total = 0, flaggedN = 0;

for (const [region, file] of FILES) {
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  for (const v of doc.vendors) {
    total++;
    const sZip = statedZip(v.address), sNo = statedNo(v.address);
    let rev = null, fwd = null;
    try { rev = await reverse(v.lng, v.lat); } catch (e) { /* noted below */ }
    try { fwd = await forward(v.address); } catch (e) {}
    const drift = fwd ? Math.round(haversine(v.lat, v.lng, fwd.center[1], fwd.center[0])) : '';
    const flags = [];
    if (rev) {
      if (sZip && rev.postcode && sZip !== rev.postcode) flags.push('ZIP');
      if (sNo && rev.number && sNo !== rev.number) flags.push('NUM');
      if (!['address', 'poi'].includes(rev.type)) flags.push('COARSE');
    } else flags.push('NOREV');
    if (drift !== '' && drift > 400) flags.push(`DRIFT${drift}m`);
    const flag = flags.join('+');
    if (flag) flaggedN++;
    rows.push({ region, flag, name: v.name, address: v.address, storedLat: v.lat, storedLng: v.lng,
      revZip: rev?.postcode || '', statedZip: sZip, revType: rev?.type || '', driftM: drift, revPlace: rev?.place || '' });
  }
}

writeFileSync('coord-audit.csv', '﻿' + [COLS.join(',')].concat(rows.map((r) => COLS.map((c) => csvCell(r[c])).join(','))).join('\r\n') + '\r\n', 'utf8');

console.log(`audited ${total} coordinates — ${flaggedN} flagged\n`);
for (const r of rows.filter((r) => r.flag).sort((a, b) => a.region.localeCompare(b.region))) {
  console.log(`[${r.flag}] ${r.region} — ${r.name}`);
  console.log(`   addr: ${r.address}`);
  console.log(`   pin:  ${r.storedLat},${r.storedLng}  rev=${r.revPlace || '(none)'} [${r.revType} zip ${r.revZip || '?'}] drift ${r.driftM}m\n`);
}
console.log('Full table -> coord-audit.csv');
