#!/usr/bin/env node
/**
 * ShellTerra — patch verified coords/addresses into the two Hillcrest files,
 * and move unresolvable placeholder venues out of items[] into _deferred_placeholders.
 * Corrections from external venue verification (Sep 2026).
 *
 *   node fix-hillcrest-coords.mjs           # dry run
 *   node fix-hillcrest-coords.mjs --write   # apply
 *
 * NOTE: intentionally does NOT touch Breakfast Bitch (shuck-n-chill-date-nite) —
 * that closed-venue decision is pending.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const WRITE = process.argv.includes('--write');
const FILES = ['HillcrestActivities.json', 'HillcrestToDo.json'];

// exact-slug fixes
const PER_SLUG = {
  'hillcrest-car-show':       { address: 'Fifth Ave and Pennsylvania Ave, San Diego, CA 92103', lat: 32.7450, lng: -117.1607 },
  'hillcrest-farmers-market': { lat: 32.7484099, lng: -117.1483296 },
};
// slug-prefix fixes (dated occurrences)
const PER_PREFIX = {
  'napcp-photography-meetup': { lat: 32.7485152, lng: -117.1602631 },
  'hobby-hoes-of-sd-ufo':     { lat: 32.7482510, lng: -117.1544260 },
};
// venue coord corrections (by locationName)
const VENUE = {
  'Negociant Winery':                                 [32.7482963, -117.1519921],
  "Rich's":                                           [32.7482628, -117.1540341],
  'The Brass Rail':                                   [32.7468303, -117.1607394],
  'Main Stage':                                       [32.7468303, -117.1607394], // room inside The Brass Rail
  'Gossip Grill':                                     [32.7488029, -117.1530762],
  'First Unitarian Universalist Church of San Diego': [32.7533040, -117.1665614],
  'Hillcrest Brewing Company':                        [32.7490365, -117.1498417],
  'ArtReach San Diego':                               [32.7481624, -117.1536816],
};
// placeholder venues with no resolvable address -> move to _deferred_placeholders
const DEFER = new Set(['Location provided after booking', 'Restaurant of the Week', 'Hillcrest area']);

for (const f of FILES) {
  let raw; try { raw = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
  const keep = [], deferred = [];
  let coordFix = 0, addrFix = 0;

  for (const it of raw.items) {
    const ln = (it.locationName || '').trim();
    if (DEFER.has(ln)) { deferred.push(it); continue; }

    const slug = it.slug || '';
    const p = PER_SLUG[slug] || Object.entries(PER_PREFIX).find(([pre]) => slug.startsWith(pre))?.[1];
    if (p) {
      if (p.lat != null) { it.lat = p.lat; it.lng = p.lng; coordFix++; }
      if (p.address) { it.address = p.address; addrFix++; }
    } else if (VENUE[ln]) {
      it.lat = VENUE[ln][0]; it.lng = VENUE[ln][1]; coordFix++;
    }
    // clean the misplaced flag: if it has real coords, it doesn't "need geocode"
    if (it._needsGeocode && it.lat != null && it.lng != null && slug !== 'shuck-n-chill-date-nite-2026-09-12') {
      delete it._needsGeocode;
    }
    keep.push(it);
  }

  raw.items = keep;
  if (deferred.length) {
    raw._deferred_placeholders = {
      _why: 'Placeholder venues with no resolvable street address (Cozymeal sends location after booking; "Restaurant of the Week" and "Hillcrest area" rotate). Do not seed with a neighborhood-centroid pin. Restore to items[] only with a real address + start.',
      items: deferred,
    };
  }

  console.log(`${f}: ${coordFix} coords fixed, ${addrFix} addresses set, ${deferred.length} deferred (${keep.length} remain in items[])`);
  if (WRITE) writeFileSync(f, JSON.stringify(raw, null, 2) + '\n');
}
console.log(`\n${WRITE ? 'WROTE' : 'DRY RUN — re-run with --write to apply'}`);
