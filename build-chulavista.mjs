#!/usr/bin/env node
/**
 * build-chulavista.mjs — Downtown Chula Vista / Third Avenue Village activities map.
 * WEBSITE-ONLY (public map; not seeded to Appwrite). Vendors = the dining +
 * entertainment venues from the Downtown Chula Vista Association business directory
 * (downtownchulavista.com/directory); activities = the district's anchor events.
 * Geocodes every address (Mapbox, Chula Vista-constrained) and expands event
 * recurrences into dated occurrences, then writes the two files build-data.mjs reads.
 *
 * Writes: ChulaVistaVendors.json + ChulaVistaActivities.json + chulavista-geocode-review.txt
 * READ THE REVIEW — a wrong pin sends someone to the wrong place.
 *
 * USAGE: node --env-file=.env build-chulavista.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const TOKEN = process.env.MAPBOX_TOKEN;
if (!TOKEN) { console.error('Set MAPBOX_TOKEN (node --env-file=.env build-chulavista.mjs)'); process.exit(1); }

/* ── window (Mon this week → end of month+3) ── */
const now = new Date();
const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
const horizon = new Date(now.getFullYear(), now.getMonth() + 4, 0);
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const WS = fmt(weekStart), HZ = fmt(horizon);

/* ── vendors: Dine + Play + landmarks from the Downtown CV directory ── */
// [name, category, address] — address is downtown Chula Vista (Third Ave & nearby).
const VENDORS = [
  // Dining, cafés, breweries, bars
  ['3 Punk Ales Brewing Company', 'Brewery', '259 Third Avenue'],
  ['Groundswell Brewing Company', 'Brewery', '258 Third Avenue'],
  ['Chula Vista Brewery', 'Brewery', '294 Third Avenue'],
  ['Brewjeria Taproom & Kitchen', 'Brewery', '241 Third Avenue Suite C'],
  ['Bar Sin Nombre', 'Bar', '253 Third Avenue Suite 100'],
  ['Dock’s Cocktail Lounge', 'Bar', '317 Third Avenue'],
  ['Vogue Tavern', 'Bar', '230 Third Avenue'],
  ['Silver Dollar', 'Bar', '341 Third Avenue'],
  ['Spoon House Korean Cuisine & Cocktails', 'Korean', '305 Third Avenue'],
  ['California Sushi', 'Sushi', '337 Third Avenue'],
  ['Teriyaki Grill', 'Japanese', '380 Third Avenue Suite B'],
  ['Italianissimo', 'Italian', '323 Third Avenue'],
  ['Acqua e Farina', 'Italian', '330 F Street'],
  ['La Bella Pizza Garden', 'Pizza', '373 Third Avenue'],
  ['TNT Pizza', 'Pizza', '221 Third Avenue'],
  ['Kalaveras', 'Mexican', '340 Third Avenue'],
  ['La Nacional', 'Mexican', '279 Third Avenue'],
  ['La Patrona', 'Mexican', '277 Third Avenue'],
  ['El Comal', 'Mexican', '262 Third Avenue'],
  ['El Cholo’s Kid', 'Mexican', '282 Third Avenue'],
  ['Don Pedro Taco Shop', 'Tacos', '247 Third Avenue Suite B'],
  ['Talavera Azul', 'Mexican', '365 Third Avenue'],
  ['La Pesca Cevicheria Baja', 'Seafood', '217 Third Avenue'],
  ['Amor Eterno', 'Mexican', '282 Third Avenue'],
  ['Rico’s On 3rd', 'Mexican', '268 Third Avenue'],
  ['The Balboa South', 'American', '290 Third Avenue'],
  ['Mickey Lou’s', 'Burgers', '280 Third Avenue'],
  ['Tender Hooligan', 'American', '221 Third Avenue'],
  ['Farmer’s Table Chula Vista', 'American', '330 F Street'],
  ['Rise and Dine', 'Breakfast', '333 Third Avenue'],
  ['Sunset Cafe', 'Breakfast', '335 Third Avenue'],
  ['Mujer Divina Brunch Café', 'Brunch', '214 Third Avenue'],
  ['Mujer Divina Burrito & Coffee House', 'Coffee', '218 Third Avenue'],
  ['Dame Mas Cafeina Coffee Bar', 'Coffee', '265 Third Avenue'],
  ['Dark Horse Coffee Roasters', 'Coffee', '310 Third Avenue Unit A5'],
  ['Divina Matcha', 'Cafe', '216 Third Avenue'],
  ['Terzo Bakery and Café', 'Bakery', '357 Third Avenue Suite A'],
  ['Galu Café and Delicatessen', 'Deli', '462 Third Avenue'],
  ['Lime in the Coconut', 'Cafe', '248 Third Avenue'],
  ['Grind House Chula Vista', 'American', '260 Third Avenue'],
  ['SweetLife Ice Cream Shop', 'Dessert', '310 Third Avenue Suite C9'],
  ['Foodscape', 'American', '474 Third Avenue'],
  ['Agave Grill & Café', 'Mexican', '303 H Street Suite 107'],
  // Play, fitness, entertainment, landmarks
  ['OnStage Playhouse', 'Theater', '291 Third Avenue'],
  ['Memorial Park', 'Park', '364 Third Avenue'],
  ['Chula Vista Academy of Music', 'Music', '278 Third Avenue Suite A'],
  ['Kula Yoga', 'Yoga', '276 Third Avenue Suite E'],
  ['Yoga Box', 'Yoga', '269 Third Avenue'],
  ['TG The Gym Chula Vista', 'Gym', '320 Third Avenue'],
  ['ALTR Athletic Club', 'Gym', '241 Third Avenue'],
  ['236 Fit', 'Gym', '236 Third Avenue'],
  ['10th Planet Jiu Jitsu – South Bay', 'Martial Arts', '241 Third Avenue'],
  ['Sweet Pete’s Martial Arts Academy', 'Martial Arts', '234 Third Avenue Suite B'],
  ['La Bella Café & Games', 'Games', '289 G Street'],
  ['arts-rec Skateshop', 'Skate', '241 Third Avenue Suite A'],
];

/* ── activities: the district's anchor events ── */
// {title, category, address, time, endTime, date (first occurrence), rrule?, url, note}
const EVENTS = [
  {
    title: 'Third Avenue Village Certified Farmers’ Market', category: 'market',
    address: '300 Park Way', time: '10:00', endTime: '14:00',
    date: '2025-01-05', rrule: 'FREQ=WEEKLY;BYDAY=SU',
    url: 'https://downtownchulavista.com/events/chula-vista-farmers-market',
    note: '60+ vendors: produce, food makers, flowers & more, next to Memorial Park. Sundays 10am–2pm.',
  },
  {
    title: 'Starlight Parade & Festival', category: 'seasonal',
    address: 'Third Avenue', time: '15:00', endTime: '20:00',
    date: '2026-12-05', rrule: 'FREQ=YEARLY',
    url: 'https://www.starlightparade.com/',
    note: 'South Bay holiday tradition — 100+ entries down Third Avenue: marching bands, floats, and Santa.',
  },
  {
    title: 'Día de los Muertos Celebration', category: 'community',
    address: 'Third Avenue', time: '12:00', endTime: '20:00',
    date: '2026-11-01', rrule: 'FREQ=YEARLY',
    url: 'https://downtownchulavista.com/events/dia-de-los-muertos-celebration',
    note: 'Altars, folklórico, food & art on Third Avenue. Date approximate — confirm on the Downtown CV calendar.',
  },
  {
    title: 'Lemon Festival', category: 'seasonal',
    address: 'Third Avenue', time: '10:00', endTime: '17:00',
    date: '2026-08-16', rrule: 'FREQ=YEARLY',
    url: 'https://downtownchulavista.com/events/lemon-festival',
    note: 'Chula Vista’s citrus-heritage street fair — food, crafts & music. Held each summer (date approximate).',
  },
  {
    title: 'Taste of Third', category: 'food',
    address: 'Third Avenue', time: '17:00', endTime: '21:00',
    date: '2026-05-14', rrule: 'FREQ=YEARLY',
    url: 'https://downtownchulavista.com/events/taste-of-third',
    note: 'Stroll-and-taste through Third Avenue restaurants. Held each spring (date approximate).',
  },
  {
    title: 'Chula Vista HarborFest', category: 'community',
    address: 'Bayside Park, 999 Bayside Parkway', time: '10:00', endTime: '18:00',
    date: '2026-08-22', rrule: 'FREQ=YEARLY',
    url: 'https://cvharborfest.com/',
    note: 'Free bayfront festival at Bayside Park — live music, food, and water activities.',
  },
];

/* ── recurrence expansion ── */
const BYDAY = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const parseRule = (r) => { const o = {}; for (const kv of r.split(';')) { const [k, v] = kv.split('='); if (k) o[k] = v; } return o; };
function expand(ev) {
  const out = [];
  const [sy, sm, sd] = ev.date.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const push = (d) => { const s = fmt(d); if (s >= WS && s <= HZ) out.push(s); };
  if (!ev.rrule) { push(start); return out; }
  const r = parseRule(ev.rrule);
  if (r.FREQ === 'WEEKLY') {
    const dows = r.BYDAY ? r.BYDAY.split(',').map((t) => BYDAY[t]) : [start.getDay()];
    const w0 = new Date(start); w0.setDate(w0.getDate() - w0.getDay());
    for (let k = 0; k < 400; k++) {
      const base = new Date(w0); base.setDate(base.getDate() + k * 7);
      if (fmt(base) > HZ) break;
      for (const dow of dows) { const c = new Date(base); c.setDate(c.getDate() + dow); if (c >= start) push(c); }
    }
  } else if (r.FREQ === 'YEARLY') {
    for (let k = 0; k < 6; k++) { const c = new Date(sy + k, sm - 1, sd); if (fmt(c) > HZ) break; push(c); }
  } else { push(start); }
  return out;
}

/* ── geocode (Chula Vista) ── */
const CV_BBOX = '-117.16,32.56,-116.95,32.68';
async function geocode(addr) {
  const q = addr.replace(/,?\s*USA$/i, '').trim();
  const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(q)
    + `.json?access_token=${TOKEN}&country=us&limit=1&proximity=-117.084,32.640&bbox=${CV_BBOX}`;
  const res = await fetch(url); if (!res.ok) throw new Error('Mapbox ' + res.status);
  const f = (await res.json()).features?.[0]; if (!f) return null;
  const [lng, lat] = f.center;
  return { lat, lng, matched: f.place_name, relevance: f.relevance, acc: f.properties?.accuracy || f.place_type?.[0] || '?' };
}
const PRECISE = new Set(['rooftop', 'parcel', 'address', 'point', 'interpolated']);
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const full = (a) => `${a}, Chula Vista, CA 91910`;

/* ── build ── */
const review = [];
const vendorsOut = [];
for (const [name, category, address] of VENDORS) {
  let geo = null;
  try { geo = await geocode(full(address)); } catch (e) { review.push(`ERROR ${name}: ${e.message}`); }
  if (!geo || geo.relevance < 0.5) { review.push(`DROP ${name} | ${address}`); continue; }
  if (geo.relevance < 0.7 || !PRECISE.has(geo.acc)) review.push(`FLAG ${name} rel${geo.relevance.toFixed(2)}/${geo.acc} -> ${geo.matched}`);
  vendorsOut.push({
    slug: slugify(name), name, category, tagline: `${category} · Downtown Chula Vista`,
    description: '', logoUrl: '', website: '', phone: '', email: '', instagram: '', facebook: '', tiktok: '',
    address: full(address), lat: geo.lat, lng: geo.lng, neighborhood: 'Downtown Chula Vista',
    featured: false, verified: false,
  });
}

const items = [];
for (const ev of EVENTS) {
  let geo = null;
  try { geo = await geocode(full(ev.address)); } catch (e) { review.push(`ERROR ${ev.title}: ${e.message}`); }
  if (!geo) { review.push(`DROP EVENT ${ev.title} | ${ev.address}`); continue; }
  const dates = expand(ev);
  if (!dates.length) { review.push(`skip (out of window) ${ev.title}`); continue; }
  for (const d of dates) {
    items.push({
      kind: 'activity', slug: `${slugify(ev.title)}-${d}`, title: ev.title, description: ev.note || '',
      locationName: ev.address, address: full(ev.address), lat: geo.lat, lng: geo.lng,
      category: ev.category, start: `${d}T${ev.time}`, end: ev.endTime ? `${d}T${ev.endTime}` : undefined,
      url: ev.url || '',
    });
  }
}

const stamp = fmt(now);
writeFileSync('./ChulaVistaVendors.json', JSON.stringify({
  _comment: 'Downtown Chula Vista / Third Avenue Village dining + entertainment directory — WEBSITE-ONLY.',
  _shell: 'ChulaVista', _shellId: 'WEBSITE_ONLY', _collection: 'vendors',
  _source: 'Downtown Chula Vista Association directory — downtownchulavista.com/directory', vendors: vendorsOut,
}, null, 2));
writeFileSync('./ChulaVistaActivities.json', JSON.stringify({
  _comment: 'Downtown Chula Vista anchor events — WEBSITE-ONLY.',
  _shell: 'ChulaVista', _shellId: 'WEBSITE_ONLY', _collection: 'activities',
  _meta: { topic: 'Downtown Chula Vista events', generated: stamp, sources: ['Downtown Chula Vista — https://downtownchulavista.com/events'] },
  _deferred: {}, items,
}, null, 2));
writeFileSync('./chulavista-geocode-review.txt', review.join('\n') + '\n');

console.log(`Chula Vista: ${vendorsOut.length} vendors, ${items.length} event occurrences | window ${WS}..${HZ}`);
console.log(`Wrote ChulaVistaVendors.json + ChulaVistaActivities.json + chulavista-geocode-review.txt`);
console.log(`READ chulavista-geocode-review.txt (${review.length} lines).`);
