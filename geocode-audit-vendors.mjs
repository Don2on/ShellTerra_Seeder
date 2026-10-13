#!/usr/bin/env node
/**
 * geocode-audit-vendors.mjs — re-geocode every vendor's address with Mapbox and
 * compare to the stored lat/lng. AUDIT ONLY — writes nothing back to Appwrite.
 *
 * Produces:
 *   geocode-audit.json  — full machine-readable record for every vendor
 *   geocode-audit.csv   — the same, Excel-friendly, sorted by drift (worst first)
 *
 * A vendor is FLAGGED when:
 *   - Mapbox moved the pin > DRIFT_M metres from the stored coord, OR
 *   - Mapbox could only return a low-confidence match (relevance < 1 or a
 *     street-level / non-house-number result), OR
 *   - it has no stored coord, or no address to geocode.
 *
 * Confidence signals captured per row: relevance (0..1), accuracy
 * (rooftop|parcel|point|interpolated|street|...), and whether the match
 * carried a house number.
 *
 * USAGE
 *   node --env-file=.env geocode-audit-vendors.mjs
 *   node --env-file=.env geocode-audit-vendors.mjs --drift 150 --limit 50
 */

import { Client, Databases, Query } from 'node-appwrite';
import { writeFileSync } from 'node:fs';
import process from 'node:process';

const CFG = {
  endpoint:   process.env.APPWRITE_ENDPOINT,
  projectId:  process.env.APPWRITE_PROJECT_ID,
  apiKey:     process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID,
  vendors:    process.env.VENDORS_COLLECTION_ID || 'vendors',
  shells:     process.env.SHELLS_COLLECTION_ID,
  mapbox:     process.env.MAPBOX_TOKEN,
};

const args  = process.argv.slice(2);
const valOf = (f) => { const i = args.indexOf(f); return i > -1 ? args[i + 1] : null; };
const DRIFT_M   = Number(valOf('--drift') || 150);   // flag threshold, metres
const LIMIT     = valOf('--limit') ? Number(valOf('--limit')) : null; // debug cap
const CONCURRENCY = 8;

function requireConfig(keys) {
  const missing = keys.filter((k) => !CFG[k]);
  if (missing.length) { console.error('Missing env vars for:', missing.join(', ')); process.exit(1); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Haversine distance in metres.
function distM(aLat, aLng, bLat, bLng) {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function geocode(addr) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addr)}.json` +
    `?access_token=${CFG.mapbox}&limit=1&country=US&types=address,poi`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url);
    if (r.status === 429) { await sleep(1500 * (attempt + 1)); continue; }
    if (!r.ok) throw new Error(`Mapbox ${r.status} for "${addr}"`);
    const j = await r.json();
    const f = j.features?.[0];
    if (!f) return null;
    return {
      lat: f.center[1],
      lng: f.center[0],
      relevance: f.relevance ?? null,
      accuracy: f.properties?.accuracy ?? null,
      hasHouseNumber: f.address != null || /^address/.test(f.id || ''),
      placeName: f.place_name,
    };
  }
  throw new Error(`Mapbox rate-limited repeatedly for "${addr}"`);
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function pageAll(db, collection) {
  const docs = [];
  let cursor = null;
  while (true) {
    const q = [Query.limit(100)];
    if (cursor) q.push(Query.cursorAfter(cursor));
    const res = await db.listDocuments(CFG.databaseId, collection, q);
    docs.push(...res.documents);
    if (res.documents.length < 100) break;
    cursor = res.documents.at(-1).$id;
  }
  return docs;
}

async function run() {
  requireConfig(['endpoint', 'projectId', 'apiKey', 'databaseId', 'mapbox']);

  const client = new Client()
    .setEndpoint(CFG.endpoint).setProject(CFG.projectId).setKey(CFG.apiKey);
  const db = new Databases(client);

  const shellName = new Map();
  if (CFG.shells) {
    for (const s of await pageAll(db, CFG.shells)) shellName.set(s.$id, s.name ?? s.title ?? '');
  }

  let vendors = await pageAll(db, CFG.vendors);
  if (LIMIT) vendors = vendors.slice(0, LIMIT);
  console.log(`Auditing ${vendors.length} vendor(s) against Mapbox (drift threshold ${DRIFT_M}m)...\n`);

  // Cache geocodes by normalized address so duplicate sites cost one call.
  const cache = new Map();
  const rows = [];
  let done = 0;

  async function handle(v) {
    const addr = (v.address || '').trim();
    const base = {
      shellName: shellName.get(v.shellID) || '',
      shellID: v.shellID, docId: v.$id, name: v.name, address: addr,
      storedLat: v.latitude ?? null, storedLng: v.longitude ?? null,
    };

    if (!addr) {
      rows.push({ ...base, flag: 'NO_ADDRESS', reason: 'no address to geocode' });
      return;
    }
    let geo;
    try {
      if (cache.has(addr)) geo = cache.get(addr);
      else { geo = await geocode(addr); cache.set(addr, geo); }
    } catch (e) {
      rows.push({ ...base, flag: 'GEOCODE_ERROR', reason: e.message });
      return;
    }
    if (!geo) {
      rows.push({ ...base, flag: 'NO_MATCH', reason: 'Mapbox returned no result' });
      return;
    }

    const hasStored = Number.isFinite(base.storedLat) && Number.isFinite(base.storedLng);
    const drift = hasStored ? distM(base.storedLat, base.storedLng, geo.lat, geo.lng) : null;
    const lowConf = (geo.relevance ?? 0) < 1 || geo.accuracy === 'street' || !geo.hasHouseNumber;

    let flag = 'OK';
    const reasons = [];
    if (!hasStored) { flag = 'NO_STORED_COORD'; reasons.push('no stored coord'); }
    else if (drift > DRIFT_M) { flag = 'DRIFT'; reasons.push(`moved ${Math.round(drift)}m`); }
    if (lowConf) {
      if (flag === 'OK') flag = 'LOW_CONFIDENCE';
      reasons.push(`relevance ${geo.relevance}${geo.accuracy ? ', acc=' + geo.accuracy : ''}${geo.hasHouseNumber ? '' : ', no house#'}`);
    }

    rows.push({
      ...base,
      mapboxLat: Number(geo.lat.toFixed(6)), mapboxLng: Number(geo.lng.toFixed(6)),
      driftM: drift === null ? null : Math.round(drift),
      relevance: geo.relevance, accuracy: geo.accuracy, hasHouseNumber: geo.hasHouseNumber,
      mapboxPlaceName: geo.placeName,
      flag, reason: reasons.join('; '),
    });
  }

  // Simple worker pool over the vendor list.
  let idx = 0;
  async function worker() {
    while (idx < vendors.length) {
      const my = idx++;
      await handle(vendors[my]);
      if (++done % 100 === 0) console.log(`  ${done}/${vendors.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Sort worst-first: real drift distance desc, then flagged, then the rest.
  const order = { GEOCODE_ERROR: 5, NO_MATCH: 4, NO_ADDRESS: 4, NO_STORED_COORD: 3, DRIFT: 2, LOW_CONFIDENCE: 1, OK: 0 };
  rows.sort((a, b) =>
    (b.driftM ?? -1) - (a.driftM ?? -1) ||
    (order[b.flag] || 0) - (order[a.flag] || 0) ||
    (a.shellName || '').localeCompare(b.shellName || ''));

  writeFileSync('geocode-audit.json', JSON.stringify(rows, null, 2), 'utf8');

  const COLS = ['flag', 'reason', 'shellName', 'name', 'address', 'storedLat', 'storedLng',
    'mapboxLat', 'mapboxLng', 'driftM', 'relevance', 'accuracy', 'hasHouseNumber', 'mapboxPlaceName', 'docId', 'shellID'];
  const csv = ['﻿' + COLS.join(',')];
  for (const r of rows) csv.push(COLS.map((c) => csvCell(r[c])).join(','));
  writeFileSync('geocode-audit.csv', csv.join('\r\n') + '\r\n', 'utf8');

  // Summary.
  const by = {};
  for (const r of rows) by[r.flag] = (by[r.flag] || 0) + 1;
  const flagged = rows.filter((r) => r.flag !== 'OK');
  console.log(`\nDone. ${rows.length} audited, ${flagged.length} flagged.\n`);
  for (const [k, n] of Object.entries(by).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${k}`);
  }
  console.log('\nWorst 15 by drift:');
  for (const r of rows.filter((r) => r.flag === 'DRIFT').slice(0, 15)) {
    console.log(`  ${String(r.driftM).padStart(6)}m  ${r.shellName.padEnd(26)} ${r.name} — ${r.address}`);
  }
  console.log('\nWrote geocode-audit.json and geocode-audit.csv');
}

run().catch((e) => { console.error(e.message); process.exit(1); });
