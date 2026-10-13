#!/usr/bin/env node
/**
 * merge-oldtown-scan.mjs — fold the oldtown-event-scan results into the seed files.
 *
 *  - Enriches existing vendors (website/instagram) and creates new vendor cards for
 *    scanned businesses that returned >=1 event. Businesses with 0 events are skipped
 *    ("all vendors need activities").
 *  - Appends each scanned event to OldTownActivities.json as an activity item
 *    (map point), deduped against existing items by date + normalized title.
 *  - Also mirrors the events onto each vendor's events[] for seed completeness.
 *
 * Usage: node merge-oldtown-scan.mjs   (rewrites OldTownVendors.json + OldTownActivities.json)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SCAN = './oldtown-scan-results.json';
const ACTS = './OldTownActivities.json';
const VEND = './OldTownVendors.json';

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const normTitle = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));

// Address / coords / category for scanned businesses (scan didn't return coords).
// Existing venues reuse the vendor file's coords; new ones use block-level approx.
const META = {
  'fiesta-de-reyes': { category: 'Dining & Shopping Plaza', defaultCat: 'music' },
  'old-town-san-diego-state-historic-park': { category: 'Historic Park & Museums', defaultCat: 'community' },
  'heritage-county-park': { category: 'Historic Park', defaultCat: 'film' },
  'casa-guadalajara': { address: '4105 Taylor St, San Diego, CA 92110', lat: 32.75560, lng: -117.19660, category: 'Mexican Restaurant', defaultCat: 'community' },
  'cafe-coyote': { address: '2461 San Diego Ave, San Diego, CA 92110', lat: 32.75410, lng: -117.19480, category: 'Mexican Restaurant', defaultCat: 'community' },
  'barra-barra-saloon': { address: '4016 Wallace St, San Diego, CA 92110', lat: 32.75490, lng: -117.19620, category: 'Saloon & Mexican Restaurant', defaultCat: 'community' },
  'cosmopolitan-hotel-restaurant': { address: '2660 Calhoun St, San Diego, CA 92110', lat: 32.75540, lng: -117.19580, category: 'Historic Hotel & Restaurant', defaultCat: 'community' },
};

const scan = read(SCAN).results;
const actsDoc = read(ACTS);
const vendDoc = read(VEND);

const items = actsDoc.items;
const vendors = vendDoc.vendors;

// Existing activity dedup keys: date :: normalized-title.
const actKeys = new Set(items.map((it) => `${String(it.start).slice(0, 10)}::${normTitle(it.title)}`));
const actSlugs = new Set(items.map((it) => it.slug));
const uniqueSlug = (base) => {
  let s = base, i = 2;
  while (actSlugs.has(s)) s = `${base}-${i++}`;
  actSlugs.add(s);
  return s;
};

let newVendors = 0, enriched = 0, skippedBiz = 0, addedActs = 0, dupActs = 0;

for (const biz of scan) {
  const vslug = slugify(biz.name);
  const meta = META[vslug] || {};

  if (!biz.events || biz.events.length === 0) { skippedBiz++; continue; }

  // find or create the vendor card
  let v = vendors.find((x) => x.slug === vslug);
  if (!v) {
    v = {
      slug: vslug, name: biz.name, category: meta.category || '', tagline: '', description: '',
      logoUrl: '', website: '', phone: '', email: '', instagram: '', facebook: '', tiktok: '',
      address: meta.address || '', lat: meta.lat ?? null, lng: meta.lng ?? null,
      neighborhood: 'Old Town', hours: '', featured: false, verified: false, events: [],
      _activityCategories: [], _eventCount: 0,
    };
    vendors.push(v);
    newVendors++;
  } else {
    enriched++;
    if (!v.category && meta.category) v.category = meta.category;
  }
  if (biz.website && !v.website) v.website = biz.website;
  if (biz.instagram && !v.instagram) v.instagram = biz.instagram.replace(/^@/, '');

  const lat = v.lat ?? meta.lat ?? null;
  const lng = v.lng ?? meta.lng ?? null;
  const addr = v.address || meta.address || '';

  for (const ev of biz.events) {
    const date = String(ev.date).slice(0, 10);
    const key = `${date}::${normTitle(ev.title)}`;
    // mirror onto the vendor card regardless
    v.events.push({ title: ev.title, date, time: ev.time || '', description: ev.description || '', source: ev.source || '' });
    if (actKeys.has(key)) { dupActs++; continue; } // already a map point — skip the activity
    actKeys.add(key);
    items.push({
      kind: 'activity',
      slug: uniqueSlug(`${slugify(ev.title)}-${date}`),
      title: ev.title,
      description: ev.description || '',
      locationName: biz.name,
      address: addr,
      lat, lng,
      category: meta.defaultCat || 'community',
      start: ev.time ? `${date}T${ev.time}` : date,
      url: ev.source || '',
      _addedBy: 'oldtown-event-scan',
    });
    addedActs++;
  }
  v.events.sort((a, b) => a.date.localeCompare(b.date));
  v._eventCount = v.events.length;
}

// refresh the activities-category hints on every vendor
for (const v of vendors) {
  if (!v.events) continue;
}

writeFileSync(VEND, JSON.stringify(vendDoc, null, 2));
writeFileSync(ACTS, JSON.stringify(actsDoc, null, 2));

console.log(`Vendors: ${vendors.length} total (${newVendors} new, ${enriched} enriched, ${skippedBiz} businesses skipped for 0 events)`);
console.log(`Activities: +${addedActs} new (${dupActs} already present, deduped) -> ${items.length} total`);
console.log('\nVendors (events):');
for (const v of vendors.sort((a, b) => b._eventCount - a._eventCount)) {
  console.log(`  ${String(v._eventCount).padStart(3)}  ${v.name.padEnd(42)} ${v.website || '(no site)'}`);
}
