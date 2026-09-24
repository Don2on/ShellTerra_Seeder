#!/usr/bin/env node
/**
 * build-hillcrest.mjs — integrate the browser-research Hillcrest pull
 * (HillcrestBrowserData.json: vendors[], happyHours[], activities[]) into the
 * seed files. Geocodes new venues (browser omits coords), converts happy hours
 * and activities to the seed schema, and routes each to the right file/shell:
 *
 *   vendors    -> HillcrestVendors.json      [HillcrestActivities shell 6a964e8e04e1b63f6116]
 *   activities -> HillcrestActivities.json    [same shell] (recurring=weekly, dated=one-off, past skipped)
 *   happyHours -> HillcrestHappyHour.json     [HillcrestHappyHour shell 6ab46c28582b5079a555]
 *                 (+ venue cards for the HH venues)
 *
 * USAGE: node --env-file=.env build-hillcrest.mjs   (writes files + hillcrest-build-review.txt)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const TOKEN = process.env.MAPBOX_TOKEN;
if (!TOKEN) { console.error('Set MAPBOX_TOKEN'); process.exit(1); }
const ACT_SHELL = '6a964e8e04e1b63f6116';
const HH_SHELL = '6ab46c28582b5079a555';
const TODAY = '2026-09-23';

const now = new Date();
const anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
anchor.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7) - 7); // Monday of last week
const ANCHOR = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-${String(anchor.getDate()).padStart(2, '0')}`;
const DART = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 7 };
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);

const SD_BBOX = '-117.32,32.53,-116.90,33.12';
async function geocode(addr) {
  const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(addr.replace(/,?\s*USA$/i, ''))
    + `.json?access_token=${TOKEN}&country=us&limit=1&proximity=-117.16,32.748&bbox=${SD_BBOX}`;
  const r = await fetch(url); if (!r.ok) throw new Error('Mapbox ' + r.status);
  const f = (await r.json()).features?.[0]; if (!f) return null;
  const [lng, lat] = f.center;
  return { lat, lng, relevance: f.relevance, acc: f.properties?.accuracy || f.place_type?.[0] || '?', matched: f.place_name };
}

function inferCategory(t) {
  t = t.toLowerCase();
  if (/karaoke/.test(t)) return 'music';
  if (/trivia|bingo|\bquiz\b|game night/.test(t)) return 'games';
  if (/comedy|stand-?up|open mic/.test(t)) return 'comedy';
  if (/drag|queen|dance|party|\bdj\b|club|beats|disco|rave/.test(t)) return 'nightlife';
  if (/brunch|dinner|taco|food|menu|dining/.test(t)) return 'food';
  if (/yoga|fitness|pilates|workout|\brun\b|cycle/.test(t)) return 'wellness';
  if (/live music|band|concert|acoustic|jazz|singer/.test(t)) return 'music';
  if (/market|bazaar|pop-?up/.test(t)) return 'market';
  if (/service|worship|church|meeting|support/.test(t)) return 'community';
  return 'nightlife';
}

const browser = JSON.parse(readFileSync('./HillcrestBrowserData.json', 'utf8'));
const existingVend = JSON.parse(readFileSync('./HillcrestVendors.json', 'utf8'));
const exBySlug = new Map(existingVend.vendors.map((v) => [v.slug, v]));
const review = [];

/* ---- 1. geocode + build the merged vendor set ---- */
const coord = new Map(); // venueSlug -> {lat,lng,name,address}
const mergedVendors = new Map(existingVend.vendors.map((v) => [v.slug, v])); // keep existing enriched cards

for (const bv of browser.vendors) {
  const ex = exBySlug.get(bv.slug);
  let lat, lng;
  if (ex && ex.lat != null) { lat = ex.lat; lng = ex.lng; }        // reuse existing coords
  else {
    try {
      const g = await geocode(bv.address);
      if (!g || g.relevance < 0.5) { review.push(`GEOCODE-FAIL vendor ${bv.slug} | ${bv.address}`); continue; }
      lat = g.lat; lng = g.lng;
      if (g.relevance < 0.7 || !['rooftop', 'parcel', 'address', 'point', 'interpolated'].includes(g.acc))
        review.push(`GEOCODE-FLAG ${bv.slug} rel${g.relevance.toFixed(2)}/${g.acc} -> ${g.matched}`);
    } catch (e) { review.push(`GEOCODE-ERR ${bv.slug}: ${e.message}`); continue; }
  }
  coord.set(bv.slug, { lat, lng, name: bv.name, address: bv.address });
  if (ex) continue; // don't overwrite existing enriched card; just needed its coords
  mergedVendors.set(bv.slug, {
    slug: bv.slug, name: bv.name, category: bv.category || 'Bar',
    tagline: bv.tagline || '', description: bv.tagline || `${bv.name} in Hillcrest, San Diego.`,
    logoUrl: '', website: bv.website || '', phone: bv.phone || '', email: '',
    instagram: bv.instagram || '', facebook: '', tiktok: '',
    address: bv.address, lat, lng, neighborhood: 'Hillcrest', hours: bv.hours || '',
    featured: false, verified: false, events: [],
  });
}

/* ---- 2. convert happy hours -> HillcrestHappyHour ---- */
const usedHH = new Set();
const happyHours = [];
for (const h of browser.happyHours) {
  const c = coord.get(h.venueSlug);
  const days = (h.days || []).map((d) => DART[d]).filter(Boolean).sort((a, b) => a - b);
  if (!c || !h.start || !days.length) { review.push(`HH-SKIP ${h.venueSlug} "${h.label}" (${!c ? 'no coords' : !h.start ? 'no start' : 'no days'})`); continue; }
  let slug = slugify(`${h.venueSlug}-hh-${h.label || 'happy-hour'}`); let b = slug, i = 2;
  while (usedHH.has(slug)) slug = `${b}-${i++}`; usedHH.add(slug);
  happyHours.push({
    kind: 'activity', slug, seriesSlug: h.venueSlug,
    title: `${c.name} — ${h.label || 'Happy Hour'}`,
    description: (h.deals || []).join('; ') || 'Happy hour.',
    locationName: c.name, address: c.address, lat: c.lat, lng: c.lng,
    category: 'happy-hour', start: `${ANCHOR}T${h.start}`, end: h.end ? `${ANCHOR}T${h.end}` : null,
    recurrence: { frequency: 'weekly' }, recurDays: days.join(','), url: h.source || '', verified: h.verified === true,
  });
}
const hhVenueSlugs = [...new Set(happyHours.map((h) => h.seriesSlug))];
const hhVendorCards = hhVenueSlugs.map((s) => {
  const v = mergedVendors.get(s); if (!v) return null;
  const { _notes, _geocode, events, ...rest } = v; return { ...rest, events: [] };
}).filter(Boolean);

/* ---- 3. convert activities -> merge into HillcrestActivities ---- */
const orig = JSON.parse(readFileSync('./HillcrestActivities.json', 'utf8'));
const actBySlug = new Map(orig.items.map((i) => [i.slug, i]));
const usedAct = new Set(actBySlug.keys());
let addedRec = 0, addedDated = 0, skipped = 0;
for (const a of browser.activities) {
  const c = coord.get(a.venueSlug);
  if (!c || !a.start) { skipped++; continue; }
  const cat = inferCategory(`${a.title} ${a.description || ''}`);
  const base = {
    kind: 'activity', seriesSlug: a.venueSlug,
    title: a.title, description: a.description || a.title,
    locationName: c.name, address: c.address, lat: c.lat, lng: c.lng,
    category: cat, url: a.source || '',
  };
  if (a.recurring && a.days && a.days.length) {
    const days = a.days.map((d) => DART[d]).filter(Boolean).sort((x, y) => x - y);
    if (!days.length) { skipped++; continue; }
    let slug = slugify(`${a.venueSlug}-${a.title}-w${days.join('')}`); let b = slug, i = 2;
    while (usedAct.has(slug)) slug = `${b}-${i++}`; usedAct.add(slug);
    actBySlug.set(slug, { ...base, slug, start: `${ANCHOR}T${a.start}`, end: a.end ? `${ANCHOR}T${a.end}` : null, recurrence: { frequency: 'weekly' }, recurDays: days.join(',') });
    addedRec++;
  } else if (!a.recurring && a.date && a.date >= TODAY) {
    let slug = slugify(`${a.venueSlug}-${a.title}-${a.date}`); let b = slug, i = 2;
    while (usedAct.has(slug)) slug = `${b}-${i++}`; usedAct.add(slug);
    actBySlug.set(slug, { ...base, slug, start: `${a.date}T${a.start}`, end: a.end ? `${a.date}T${a.end}` : null });
    addedDated++;
  } else skipped++;
}

/* ---- write files ---- */
const vendorsOut = { ...existingVend, _generated: ANCHOR, vendors: [...mergedVendors.values()] };
writeFileSync('./HillcrestVendors.json', JSON.stringify(vendorsOut, null, 2));

const activitiesOut = { ...orig, items: [...actBySlug.values()] };
writeFileSync('./HillcrestActivities.json', JSON.stringify(activitiesOut, null, 2));

const hhOut = {
  _comment: 'HillcrestHappyHour seed data. vendors[] -> vendors collection; happyHours[] -> activities collection (--no-host-grouping). Weekly recurrence (recurDays Dart Mon=1..Sun=7), anchored to a past Monday.',
  _shell: 'HillcrestHappyHour', _shellId: HH_SHELL, _collection: 'vendors+activities', _generated: ANCHOR,
  vendors: hhVendorCards, happyHours,
};
writeFileSync('./HillcrestHappyHour.json', JSON.stringify(hhOut, null, 2));
writeFileSync('./hillcrest-build-review.txt', review.join('\n') + '\n');

console.log(`VENDORS: ${existingVend.vendors.length} existing + ${mergedVendors.size - existingVend.vendors.length} new = ${mergedVendors.size} (geocoded new venues)`);
console.log(`ACTIVITIES: ${orig.items.length} existing + ${addedRec} recurring + ${addedDated} dated = ${activitiesOut.items.length} (${skipped} skipped)`);
console.log(`HAPPY HOURS: ${happyHours.length} sessions + ${hhVendorCards.length} venue cards -> HillcrestHappyHour`);
console.log(`review: ${review.length} lines (hillcrest-build-review.txt)`);
