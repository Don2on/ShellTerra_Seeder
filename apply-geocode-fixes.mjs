#!/usr/bin/env node
/**
 * apply-geocode-fixes.mjs — write the high-confidence coordinate corrections
 * from geocode-audit.json back to the `vendors` collection.
 *
 * Only applies rows the audit flagged as DRIFT with a PRECISE Mapbox match:
 *   relevance === 1  AND  a house-number match  AND
 *   accuracy is rooftop | parcel | point (exact building/parcel).
 * Excluded from auto-apply (left for manual review): low-confidence drifts, plus
 * 'interpolated'/'approximate' matches — these estimate position along a street
 * or area centroid and can land on the wrong segment far from the real site.
 *
 * Updates only latitude/longitude; all other attributes and the document's
 * permissions are left untouched.
 *
 * USAGE
 *   node --env-file=.env apply-geocode-fixes.mjs            # dry-run (default)
 *   node --env-file=.env apply-geocode-fixes.mjs --apply    # write to Appwrite
 */

import { Client, Databases } from 'node-appwrite';
import { readFileSync } from 'node:fs';
import process from 'node:process';

const CFG = {
  endpoint:   process.env.APPWRITE_ENDPOINT,
  projectId:  process.env.APPWRITE_PROJECT_ID,
  apiKey:     process.env.APPWRITE_API_KEY,
  databaseId: process.env.APPWRITE_DATABASE_ID,
  vendors:    process.env.VENDORS_COLLECTION_ID || 'vendors',
};

const APPLY = process.argv.includes('--apply');

function requireConfig(keys) {
  const missing = keys.filter((k) => !CFG[k]);
  if (missing.length) { console.error('Missing env vars for:', missing.join(', ')); process.exit(1); }
}

const PRECISE = new Set(['rooftop', 'parcel', 'point']);
function isTrustworthy(r) {
  return r.flag === 'DRIFT' && r.relevance === 1 && r.hasHouseNumber === true && PRECISE.has(r.accuracy);
}

async function run() {
  requireConfig(['endpoint', 'projectId', 'apiKey', 'databaseId']);

  const rows = JSON.parse(readFileSync('geocode-audit.json', 'utf8'));
  const fixes = rows.filter(isTrustworthy)
    .sort((a, b) => b.driftM - a.driftM);

  if (!fixes.length) { console.log('No high-confidence corrections found in geocode-audit.json.'); return; }

  console.log(`${fixes.length} high-confidence correction(s)${APPLY ? ' — APPLYING' : ' — DRY RUN (no writes)'}\n`);
  for (const r of fixes) {
    console.log(`${String(r.driftM).padStart(6)}m  ${r.shellName.padEnd(24)} ${r.name}`);
    console.log(`         ${r.address}`);
    console.log(`         ${r.storedLat},${r.storedLng}  ->  ${r.mapboxLat},${r.mapboxLng}  (${r.accuracy}, rel ${r.relevance})`);
  }

  if (!APPLY) {
    console.log(`\nDry run. Re-run with --apply to write these ${fixes.length} correction(s).`);
    return;
  }

  const client = new Client()
    .setEndpoint(CFG.endpoint).setProject(CFG.projectId).setKey(CFG.apiKey);
  const db = new Databases(client);

  let ok = 0, fail = 0;
  for (const r of fixes) {
    try {
      await db.updateDocument(CFG.databaseId, CFG.vendors, r.docId, {
        latitude: r.mapboxLat, longitude: r.mapboxLng,
      });
      ok++;
    } catch (e) {
      fail++;
      console.error(`FAIL ${r.name} (${r.docId}): ${e.message}`);
    }
  }
  console.log(`\nApplied ${ok} correction(s), ${fail} failed.`);
}

run().catch((e) => { console.error(e.message); process.exit(1); });
