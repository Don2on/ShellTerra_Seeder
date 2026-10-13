#!/usr/bin/env node
/**
 * build-oldtown-vendors.mjs — derive a vendor directory from OldTownActivities.json.
 *
 * Mirrors build-gaslamp-vendors.mjs: groups the activities by venue (locationName),
 * MERGING the Old Town SHP sub-buildings into the park, DROPPING pure check-in
 * placeholders. Each surviving venue becomes a vendor row (BlackCommerceSD.json
 * shape) with its activities attached as events[].
 *
 * Enrichment fields (website/phone/hours/socials/tagline/description) and any NEW
 * activities are left to the research/scan pass (per-vendor website + Instagram).
 * Address/coords/category are carried over from the activity data.
 *
 * Usage: node build-oldtown-vendors.mjs   (writes OldTownVendors.json)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = './OldTownActivities.json';
const OUT = './OldTownVendors.json';

// Exact locationName -> canonical venue name. The four Old Town SHP buildings are
// one destination (the state park); fold them together. Anything not listed and
// not in DROP keeps its own name.
const CANON = {
  'Old Town San Diego State Historic Park': 'Old Town San Diego State Historic Park',
  'Mason Street School, Old Town San Diego SHP': 'Old Town San Diego State Historic Park',
  'Robinson Rose Visitor Center, Old Town San Diego SHP': 'Old Town San Diego State Historic Park',
  'Seeley Stable Theater, Old Town San Diego SHP': 'Old Town San Diego State Historic Park',
  'San Diego Avenue & Harney Street': 'Historic San Diego Avenue',
};

// Pure logistics placeholders that are not a named vendor business.
const DROP = new Set([
  'Event Check In',
]);

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cleanAddr = (a) => (a || '').replace(/,\s*CA,\s*92110/i, ', CA 92110').trim();
const mode = (arr) => {
  const c = {}; let best = arr[0], n = 0;
  for (const x of arr) { c[x] = (c[x] || 0) + 1; if (c[x] > n) { n = c[x]; best = x; } }
  return best;
};

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
  const address = addrs.length ? mode(addrs) : cleanAddr(acts[0].address);
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
    slug: slugify(name),
    name,
    category: '',                 // set in research pass
    tagline: '',
    description: '',
    logoUrl: '',
    website: '',
    phone: '',
    email: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    address,
    lat: rep.lat ?? null,
    lng: rep.lng ?? null,
    neighborhood: 'Old Town',
    hours: '',
    featured: false,
    verified: false,
    events,
    _activityCategories: cats,    // hint for research pass; stripped before seeding
    _eventCount: events.length,
  });
}

const out = {
  _comment: 'Old Town vendor directory derived from OldTownActivities.json venues. Enrichment fields + new activities filled by research/scan pass.',
  _shell: 'OldTownActivities',
  _shellId: raw._shellId,
  _collection: 'vendors',
  _source: 'OldTownActivities.json (locationName grouping, SHP buildings merged)',
  _verify_before_running: 'Confirm _shellId, verify enriched phone/hours/website/socials per vendor, drop _activityCategories/_eventCount before seeding.',
  _fields: 'See BlackCommerceSD.json _fields.',
  vendors,
};

writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`Wrote ${OUT}: ${vendors.length} vendors, ${dropped} activity rows dropped (placeholders).`);
console.log(`Total events attached: ${vendors.reduce((s, v) => s + v.events.length, 0)}`);
console.log('\nVendors (events):');
for (const v of vendors) console.log(`  ${String(v._eventCount).padStart(3)}  ${v.name.padEnd(40)} ${v.address}`);
