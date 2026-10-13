#!/usr/bin/env node
/**
 * prepare-sanbernardino-activities.mjs
 *
 * Flatten the discrete dated `events` on each vendor in
 * SanBernardinoFoodVendors.json into per-occurrence activity items that
 * seed-activities.mjs understands. Unlike the web-bank banks (RRULE → native
 * recurrence), the CAPSBC data already ships expanded single-date events
 * (date/time/title), so each event becomes one `recurrence: null` activity.
 *
 *   node prepare-sanbernardino-activities.mjs
 *
 * in : SanBernardinoFoodVendors.json  ({ _shellId, vendors:[{..,events:[{date,time,title}]}] })
 * out: SanBernardinoFoodDistribution.json  ({ _shellId, items:[...] })
 */
import { readFileSync, writeFileSync } from 'node:fs';

const IN = './SanBernardinoFoodVendors.json';
const OUT = './SanBernardinoFoodDistribution.json';

const src = JSON.parse(readFileSync(IN, 'utf8'));
const items = [];
let skippedNoCoord = 0;

for (const v of src.vendors) {
  if (v.lat == null || v.lng == null) { skippedNoCoord += (v.events || []).length; continue; }
  for (const e of v.events || []) {
    if (!e.date || !e.time) continue;
    items.push({
      slug: v.slug,
      title: e.title || `${v.name} — Food Distribution`,
      description: v.description || '',
      lat: v.lat,
      lng: v.lng,
      address: v.address || '',
      locationName: v.name,
      url: v.website || '',
      start: `${e.date}T${e.time}`,
      recurrence: null,
    });
  }
}

const out = {
  _shell: src._shell,
  _shellId: src._shellId,
  _source: src._source,
  _generatedFrom: IN,
  items,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${OUT}: ${items.length} activity items from ${src.vendors.length} vendors`);
if (skippedNoCoord) console.log(`skipped ${skippedNoCoord} events on still-uncoordinated vendors`);
