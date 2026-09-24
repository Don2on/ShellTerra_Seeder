#!/usr/bin/env node
/**
 * build-oceanbeach-vendors.mjs — derive a vendor directory from OceanBeachActivities.json.
 * Same approach as build-hillcrest-vendors.mjs (see that file's header). Groups the
 * activities by venue (locationName), merges intersection/variant pins into the real
 * named venue, drops bare-address/intersection/generic-street placeholders, attaches
 * each venue's dated activities as events[].
 *
 * Enrichment fields (category, tagline, description, website, phone, socials, hours)
 * are left blank for a later research pass, exactly like the Hillcrest sheet.
 *
 * Usage: node build-oceanbeach-vendors.mjs   (writes OceanBeachVendors.json)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = './OceanBeachActivities.json';
const OUT = './OceanBeachVendors.json';
const NEIGHBORHOOD = 'Ocean Beach';

// Exact locationName -> canonical venue name. Unlisted + not-DROP keeps its name.
// The Sunset Cliffs yoga cluster and Saratoga variants are the same physical spot
// under different organizer-supplied labels; collapse them into one vendor card.
const CANON = {
  'Sunset Cliffs at Adair St': 'Sunset Cliffs Natural Park',
  'Sunset Cliffs Blvd & Adair St': 'Sunset Cliffs Natural Park',
  'Sunset Cliffs Natural Park at Adair St': 'Sunset Cliffs Natural Park',
  'Adair Street at the cliffs': 'Sunset Cliffs Natural Park',
  'Saratoga Park, Ocean Beach': 'Saratoga Park',
  // Addresses resolved to their real business by a 2026-09-14 research pass:
  '2183 Bacon St': 'reUnify Yoga',            // reUnify's indoor "Bacon Studio"
  '4862 Voltaire St': 'reUnify Yoga',         // reUnify's "Outdoor Deck" (hosts the Mini Mystic Market pop-up)
  '1352 Sunset Cliffs Blvd': 'Yoga In Beautiful Places', // outdoor-yoga org's bluff spot
  '1253 Sunset Cliffs Blvd': 'Yoga Jawn',     // Yoga Jawn's Sunday bluff sessions
  'Sunset Cliffs parking': 'Yoga Jawn',       // same Yoga Jawn Sunday spot (later slot)
};

// Bare addresses / intersections / generic street rows that aren't a named venue.
const DROP = new Set([
  '1950 Abbott St',               // resolves to the OB Municipal Pier / public beach, no named venue
  'Ocean Beach',                  // generic neighborhood, not a venue
  'Newport Ave',                  // generic street (street-fair events)
  'Newport Ave business district',// generic corridor (OBMA street events)
  'Newport Ave at the Pier',      // OB Oktoberfest — annual OBMA street festival, not a fixed vendor
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
  _comment: 'Ocean Beach vendor directory derived from OceanBeachActivities.json venues (locationName grouping, Sunset Cliffs/Saratoga variants merged, bare-address/intersection/generic-street pins dropped). Enrichment fields left blank for a research pass.',
  _shell: raw._shell || 'OceanBeachActivities',
  _shellId: raw._shellId,
  _collection: 'vendors',
  _source: 'OceanBeachActivities.json (locationName grouping, variants merged)',
  _verify_before_running: 'Confirm _shellId matches the seeded Ocean Beach shell (6aa1aeb68b7e39770d76). Verify enriched fields per vendor and drop _activityCategories/_eventCount before seeding.',
  _fields: 'See BlackCommerceSD.json _fields.',
  vendors,
};

writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`Wrote ${OUT}: ${vendors.length} vendors, ${dropped} activity rows dropped.`);
console.log(`Total events attached: ${vendors.reduce((s, v) => s + v.events.length, 0)}`);
for (const v of vendors) console.log(`  ${String(v._eventCount).padStart(3)}  ${v.name.padEnd(40)} ${v.address}`);
