#!/usr/bin/env node
/**
 * build-fbnn.mjs — turn FBNN-sites-raw.json (parsed from the Food Bank of
 * Northern Nevada Google Calendar ICS feeds) into the public food-map input
 * files. WEBSITE-ONLY: these are consumed by shellterra-public/build-data.mjs
 * (kind:'food'); nothing is seeded to Appwrite, so they never reach the app.
 *
 * For each site: geocode the ICS LOCATION (Mapbox, constrained to N. Nevada /
 * E. Sierra), expand every schedule's RRULE into dated occurrences across the
 * window (Monday this week → end of month+3, matching the other food maps),
 * honoring FREQ WEEKLY/MONTHLY(nth-weekday)/DAILY, INTERVAL, COUNT, UNTIL and
 * EXDATE, then emit a vendor card with a readable hours string + events[].
 *
 * Writes (general): FBNNFoodVendors.json + FBNNFoodDistribution.json
 *        (kids):    FBNNKidsVendors.json + FBNNKidsDistribution.json
 * plus fbnn-geocode-review.txt — READ IT; a wrong pin sends someone hungry to
 * the wrong place.
 *
 * USAGE: node --env-file=.env build-fbnn.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const TOKEN = process.env.MAPBOX_TOKEN;
if (!TOKEN) { console.error('Set MAPBOX_TOKEN (node --env-file=.env build-fbnn.mjs)'); process.exit(1); }

/* ---- window ---- */
const now = new Date();
const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
const horizon = new Date(now.getFullYear(), now.getMonth() + 4, 0);
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const WS = fmt(weekStart), HZ = fmt(horizon);

/* ---- ICS BYDAY <-> JS weekday (Sun=0..Sat=6) ---- */
const BYDAY = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const parseRule = (rrule) => {
  const o = {};
  for (const kv of rrule.split(';')) { const [k, v] = kv.split('='); if (k) o[k] = v; }
  return o;
};
const nthWeekdayOfMonth = (y, mIdx, n, dow) => {
  const first = new Date(y, mIdx, 1).getDay();
  const day = 1 + ((dow - first + 7) % 7) + (n - 1) * 7;
  const d = new Date(y, mIdx, day);
  return d.getMonth() === mIdx ? d : null;
};

// Expand one schedule (DTSTART date/time + RRULE + EXDATE) into in-window YYYY-MM-DD[].
function expandSchedule(sc) {
  const ex = new Set(sc.exdates || []);
  const out = [];
  const push = (d) => { const s = fmt(d); if (s >= WS && s <= HZ && !ex.has(s)) out.push(s); };
  if (!sc.date) return out;
  const [sy, sm, sd] = sc.date.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);

  if (!sc.rrule) { push(start); return out; }
  const r = parseRule(sc.rrule);
  const interval = Number(r.INTERVAL || 1);
  const count = r.COUNT ? Number(r.COUNT) : null;
  const until = r.UNTIL ? `${r.UNTIL.slice(0, 4)}-${r.UNTIL.slice(4, 6)}-${r.UNTIL.slice(6, 8)}` : null;
  const byday = r.BYDAY ? r.BYDAY.split(',') : [];

  if (r.FREQ === 'MONTHLY') {
    // nth-weekday (BYDAY like "3MO") each `interval` months from start.
    const specs = byday.map((tok) => { const m = tok.match(/^(-?\d+)?([A-Z]{2})$/); return m ? { n: Number(m[1] || 1), dow: BYDAY[m[2]] } : null; }).filter(Boolean);
    let occ = 0;
    for (let k = 0; k < 60; k++) {
      const mo = new Date(sy, sm - 1 + k * interval, 1);
      const cands = specs.length
        ? specs.map((s) => nthWeekdayOfMonth(mo.getFullYear(), mo.getMonth(), s.n, s.dow)).filter(Boolean)
        : [new Date(mo.getFullYear(), mo.getMonth(), sd)];
      for (const c of cands.sort((a, b) => a - b)) {
        if (count && occ >= count) break;
        occ++;
        if (until && fmt(c) > until) continue;
        if (fmt(c) > HZ) return out;
        push(c);
      }
      if (count && occ >= count) break;
      if (fmt(mo) > HZ && !count) break;
    }
  } else if (r.FREQ === 'WEEKLY') {
    const dows = byday.length ? byday.map((t) => BYDAY[t]).filter((x) => x != null) : [start.getDay()];
    let occ = 0;
    // start from the Sunday of DTSTART's week, step `interval` weeks
    const w0 = new Date(start); w0.setDate(w0.getDate() - w0.getDay());
    for (let k = 0; k < 400; k++) {
      const base = new Date(w0); base.setDate(base.getDate() + k * interval * 7);
      if (fmt(base) > HZ && fmt(base) > (until || HZ)) break;
      for (const dow of dows.sort((a, b) => a - b)) {
        const c = new Date(base); c.setDate(c.getDate() + dow);
        if (c < start) continue;
        if (count && occ >= count) { k = 1e9; break; }
        occ++;
        if (until && fmt(c) > until) { k = 1e9; break; }
        push(c);
      }
    }
  } else if (r.FREQ === 'DAILY') {
    let occ = 0;
    for (let k = 0; k < 400; k++) {
      const c = new Date(start); c.setDate(c.getDate() + k * interval);
      if (count && occ >= count) break;
      occ++;
      if (until && fmt(c) > until) break;
      if (fmt(c) > HZ) break;
      push(c);
    }
  }
  return out;
}

/* ---- human hours string from a schedule ---- */
const DOWNAME = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ORD = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', '-1': 'last' };
const t12 = (hhmm) => { if (!hhmm) return ''; let [h, m] = hhmm.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return m ? `${h}:${String(m).padStart(2, '0')} ${ap}` : `${h} ${ap}`; };
function humanHours(sc) {
  const time = t12(sc.time);
  if (!sc.rrule) return sc.date ? `${sc.date}${time ? `, ${time}` : ''}` : '';
  const r = parseRule(sc.rrule);
  const byday = r.BYDAY ? r.BYDAY.split(',') : [];
  if (r.FREQ === 'MONTHLY') {
    const specs = byday.map((tok) => { const m = tok.match(/^(-?\d+)?([A-Z]{2})$/); return m ? `${ORD[m[1] || '1'] || m[1] + 'th'} ${DOWNAME[BYDAY[m[2]]]}` : ''; }).filter(Boolean);
    return `${specs.join(' & ') || 'Monthly'}${time ? `, ${time}` : ''}`;
  }
  if (r.FREQ === 'WEEKLY') {
    const days = byday.map((t) => DOWNAME[BYDAY[t]]).filter(Boolean);
    return `${days.length ? days.join(', ') : 'Weekly'}${time ? `, ${time}` : ''}`;
  }
  if (r.FREQ === 'DAILY') return `Daily${time ? `, ${time}` : ''}`;
  return time;
}

/* ---- geocode ---- */
// N. Nevada + E. Sierra + NE California (Plumas/Lassen/Modoc: Greenville, Quincy,
// Chester, Susanville). West edge must reach ~-122.4 or same-named streets in
// Gold Country win instead of the real Plumas-County town.
const NV_BBOX = '-122.4,35.9,-114.0,42.05';
async function geocode(addr) {
  const q = addr.replace(/,?\s*USA$/i, '').trim();
  const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(q)
    + `.json?access_token=${TOKEN}&country=us&limit=1&proximity=-119.81,39.53&bbox=${NV_BBOX}`;
  const res = await fetch(url); if (!res.ok) throw new Error('Mapbox ' + res.status);
  const f = (await res.json()).features?.[0]; if (!f) return null;
  const [lng, lat] = f.center;
  return { lat, lng, matched: f.place_name, relevance: f.relevance, acc: f.properties?.accuracy || f.place_type?.[0] || '?' };
}
const PRECISE = new Set(['rooftop', 'parcel', 'address', 'point', 'interpolated']);
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/* ---- build ---- */
const sites = JSON.parse(readFileSync('./FBNN-sites-raw.json', 'utf8'));
const review = [];
const usedSlugs = new Set();
const PROG_PAGE = {
  'Mobile Harvest': 'https://www.fbnn.org/distribution-calendar-mobile-harvest/',
  'Produce on Wheels': 'https://www.fbnn.org/distribution-calendar-produce-on-wheels/',
  'Food Pantries': 'https://www.fbnn.org/gethelp/foodfinder/',
  'Golden Groceries Pantry': 'https://www.fbnn.org/gethelp/foodfinder/',
  'Senior Box/CSFP': 'https://www.fbnn.org/gethelp/',
  'Kids Cafe Free Meals': 'https://www.fbnn.org/distribution-calendar-kids-cafe/',
  'Kids Cafe Summer Meals': 'https://www.fbnn.org/distribution-calendar-kids-cafe/',
};

async function buildGroup(groupSites, isKids) {
  const vendors = [];
  let dropped = 0, flagged = 0;
  for (const s of groupSites) {
    let geo = null;
    try { geo = await geocode(s.location); } catch (e) { review.push(`ERROR ${s.name}: ${e.message}`); }
    if (!geo || geo.relevance < 0.5) { review.push(`DROP (no/low geocode) ${s.name} | ${s.location}`); dropped++; continue; }
    const flag = (geo.relevance < 0.7 || !PRECISE.has(geo.acc)) ? `FLAG rel${geo.relevance.toFixed(2)}/${geo.acc}` : 'ok';
    if (flag !== 'ok') { flagged++; review.push(`${flag} ${s.name}\n    in: ${s.location}\n    -> ${geo.matched} [${geo.acc}]`); }

    // expand all schedules -> deduped events[]
    const evMap = new Map();
    for (const sc of s.schedules) {
      for (const date of expandSchedule(sc)) {
        const k = date + '|' + sc.time;
        if (!evMap.has(k)) evMap.set(k, { title: s.name, date, time: sc.time, description: '' });
      }
    }
    const events = [...evMap.values()].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    // hours: distinct human schedule strings
    const hours = [...new Set(s.schedules.map(humanHours).filter(Boolean))].join('; ');
    const progs = s.programs.join(', ');
    let slug = slugify(`${s.name}-${s.location.split(',')[1] || ''}`); let b = slug, i = 2;
    while (usedSlugs.has(slug)) slug = `${b}-${i++}`; usedSlugs.add(slug);

    vendors.push({
      slug, name: s.name,
      category: isKids ? 'Kids Meals' : 'Food Assistance',
      tagline: `${progs}${hours ? ` · ${hours}` : ''}`.slice(0, 255),
      description: `${isKids ? 'Free meals for kids' : 'Free food distribution'} via Food Bank of Northern Nevada — ${progs}.${hours ? ` Schedule: ${hours}.` : ''} Confirm before you go — schedules change with holidays and weather.`,
      logoUrl: '', website: PROG_PAGE[s.programs[0]] || 'https://www.fbnn.org/', phone: '', email: '',
      instagram: '', facebook: '', tiktok: '',
      address: s.location.replace(/,?\s*USA$/i, '').trim(), lat: geo.lat, lng: geo.lng,
      neighborhood: (s.location.split(',')[1] || '').trim(), hours,
      featured: false, verified: false, events, _eventCount: events.length,
    });
  }
  return { vendors, dropped, flagged };
}

const general = sites.filter((s) => !s.kids);
const kids = sites.filter((s) => s.kids);
const gRes = await buildGroup(general, false);
const kRes = await buildGroup(kids, true);

const meta = (topic) => ({ _meta: { topic, generated: fmt(now), sources: [`Food Bank of Northern Nevada — https://www.fbnn.org/programcalendar/`] } });
const vendorFile = (shell, id, vendors, src) => ({ _comment: `${src} — WEBSITE-ONLY (public food map); not seeded to Appwrite.`, _shell: shell, _shellId: id, _collection: 'vendors', _source: src, vendors });

writeFileSync('./FBNNFoodVendors.json', JSON.stringify(vendorFile('FBNNFood', 'WEBSITE_ONLY', gRes.vendors, 'FBNN Mobile Harvest, Produce on Wheels, Food Pantries, Golden Groceries, Senior Box/CSFP'), null, 2));
writeFileSync('./FBNNFoodDistribution.json', JSON.stringify({ ...meta('Free food distributions — Northern Nevada (FBNN)'), _deferred: {}, items: [] }, null, 2));
writeFileSync('./FBNNKidsVendors.json', JSON.stringify(vendorFile('FBNNKids', 'WEBSITE_ONLY', kRes.vendors, 'FBNN Kids Cafe meals'), null, 2));
writeFileSync('./FBNNKidsDistribution.json', JSON.stringify({ ...meta('Free kids meals — Northern Nevada (FBNN Kids Cafe)'), _deferred: {}, items: [] }, null, 2));
writeFileSync('./fbnn-geocode-review.txt', review.join('\n') + '\n');

const evTot = (vs) => vs.reduce((a, v) => a + v.events.length, 0);
console.log(`GENERAL: ${gRes.vendors.length} sites (${gRes.dropped} dropped, ${gRes.flagged} flagged) | ${evTot(gRes.vendors)} events`);
console.log(`KIDS:    ${kRes.vendors.length} sites (${kRes.dropped} dropped, ${kRes.flagged} flagged) | ${evTot(kRes.vendors)} events`);
console.log(`window ${WS}..${HZ}. Wrote FBNN{Food,Kids}{Vendors,Distribution}.json + fbnn-geocode-review.txt`);
console.log(`READ fbnn-geocode-review.txt (${review.length} lines).`);
