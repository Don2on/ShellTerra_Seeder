#!/usr/bin/env node
/**
 * build-pacificbeach-vendors.mjs — derive a vendor directory from the Pacific
 * Beach activity feeds. Same approach as build-oceanbeach-vendors.mjs, but reads
 * BOTH PacificBeachActivities.json and PacificBeachCrawls.json (the crawls are
 * folded into the same directory). Groups items by venue (locationName), merges
 * start-line / street-variant labels into the real named venue, drops bare-
 * address / intersection / generic-neighborhood placeholders, and attaches each
 * venue's dated items as events[].
 *
 * Enrichment fields (category, tagline, description, website, phone, socials,
 * hours) are left blank for a later research pass — see enrich-pacificbeach-vendors.mjs.
 *
 * Usage: node build-pacificbeach-vendors.mjs   (writes PacificBeachVendors.json)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SRCS = ['./PacificBeachActivities.json', './PacificBeachCrawls.json'];
const OUT = './PacificBeachVendors.json';
const NEIGHBORHOOD = 'Pacific Beach';

// Exact locationName -> canonical venue name. "start line" and generic-street
// variants that share a spot with a named park are collapsed into one card.
const CANON = {
  'Pacific Beach Boardwalk (start line)': 'Pacific Beach Boardwalk',
  'Crown Point Park (start line)': 'Crown Point Park',
  'Crown Point Drive': 'Crown Point Park', // 3700 Crown Point Dr — same spot
};

// Bare addresses / generic neighborhood / street-corridor rows that aren't a
// single named venue.
const DROP = new Set([
  'Pacific Beach, San Diego',            // generic neighborhood
  'Pacific Beach (rotating restaurant)', // no fixed venue
  'Garnet Ave (Dawes St to Lamont St)',  // generic street corridor (street events)
  '4960 Ocean Blvd',                     // bare address, no named venue
]);

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const mode = (arr) => {
  const c = {}; let best = arr[0], n = 0;
  for (const x of arr) { c[x] = (c[x] || 0) + 1; if (c[x] > n) { n = c[x]; best = x; } }
  return best;
};
const cleanAddr = (a) => (a || '').trim();

const items = [];
for (const src of SRCS) {
  const raw = JSON.parse(readFileSync(src, 'utf8'));
  for (const it of raw.items || raw.activities || []) items.push(it);
}

const groups = new Map();
let dropped = 0;
for (const it of items) {
  const orig = (it.locationName || '').trim();
  if (!orig || DROP.has(orig)) { dropped++; continue; }
  const name = CANON[orig] || orig;
  if (!groups.has(name)) groups.set(name, []);
  groups.get(name).push(it);
}

const vendors = [];
for (const [name, acts] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const addrs = acts.map((a) => cleanAddr(a.address)).filter(Boolean);
  const address = addrs.length ? mode(addrs) : '';
  const rep = acts.find((a) => cleanAddr(a.address) === address && a.lat != null) || acts.find((a) => a.lat != null) || acts[0];
  const cats = [...new Set(acts.map((a) => a.category).filter(Boolean))];

  const events = acts
    .filter((a) => a.start)
    .map((a) => ({
      title: a.title || '',
      date: String(a.start).slice(0, 10),
      time: String(a.start).slice(11, 16),
      description: a.description || '',
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  vendors.push({
    slug: slugify(name), name, category: '', tagline: '', description: '',
    logoUrl: '', website: '', phone: '', email: '',
    instagram: '', facebook: '', tiktok: '',
    address, lat: rep.lat ?? null, lng: rep.lng ?? null,
    neighborhood: NEIGHBORHOOD, hours: '', featured: false, verified: false,
    events, _activityCategories: cats, _eventCount: events.length,
  });
}

const out = {
  _comment: 'Pacific Beach vendor directory derived from PacificBeachActivities.json + PacificBeachCrawls.json venues (locationName grouping, start-line/street variants merged, bare-address/generic pins dropped). Enrichment fields left blank for a research pass.',
  _shell: 'PacificBeachActivities',
  _shellId: '6a97507831d24cd42195',
  _collection: 'vendors',
  _source: 'PacificBeachActivities.json + PacificBeachCrawls.json (locationName grouping, variants merged)',
  _verify_before_running: 'Confirm _shellId matches the seeded Pacific Beach shell. Verify enriched fields per vendor and drop _activityCategories/_eventCount before seeding.',
  _fields: 'See OceanBeachVendors.json _fields.',
  vendors,
};

writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`Wrote ${OUT}: ${vendors.length} vendors, ${dropped} activity rows dropped.`);
console.log(`Total events attached: ${vendors.reduce((s, v) => s + v.events.length, 0)}`);
for (const v of vendors) console.log(`  ${String(v._eventCount).padStart(3)}  ${v.name.padEnd(40)} ${v.address}`);
