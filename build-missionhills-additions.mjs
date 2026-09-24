#!/usr/bin/env node
/**
 * build-missionhills-additions.mjs — merge the fresh Mission Hills browser pull
 * (MissionHillsBrowserData.json: raw vendors[] + happyHours[] + activities[])
 * into the existing seed files, ADDING ONLY what is still missing.
 *
 * Unlike merge-missionhills.mjs (which expected pre-geocoded seed-format input),
 * the browser pull is raw: no coords, vendor cards not built, HH/activities
 * reference a venueSlug only. So we geocode new venues, convert to each file's
 * schema, and DEDUPE BY CONTENT against what's already there:
 *
 *   vendors    -> MissionHillsVendors.json    dedupe by slug OR normalized name
 *   happyHours -> MissionHillsHappyHour.json   dedupe by venue-name + days + start
 *   activities -> MissionHillsActivities.json  dedupe by title + venue (+ date)
 *
 * USAGE: node --env-file=.env build-missionhills-additions.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const DRY = process.argv.includes('--dry');
const TOKEN = process.env.MAPBOX_TOKEN;
if (!TOKEN && !DRY) { console.error('Set MAPBOX_TOKEN (or run with --dry)'); process.exit(1); }
const TODAY = '2026-09-24';

// Weekly recurrence anchor: Monday of last week (matches existing HH files).
const now = new Date();
const anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
anchor.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7) - 7);
const ANCHOR = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-${String(anchor.getDate()).padStart(2, '0')}`;
const DART = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 7 };
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const SD_BBOX = '-117.32,32.53,-116.90,33.12';
async function geocode(addr) {
  const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(addr.replace(/,?\s*USA$/i, ''))
    + `.json?access_token=${TOKEN}&country=us&limit=1&proximity=-117.17,32.748&bbox=${SD_BBOX}`;
  const r = await fetch(url); if (!r.ok) throw new Error('Mapbox ' + r.status);
  const f = (await r.json()).features?.[0]; if (!f) return null;
  const [lng, lat] = f.center;
  return { lat, lng, relevance: f.relevance, acc: f.properties?.accuracy || f.place_type?.[0] || '?', matched: f.place_name };
}

function inferCategory(t) {
  t = t.toLowerCase();
  if (/karaoke/.test(t)) return 'music';
  if (/trivia|bingo|\bquiz\b|game night/.test(t)) return 'games';
  if (/comedy|stand-?up|open mic|improv/.test(t)) return 'comedy';
  if (/drag|queen|dance|\bdj\b|club|beats|disco|rave/.test(t)) return 'nightlife';
  if (/brunch|dinner|taco|food|menu|dining|oyster|wine|beer|tequila|whiskey|date night|special/.test(t)) return 'food';
  if (/yoga|fitness|pilates|workout|\brun\b|cycle|sweat/.test(t)) return 'wellness';
  if (/live music|band|concert|acoustic|jazz|singer|vinyl/.test(t)) return 'music';
  if (/market|bazaar|pop-?up|nursery|garden/.test(t)) return 'market';
  if (/movie|cinema|film|screening/.test(t)) return 'film';
  if (/service|worship|church|meeting|support|council|community/.test(t)) return 'community';
  return 'community';
}

const B = JSON.parse(readFileSync('./MissionHillsBrowserData.json', 'utf8'));
const MVfile = JSON.parse(readFileSync('./MissionHillsVendors.json', 'utf8'));
const MHHfile = JSON.parse(readFileSync('./MissionHillsHappyHour.json', 'utf8'));
const MAfile = JSON.parse(readFileSync('./MissionHillsActivities.json', 'utf8'));
const review = [];

// The researcher deliberately lists out-of-area / permanently-closed venues
// (flagged in siteNotes) so they can be pruned, not seeded. Exclude those venues
// entirely — no vendor card, no happy hours, no activities. Careful NOT to match
// "closed Tuesdays"/"closed Sundays" (a normal day-off on an open venue).
const excludeVenue = (v) => {
  const sn = v.siteNotes || '';
  return /out of area/i.test(sn) || /closed permanently/i.test(sn) || /^\s*closed[.\s,]/i.test(sn);
};
const EXCLUDED = new Set(B.vendors.filter(excludeVenue).map((v) => v.slug));
B.vendors.filter(excludeVenue).forEach((v) => review.push(`EXCLUDE-VENUE ${v.slug}: ${(v.siteNotes || '').slice(0, 70)}`));

/* ---- 1. resolve coords/name for every browser venue (reuse existing, else geocode) ---- */
const exVendBySlug = new Map(MVfile.vendors.map((v) => [v.slug, v]));
const exVendByName = new Map(MVfile.vendors.map((v) => [norm(v.name), v]));
const coord = new Map(); // browser venueSlug -> {lat,lng,name,address,existed}
for (const bv of B.vendors) {
  if (EXCLUDED.has(bv.slug)) continue; // out-of-area / closed: don't geocode or reference
  const ex = exVendBySlug.get(bv.slug) || exVendByName.get(norm(bv.name));
  if (ex && ex.lat != null) {
    coord.set(bv.slug, { lat: ex.lat, lng: ex.lng, name: ex.name, address: ex.address, existed: true });
    continue;
  }
  if (DRY) { coord.set(bv.slug, { lat: null, lng: null, name: bv.name, address: bv.address, existed: false }); continue; }
  try {
    const g = await geocode(bv.address);
    if (!g || g.relevance < 0.5) { review.push(`GEOCODE-FAIL ${bv.slug} | ${bv.address}`); continue; }
    if (g.relevance < 0.7) review.push(`GEOCODE-FLAG ${bv.slug} rel${g.relevance.toFixed(2)}/${g.acc} -> ${g.matched}`);
    coord.set(bv.slug, { lat: g.lat, lng: g.lng, name: bv.name, address: bv.address, existed: false });
  } catch (e) { review.push(`GEOCODE-ERR ${bv.slug}: ${e.message}`); }
}

/* ---- 2. VENDORS: add cards for venues not already in MissionHillsVendors ---- */
let newVendors = [];
for (const bv of B.vendors) {
  if (EXCLUDED.has(bv.slug)) continue;
  if (exVendBySlug.has(bv.slug) || exVendByName.has(norm(bv.name))) continue;
  const c = coord.get(bv.slug);
  if (!c || c.lat == null) { review.push(`VENDOR-SKIP ${bv.slug} (no coords)`); continue; }
  newVendors.push({
    slug: bv.slug, name: bv.name, category: bv.category || 'Restaurant',
    tagline: bv.tagline || '',
    description: bv.tagline || bv.siteNotes || `${bv.name} in Mission Hills, San Diego.`,
    logoUrl: '', website: bv.website || '', phone: bv.phone || '', email: '',
    instagram: bv.instagram || '', facebook: null, tiktok: null,
    address: bv.address, lat: c.lat, lng: c.lng, neighborhood: 'Mission Hills',
    hours: bv.hours || '', featured: false, verified: false, events: [],
  });
}

/* ---- 3. HAPPY HOURS: dedupe by venue-name + days + start ---- */
const hhKey = (name, days, start) => `${norm(name)}|${days}|${start}`;
const exHHkeys = new Set(MHHfile.happyHours.map((h) => hhKey(h.locationName, h.recurDays, (h.start || '').split('T')[1] || '')));
const usedHHslug = new Set(MHHfile.happyHours.map((h) => h.slug));
const newHappyHours = [];
for (const h of B.happyHours) {
  const c = coord.get(h.venueSlug);
  const days = (h.days || []).map((d) => DART[d]).filter(Boolean).sort((a, b) => a - b).join(',');
  if (!c || c.lat == null || !h.start || !days) { review.push(`HH-SKIP ${h.venueSlug} "${h.label}" (${!c || c.lat == null ? 'no coords' : !h.start ? 'no start' : 'no days'})`); continue; }
  if (exHHkeys.has(hhKey(c.name, days, h.start))) { review.push(`HH-DUP ${h.venueSlug} "${h.label}" (${days}@${h.start})`); continue; }
  let slug = slugify(`${h.venueSlug}-hh-${h.label || 'happy-hour'}`), base = slug, i = 2;
  while (usedHHslug.has(slug)) slug = `${base}-${i++}`; usedHHslug.add(slug);
  exHHkeys.add(hhKey(c.name, days, h.start));
  newHappyHours.push({
    kind: 'activity', slug, seriesSlug: h.venueSlug,
    title: `${c.name} - ${h.label || 'Happy Hour'}`,
    description: (h.deals || []).join('; ') || 'Happy hour.',
    locationName: c.name, address: c.address, lat: c.lat, lng: c.lng,
    category: 'happy-hour', start: `${ANCHOR}T${h.start}`, end: h.end ? `${ANCHOR}T${h.end}` : null,
    recurrence: { frequency: 'weekly' }, recurDays: days, url: h.source || '', verified: h.verified === true,
  });
}

/* ---- 4. ACTIVITIES: dedupe by title + venue (+ date for one-offs) ---- */
const exActTV = new Set(MAfile.items.map((i) => norm(i.title) + '|' + norm(i.locationName)));
const exActTVD = new Set(MAfile.items.map((i) => norm(i.title) + '|' + norm(i.locationName) + '|' + (i.start || '').slice(0, 10)));
const usedActSlug = new Set(MAfile.items.map((i) => i.slug));
const newActivities = [];
let dupAct = 0, pastAct = 0;
for (const a of B.activities) {
  const c = coord.get(a.venueSlug);
  if (!c || c.lat == null || !a.start) { review.push(`ACT-SKIP ${a.venueSlug} "${a.title}" (no coords/start)`); continue; }
  const cat = inferCategory(`${a.title} ${a.description || ''}`);
  const base = {
    kind: 'activity', title: a.title, description: a.description || a.title,
    locationName: c.name, address: c.address, lat: c.lat, lng: c.lng, category: cat, url: a.source || '',
  };
  if (a.recurring && a.days && a.days.length) {
    if (exActTV.has(norm(a.title) + '|' + norm(c.name))) { dupAct++; review.push(`ACT-DUP(rec) "${a.title}" @ ${c.name}`); continue; }
    const days = a.days.map((d) => DART[d]).filter(Boolean).sort((x, y) => x - y).join(',');
    if (!days) { review.push(`ACT-SKIP ${a.venueSlug} "${a.title}" (no days)`); continue; }
    let slug = slugify(`${a.venueSlug}-${a.title}-w${days.replace(/,/g, '')}`), b = slug, i = 2;
    while (usedActSlug.has(slug)) slug = `${b}-${i++}`; usedActSlug.add(slug);
    exActTV.add(norm(a.title) + '|' + norm(c.name));
    newActivities.push({ ...base, slug, start: `${ANCHOR}T${a.start}`, end: a.end ? `${ANCHOR}T${a.end}` : null, recurrence: { frequency: 'weekly' }, recurDays: days });
  } else if (!a.recurring && a.date) {
    if (a.date < TODAY) { pastAct++; continue; }
    if (exActTVD.has(norm(a.title) + '|' + norm(c.name) + '|' + a.date) || exActTV.has(norm(a.title) + '|' + norm(c.name))) { dupAct++; review.push(`ACT-DUP(date) "${a.title}" @ ${c.name} ${a.date}`); continue; }
    let slug = slugify(`${a.venueSlug}-${a.title}-${a.date}`), b = slug, i = 2;
    while (usedActSlug.has(slug)) slug = `${b}-${i++}`; usedActSlug.add(slug);
    exActTVD.add(norm(a.title) + '|' + norm(c.name) + '|' + a.date);
    newActivities.push({ ...base, slug, start: `${a.date}T${a.start}`, end: a.end ? `${a.date}T${a.end}` : null });
  } else { review.push(`ACT-SKIP ${a.venueSlug} "${a.title}" (recurring w/o days or no date)`); }
}

/* ---- 5. new HH venue cards (for venues among added happy hours not yet carded) ---- */
const exHHcardNames = new Set(MHHfile.vendors.map((v) => norm(v.name)));
const hhVenueNames = new Set(newHappyHours.map((h) => norm(h.locationName)));
const allVendPool = new Map([...MVfile.vendors, ...newVendors].map((v) => [norm(v.name), v]));
const newHHcards = [];
for (const nm of hhVenueNames) {
  if (exHHcardNames.has(nm)) continue;
  const v = allVendPool.get(nm); if (!v) continue;
  const { _notes, _geocode, _pinSource, events, ...rest } = v;
  newHHcards.push({ ...rest, events: [] });
}

/* ---- REPORT ---- */
console.log(`VENDORS:    +${newVendors.length} new (was ${MVfile.vendors.length} -> ${MVfile.vendors.length + newVendors.length})`);
console.log(`HAPPY HRS:  +${newHappyHours.length} new (was ${MHHfile.happyHours.length} -> ${MHHfile.happyHours.length + newHappyHours.length}); +${newHHcards.length} venue cards`);
console.log(`ACTIVITIES: +${newActivities.length} new (was ${MAfile.items.length} -> ${MAfile.items.length + newActivities.length}); ${dupAct} dup-skipped, ${pastAct} past-skipped`);
console.log(`review lines: ${review.length}`);

if (DRY) {
  console.log('\n--- DRY: sample new vendors ---'); newVendors.slice(0, 6).forEach((v) => console.log('  ', v.slug, '|', v.name));
  console.log('--- DRY: new happy hours ---'); newHappyHours.forEach((h) => console.log('  ', h.title, '|', h.recurDays, '|', h.start.split('T')[1]));
  console.log('--- DRY: new activities ---'); newActivities.forEach((a) => console.log('  ', a.recurrence ? '[wk]' : '[1x]', a.title, '@', a.locationName, '|', a.start));
  console.log('\n--- review ---'); review.forEach((r) => console.log('  ', r));
  console.log('\nDRY RUN — nothing written.');
  process.exit(0);
}

/* ---- WRITE ---- */
MVfile.vendors = [...MVfile.vendors, ...newVendors];
writeFileSync('./MissionHillsVendors.json', JSON.stringify(MVfile, null, 2) + '\n');

MHHfile.vendors = [...MHHfile.vendors, ...newHHcards];
MHHfile.happyHours = [...MHHfile.happyHours, ...newHappyHours];
writeFileSync('./MissionHillsHappyHour.json', JSON.stringify(MHHfile, null, 2) + '\n');

MAfile.items = [...MAfile.items, ...newActivities];
writeFileSync('./MissionHillsActivities.json', JSON.stringify(MAfile, null, 2) + '\n');

writeFileSync('./missionhills-additions-review.txt', review.join('\n') + '\n');
console.log('\nWritten. Review: missionhills-additions-review.txt');
