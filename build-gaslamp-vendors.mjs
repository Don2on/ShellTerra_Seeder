#!/usr/bin/env node
/**
 * build-gaslamp-vendors.mjs — derive a vendor directory from GaslampActivities.json.
 *
 * Groups the activities by venue (locationName), MERGING spelling/format variants
 * and address-only rows into one canonical venue, and DROPPING rotating/landmark
 * placeholders that aren't real named businesses. Each surviving venue becomes a
 * vendor row (BlackCommerceSD.json shape) with its activities attached as events[].
 *
 * Enrichment fields (website/phone/hours/socials/tagline/description) are left
 * blank here — filled by the research pass. Address/coords/category are carried
 * over from the activity data.
 *
 * Usage: node build-gaslamp-vendors.mjs   (writes GaslampVendors.json)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = './GaslampActivities.json';
const OUT = './GaslampVendors.json';

// Exact locationName -> canonical venue name. Anything not listed and not in DROP
// keeps its own name (single-variant venues). Merges fold variants + address-only
// rows (resolved by their known street address) into the real venue.
const CANON = {
  'National Lampoon The Yellow Door': 'The Yellow Door',
  "National Lampoon's The Yellow Door": 'The Yellow Door',
  '750 Sixth Ave': 'The Yellow Door',              // 750 Sixth Ave = Yellow Door
  '672 Fifth Ave': 'TORO',                         // 672 Fifth Ave = TORO
  'Laugh Factory San Diego': 'Laugh Factory',
  'Onyx Room Nightclub': 'Onyx Room',
  '207 Fifth Ave': 'Hard Rock Hotel San Diego',    // 207 Fifth Ave = Hard Rock
  'Cafe Sevilla of San Diego': 'Cafe Sevilla',
  'Sevilla Nightclub of San Diego': 'Cafe Sevilla',// club inside Cafe Sevilla (353 Fifth Ave)
  'Nova SD': 'NOVA SD',
  'Wild Hare Bar Garden': 'Wild Hare Bar',
  'Wild Hare Bar at Gaslamp Hilton': 'Wild Hare Bar',
  'Side Bar': 'SideBar',
  'SideBar Nightclub San Diego': 'SideBar',
  '836 Fifth Ave': 'Casablanca Lounge',            // 836 Fifth Ave = Casablanca
  'Moxy San Diego Downtown/Gaslamp Quarter': 'Moxy San Diego Gaslamp Quarter',
  'Blarney Stone Pub, Fifth Avenue, San Diego, CA, USA': 'Blarney Stone Pub',
  'Hotel Indigo San Diego-Gaslamp Quarter by IHG': 'Hotel Indigo San Diego Gaslamp Quarter',
};

// Rotating placeholders / bare intersections / unresolved address-only rows /
// pure landmarks that are not a named vendor business.
const DROP = new Set([
  'Gaslamp Quarter (rotating venue)',
  'Gaslamp Quarter',
  'Gaslamp Quarter — Fifth Ave',
  'Gaslamp Quarter (venue TBC)',
  'Gaslamp Quarter Sign',
  'Fifth Avenue & L Street',
  '199 Fifth Ave',
  'Cafe of the Day',
  '500 Broadway',
  '600 Fifth Ave',
  '1111 Sixth Ave',
  '675 Ninth Ave',
  '535 Fifth Ave',
]);

// Normalize an address string: collapse a doubled trailing city/state and prefer
// a clean "..., San Diego, CA 92101" ending. Source data has a few malformed rows.
const cleanAddr = (a) => (a || '')
  .replace(/,\s*San Diego,\s*CA\s*92101,\s*San Diego,\s*CA\s*$/i, ', San Diego, CA 92101')
  .replace(/,\s*Onyx,\s*CA\s*92101/i, ', San Diego, CA 92101')
  .trim();

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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
  // Best address = the most common well-formed street address among the group.
  const addrs = acts.map((a) => cleanAddr(a.address)).filter((a) => a && !/^gaslamp quarter/i.test(a));
  const wellFormed = addrs.filter((a) => /San Diego, CA 92101$/i.test(a));
  const address = wellFormed.length ? mode(wellFormed) : (addrs.length ? mode(addrs) : cleanAddr(acts[0].address));
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
    neighborhood: 'Gaslamp Quarter',
    hours: '',
    featured: false,
    verified: false,
    events,
    _activityCategories: cats,    // hint for research pass; stripped before seeding
    _eventCount: events.length,
  });
}

const out = {
  _comment: 'Gaslamp vendor directory derived from GaslampActivities.json venues. Enrichment fields filled by research pass.',
  _shell: 'GaslampActivities',
  _shellId: raw._shellId,
  _collection: 'vendors',
  _source: 'GaslampActivities.json (locationName grouping, variants merged)',
  _verify_before_running: 'Confirm _shellId, verify enriched phone/hours/website/socials per vendor, drop _activityCategories/_eventCount before seeding.',
  _fields: 'See BlackCommerceSD.json _fields.',
  vendors,
};

writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`Wrote ${OUT}: ${vendors.length} vendors, ${dropped} activity rows dropped (placeholders/unresolved).`);
console.log(`Total events attached: ${vendors.reduce((s, v) => s + v.events.length, 0)}`);
console.log('\nVendors (events):');
for (const v of vendors) console.log(`  ${String(v._eventCount).padStart(3)}  ${v.name.padEnd(38)} ${v.address}`);
