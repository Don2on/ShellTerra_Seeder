#!/usr/bin/env node
/**
 * prepare-poway-additions.mjs
 *
 * The 3 net-new Poway-area sites include two ORGS that run distributions at
 * multiple physical locations (Heavens Windows → 3 sites, SBCS → 5 sites).
 * Collapsing them into one pin (a) hides the offsite locations and (b) makes
 * same-date events collide on the deterministic activity id. So we SPLIT each
 * org into one vendor/pin per site, keyed off the distinct event `title`.
 *
 * Per site:
 *   - name    = event title, minus the "(address)" and trailing "- Nth …" note
 *   - address = the title's parenthetical address (+ parent city if it lacks one),
 *               or the parent address for the site with no address in its title
 *   - coords  = Mapbox geocode (San Diego County bbox); parent coords reused for
 *               the primary site
 *   - phone   = first number only, parenthetical stripped, capped at 50 chars
 *   - events  = only that site's events
 * The primary site (no address in its title) reuses the parent slug so it
 * overwrites the single pin already seeded for that org.
 *
 * Deduped vs live SD by street#+ZIP (ZIP from the geocode). Writes:
 *   PowayFoodVendors.json  ({_shell,_shellId,vendors})   → seed-vendors.mjs
 *   PowayFoodDistribution.json ({_shell,_shellId,items})  → seed-activities.mjs
 *
 *   node --env-file=.env prepare-poway-additions.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Client, Databases, Query } from 'node-appwrite';

const SD = '6a84dbe4ec8215c0345e';
const IN = './PowayFoodVendors.raw.json';   // the 18-site Poway block (pre-dedupe)
const TOKEN = process.env.MAPBOX_TOKEN;
const SD_BBOX = '-117.61,32.50,-116.08,33.51';
const inSD = (lat, lng) => lat > 32.5 && lat < 33.51 && lng > -117.61 && lng < -116.08;

/* ---- address helpers (mirror prepare-sd-additions.mjs) ---- */
function streetLine(addr) {
  const parts = String(addr).split(',').map((s) => s.trim());
  let line, idx;
  for (let i = parts.length - 1; i >= 0; i--) { if (/^\d+\s+[A-Za-z]/.test(parts[i])) { line = parts[i]; idx = i; break; } }
  const zips = String(addr).match(/\b\d{5}\b/g) || [];
  const zip = zips.length ? zips[zips.length - 1] : '';
  const city = (typeof idx === 'number' && parts[idx + 1] && !/^CA\b/.test(parts[idx + 1])) ? parts[idx + 1] : (parts[parts.length - 2] || '');
  return { line: line || parts[0], city, zip };
}
const streetNo = (l) => (String(l).match(/^\s*(\d+)/) || [])[1] || '';
const cleanParen = (s) => String(s).replace(/\s*\([^)]*\)/g, '').replace(/\s*-\s*\d+(st|nd|rd|th)\b.*$/i, '').trim();
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);

async function geocode(addr) {
  const u = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addr)}.json?access_token=${TOKEN}&limit=1&country=US&bbox=${SD_BBOX}`;
  const r = await fetch(u); const d = await r.json();
  if (!d.features || !d.features.length) return null;
  const [lng, lat] = d.features[0].center;
  const zip = (d.features[0].context || []).find((c) => c.id.startsWith('postcode'))?.text || (d.features[0].place_name.match(/\b\d{5}\b/) || [''])[0];
  return { lat: +lat.toFixed(6), lng: +lng.toFixed(6), zip, place: d.features[0].place_name, rel: d.features[0].relevance };
}

const client = new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);
async function liveSDKeys() {
  const keys = new Set(); let cur = null;
  while (true) {
    const q = [Query.equal('shellID', SD), Query.select(['address']), Query.limit(100)];
    if (cur) q.push(Query.cursorAfter(cur));
    const r = await db.listDocuments(process.env.APPWRITE_DATABASE_ID, 'vendors', q);
    for (const v of r.documents) { const { line, zip } = streetLine(v.address || ''); const n = streetNo(line); if (n && zip) keys.add(n + '|' + zip); }
    if (r.documents.length < 100) return keys; cur = r.documents.at(-1).$id;
  }
}

const raw = JSON.parse(readFileSync(IN, 'utf8')).vendors;

// re-derive the 3 net-new by street#+ZIP dedupe vs live SD.
// EXCLUDE the two docs a prior partial run already seeded (their primary sites),
// so they are re-emitted here and OVERWRITTEN in place (idempotent by slug)
// rather than being mistaken for pre-existing SD sites.
const SELF_SEEDED_KEYS = ['18402|92127', '318|91910']; // Serving Seniors, SBCS Center for Impact
const liveKeys = await liveSDKeys();
for (const k of SELF_SEEDED_KEYS) liveKeys.delete(k);
const keyOf = (a) => { const { line, zip } = streetLine(a || ''); const n = streetNo(line); return n && zip ? n + '|' + zip : null; };
const netNew = raw.filter((v) => { const k = keyOf(v.address); return k && !liveKeys.has(k); });

const vendorsOut = [];
const review = [];
for (const parent of netNew) {
  const { city: pCity, zip: pZip } = streetLine(parent.address);
  const parentAddrClean = cleanParen(parent.address);
  const groups = new Map();
  for (const e of parent.events || []) { const t = e.title || parent.name; if (!groups.has(t)) groups.set(t, []); groups.get(t).push(e); }
  const phoneClean = String(parent.phone || '').split(';')[0].replace(/\s*\([^)]*\)/g, '').trim().slice(0, 50);
  let first = true;
  for (const [title, events] of groups) {
    const paren = (title.match(/\(([^)]*)\)/) || [])[1] || '';
    const hasAddr = /^\d/.test(paren.trim());
    const isPrimary = !hasAddr;                       // site whose title carries no address
    const name = cleanParen(title);
    let address, geo;
    if (isPrimary) {
      // canonical "street, city, CA zip" — the raw parent address can carry a
      // "Multiple sites; …" prefix or notes we don't want on the pin.
      const pl = streetLine(parentAddrClean);
      address = `${pl.line}, ${pCity}, CA ${pZip}`.replace(/\s+,/g, ',').replace(/\s+/g, ' ').trim();
      geo = (parent.lat != null) ? { lat: parent.lat, lng: parent.lng, zip: pZip } : await geocode(address);
    } else {
      const q = paren.includes(',') ? `${paren}, CA` : `${paren}, ${pCity}, CA`;
      geo = await geocode(q);
      address = paren.includes(',') ? `${paren}, CA` : `${paren}, ${pCity}, CA ${geo?.zip || ''}`.trim();
    }
    if (!geo) { review.push(`NO GEOCODE  ${name}`); continue; }
    // dedupe each resulting site vs live SD
    const k = streetNo(streetLine(address).line) + '|' + (geo.zip || pZip);
    if (liveKeys.has(k)) { review.push(`DUP (already in SD) ${name} [${address}]`); continue; }
    const slug = (isPrimary && first) ? parent.slug : `${parent.slug}-${slugify(name.split(' - ').pop() || name)}`;
    first = false;
    review.push(`${inSD(geo.lat, geo.lng) ? 'ok ' : 'CHK'} rel${(geo.rel ?? 1).toFixed?.(2) ?? '1.00'}  ${name} -> ${geo.lat},${geo.lng} [${geo.place || address}]  (${events.length} ev)`);
    vendorsOut.push({
      slug, name, category: parent.category, tagline: parent.tagline, description: parent.description,
      logoUrl: parent.logoUrl || '', website: parent.website || '', phone: phoneClean, email: parent.email || '',
      instagram: parent.instagram || '', facebook: parent.facebook || '', tiktok: parent.tiktok || '',
      address, lat: geo.lat, lng: geo.lng, neighborhood: parent.neighborhood || '', hours: parent.hours || '',
      featured: false, verified: false, events,
    });
  }
}

writeFileSync('PowayFoodVendors.json', JSON.stringify({ _comment: 'Net-new Poway-area sites for FoodDistributionSD; multi-site orgs split to one pin per location (round 3).', _shell: 'FoodDistributionSD', _shellId: SD, _collection: 'vendors', vendors: vendorsOut }, null, 2) + '\n');

const items = [];
for (const v of vendorsOut) for (const e of v.events || []) { if (!e.date || !e.time) continue; items.push({ slug: v.slug, title: e.title || `${v.name} — Food Distribution`, description: v.description || '', lat: v.lat, lng: v.lng, address: v.address || '', locationName: v.name, url: v.website || '', start: `${e.date}T${e.time}`, recurrence: null }); }
writeFileSync('PowayFoodDistribution.json', JSON.stringify({ _shell: 'FoodDistributionSD', _shellId: SD, items }, null, 2) + '\n');
writeFileSync('poway-additions-review.txt', review.join('\n') + '\n');

console.log(review.join('\n'));
console.log(`\nvendors(pins): ${vendorsOut.length}  activities: ${items.length}  null-coord: ${vendorsOut.filter((v) => v.lat == null).length}`);
