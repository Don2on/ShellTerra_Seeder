#!/usr/bin/env node
/**
 * scrape-la-pantries.mjs — harvest every partner agency from the LA Regional
 * Food Bank pantry locator (WP Store Locator plugin).
 *
 * The locator's admin-ajax endpoint returns at most 25 records per query and
 * ignores large search radii, so a single query can't enumerate the county.
 * We grid-scan LA County, dedup by the plugin's store `id`, and adaptively
 * re-query any cell that came back saturated (exactly 25 hits) at finer
 * resolution — guaranteeing we don't silently truncate dense clusters.
 *
 * Field quirks discovered on the wire:
 *   - `fax`   actually carries the human distribution schedule text
 *             (e.g. "2nd and 4th Saturdays 10 AM-12 PM"). This is the signal.
 *   - `hours` is a boilerplate 9-5 Mon-Fri table on most records — noise.
 *   - lat/lng are provided directly, so no geocoding needed downstream.
 *
 * Writes LA-pantries-raw.json (deduped array of raw plugin records).
 *
 * USAGE: node scrape-la-pantries.mjs
 */
import { writeFileSync } from 'node:fs';

const ENDPOINT = 'https://www.lafoodbank.org/wp-admin/admin-ajax.php';
const MAX = 25; // server hard cap per query

// LA County service area bounding box (covers urban core + San Fernando/
// San Gabriel valleys; Antelope Valley added coarsely below).
const CORE = { latMin: 33.70, latMax: 34.42, lngMin: -118.70, lngMax: -117.60 };
const STEP = 0.035;            // ~2.4 mi — dense enough for 25-record cells
const REFINE_STEP = 0.015;     // sub-grid for saturated cells

const seen = new Map();        // id -> record
let queries = 0;

async function query(lat, lng, radius = 25) {
  const url = `${ENDPOINT}?action=store_search&lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}&max_results=${MAX}&search_radius=${radius}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      queries++;
      return Array.isArray(j) ? j : [];
    } catch (e) {
      if (attempt === 3) { console.error('  ! failed', lat, lng, e.message); return []; }
      await new Promise(res => setTimeout(res, 400 * (attempt + 1)));
    }
  }
  return [];
}

function absorb(recs) {
  let fresh = 0;
  for (const rec of recs) {
    if (!seen.has(rec.id)) { seen.set(rec.id, rec); fresh++; }
  }
  return fresh;
}

// Simple concurrency pool over a list of {lat,lng} points.
async function scanPoints(points, radius, label) {
  const saturated = [];
  const POOL = 6;
  let i = 0;
  async function worker() {
    while (i < points.length) {
      const p = points[i++];
      const recs = await query(p.lat, p.lng, radius);
      absorb(recs);
      if (recs.length >= MAX) saturated.push(p);
      if (queries % 40 === 0) console.log(`  ${label}: ${queries} queries, ${seen.size} unique so far`);
    }
  }
  await Promise.all(Array.from({ length: POOL }, worker));
  return saturated;
}

const coarse = [];
for (let lat = CORE.latMin; lat <= CORE.latMax; lat += STEP)
  for (let lng = CORE.lngMin; lng <= CORE.lngMax; lng += STEP)
    coarse.push({ lat, lng });

// Antelope Valley (Lancaster/Palmdale) — sparse, coarse coverage.
for (let lat = 34.45; lat <= 34.80; lat += 0.08)
  for (let lng = -118.30; lng <= -117.75; lng += 0.08)
    coarse.push({ lat, lng });

console.log(`Coarse grid: ${coarse.length} points @ ${STEP}°`);
const saturated = await scanPoints(coarse, 25, 'coarse');
console.log(`Coarse done: ${queries} queries, ${seen.size} unique. Saturated cells: ${saturated.length}`);

// Adaptive refinement: sub-grid every saturated cell.
if (saturated.length) {
  const refine = [];
  for (const c of saturated) {
    for (let dl = 0; dl <= STEP; dl += REFINE_STEP)
      for (let dg = 0; dg <= STEP; dg += REFINE_STEP)
        refine.push({ lat: c.lat + dl, lng: c.lng + dg });
  }
  console.log(`Refining ${saturated.length} saturated cells: ${refine.length} points @ ${REFINE_STEP}°`);
  const stillSat = await scanPoints(refine, 8, 'refine');
  console.log(`Refine done: ${queries} total queries, ${seen.size} unique. Still-saturated: ${stillSat.length}`);
}

const out = [...seen.values()];
writeFileSync('./LA-pantries-raw.json', JSON.stringify(out, null, 2));
console.log(`\nWrote LA-pantries-raw.json — ${out.length} unique agencies in ${queries} queries.`);
