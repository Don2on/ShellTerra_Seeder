#!/usr/bin/env node
/**
 * build-hillcrest-vendors.mjs — derive a vendor directory from HillcrestActivities.json.
 * Same approach as build-gaslamp-vendors.mjs (see that file's header). Groups the
 * activities by venue (locationName), merges variants/address-only rows into the
 * real venue, drops street/intersection/unnamed placeholders, attaches events[].
 *
 * Usage: node build-hillcrest-vendors.mjs   (writes HillcrestVendors.json)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = './HillcrestActivities.json';
const OUT = './HillcrestVendors.json';
const NEIGHBORHOOD = 'Hillcrest';

// Exact locationName -> canonical venue name. Unlisted + not-DROP keeps its name.
const CANON = {
  'Main Stage': 'The Brass Rail',      // Main Stage = performance room at The Brass Rail (3796 Fifth Ave)
  '3796 Fifth Ave': 'The Brass Rail',
  '1035 University Ave': 'Cork & Stem',// 1035 University Ave = Cork & Stem
};

// Streets/intersections/unnamed-address rows that aren't a named vendor business.
const DROP = new Set([
  'Normal Street',                 // Hillcrest Farmers Market on the street, not a fixed vendor
  'Fifth Ave and Pennsylvania Ave',// bare intersection
  '3911 Fifth Ave #204',           // unnamed photo-studio unit, single event
]);

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const mode = (arr) => {
  const c = {}; let best = arr[0], n = 0;
  for (const x of arr) { c[x] = (c[x] || 0) + 1; if (c[x] > n) { n = c[x]; best = x; } }
  return best;
};
const cleanAddr = (a) => (a || '').trim();

const raw = JSON.parse(readFileSync(SRC, 'utf8'));
const items = raw.items || raw.activities || [];

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
  _comment: 'Hillcrest vendor directory derived from HillcrestActivities.json venues. Enrichment fields filled by research pass.',
  _shell: raw._shell || 'HillcrestActivities',
  _shellId: raw._shellId,
  _collection: 'vendors',
  _source: 'HillcrestActivities.json (locationName grouping, variants merged)',
  _verify_before_running: 'Confirm _shellId, verify enriched fields per vendor, drop _activityCategories/_eventCount before seeding.',
  _fields: 'See BlackCommerceSD.json _fields.',
  vendors,
};

writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`Wrote ${OUT}: ${vendors.length} vendors, ${dropped} activity rows dropped.`);
console.log(`Total events attached: ${vendors.reduce((s, v) => s + v.events.length, 0)}`);
for (const v of vendors) console.log(`  ${String(v._eventCount).padStart(3)}  ${v.name.padEnd(42)} ${v.address}`);
