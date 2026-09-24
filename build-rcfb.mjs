#!/usr/bin/env node
/**
 * build-rcfb.mjs — turn RiverCity-sites-raw.json into the public food-map input
 * files for River City Food Bank (Sacramento). WEBSITE-ONLY: consumed by
 * shellterra-public/build-data.mjs (kind:'food'); nothing is seeded to Appwrite,
 * so it never reaches the app. Same shape as build-fbnn.mjs.
 *
 * For each site: geocode the address (Mapbox, constrained to the Sacramento
 * area), expand every schedule's RRULE into dated occurrences across the window
 * (Monday this week → end of month+3, matching the other food maps), honoring
 * FREQ WEEKLY / MONTHLY(nth-weekday) / DAILY, INTERVAL, COUNT, UNTIL and EXDATE,
 * then emit a vendor card with a readable hours string + events[].
 *
 * Writes: RCFBFoodVendors.json + RCFBFoodDistribution.json
 * plus rcfb-geocode-review.txt — READ IT; a wrong pin sends someone hungry to
 * the wrong place.
 *
 * USAGE: node --env-file=.env build-rcfb.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const TOKEN = process.env.MAPBOX_TOKEN;
if (!TOKEN) { console.error('Set MAPBOX_TOKEN (node --env-file=.env build-rcfb.mjs)'); process.exit(1); }

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

// Expand one schedule (date/time + RRULE + EXDATE) into in-window YYYY-MM-DD[].
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
const window12 = (sc) => { const a = t12(sc.time); if (!a) return ''; const b = sc.endTime ? t12(sc.endTime) : ''; return b ? `${a}–${b}` : a; };
function humanHours(sc) {
  const time = window12(sc);
  if (!sc.rrule) return sc.date ? `${sc.date}${time ? `, ${time}` : ''}` : '';
  const r = parseRule(sc.rrule);
  const byday = r.BYDAY ? r.BYDAY.split(',') : [];
  if (r.FREQ === 'MONTHLY') {
    const specs = byday.map((tok) => { const m = tok.match(/^(-?\d+)?([A-Z]{2})$/); return m ? `${ORD[m[1] || '1'] || m[1] + 'th'} ${DOWNAME[BYDAY[m[2]]]}` : ''; }).filter(Boolean);
    return `${specs.join(' & ') || 'Monthly'}${time ? `, ${time}` : ''}`;
  }
  if (r.FREQ === 'WEEKLY') {
    const days = byday.map((t) => DOWNAME[BYDAY[t]]).filter(Boolean);
    return `${days.length ? days.join(' & ') : 'Weekly'}${time ? `, ${time}` : ''}`;
  }
  if (r.FREQ === 'DAILY') return `Daily${time ? `, ${time}` : ''}`;
  return time;
}

/* ---- geocode (Sacramento area) ---- */
const SAC_BBOX = '-121.85,38.30,-121.10,38.85';
async function geocode(addr) {
  const q = addr.replace(/,?\s*USA$/i, '').trim();
  const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(q)
    + `.json?access_token=${TOKEN}&country=us&limit=1&proximity=-121.47,38.57&bbox=${SAC_BBOX}`;
  const res = await fetch(url); if (!res.ok) throw new Error('Mapbox ' + res.status);
  const f = (await res.json()).features?.[0]; if (!f) return null;
  const [lng, lat] = f.center;
  return { lat, lng, matched: f.place_name, relevance: f.relevance, acc: f.properties?.accuracy || f.place_type?.[0] || '?' };
}
const PRECISE = new Set(['rooftop', 'parcel', 'address', 'point', 'interpolated']);
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/* ---- build ---- */
const sites = JSON.parse(readFileSync('./RiverCity-sites-raw.json', 'utf8'));
const review = [];
const usedSlugs = new Set();
const vendors = [];
let dropped = 0, flagged = 0;

for (const s of sites) {
  let geo = null;
  try { geo = await geocode(s.location); } catch (e) { review.push(`ERROR ${s.name}: ${e.message}`); }
  if (!geo || geo.relevance < 0.5) { review.push(`DROP (no/low geocode) ${s.name} | ${s.location}`); dropped++; continue; }
  const flag = (geo.relevance < 0.7 || !PRECISE.has(geo.acc)) ? `FLAG rel${geo.relevance.toFixed(2)}/${geo.acc}` : 'ok';
  if (flag !== 'ok') { flagged++; review.push(`${flag} ${s.name}\n    in: ${s.location}\n    -> ${geo.matched} [${geo.acc}]`); }
  else review.push(`ok ${s.name} -> ${geo.matched} [${geo.acc}]`);

  // expand all schedules -> deduped events[] (keep each schedule's note as the blurb)
  const evMap = new Map();
  for (const sc of s.schedules) {
    for (const date of expandSchedule(sc)) {
      const k = date + '|' + sc.time;
      if (!evMap.has(k)) evMap.set(k, { title: s.name, date, time: sc.time, description: sc.note || '' });
    }
  }
  const events = [...evMap.values()].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  // hours: distinct human schedule strings, program-labelled
  const hours = [...new Set(s.schedules.map((sc) => `${sc.prog}: ${humanHours(sc)}`).filter(Boolean))].join('; ');
  const progs = s.programs.join(', ');
  let slug = slugify(`${s.name}`); let b = slug, i = 2;
  while (usedSlugs.has(slug)) slug = `${b}-${i++}`; usedSlugs.add(slug);

  vendors.push({
    slug, name: s.name,
    category: 'Food Assistance',
    tagline: `${progs}${hours ? ` · ${hours}` : ''}`.slice(0, 255),
    description: `Free food distribution via River City Food Bank — ${progs}.${hours ? ` Schedule: ${hours}.` : ''} Bring a bag if you can; confirm before you go — schedules can change with holidays.`,
    logoUrl: '', website: s.website || 'https://rivercityfoodbank.org/', phone: s.phone || '', email: '',
    instagram: '', facebook: '', tiktok: '',
    address: s.location.replace(/,?\s*USA$/i, '').trim(), lat: geo.lat, lng: geo.lng,
    neighborhood: (s.location.split(',')[1] || '').trim(), hours,
    featured: false, verified: false, events, _eventCount: events.length,
  });
}

const meta = { _meta: { topic: 'Free food distributions — Sacramento (River City Food Bank)', generated: fmt(now), sources: ['River City Food Bank — https://rivercityfoodbank.org/emergency-food-distribution/'] } };
const vendorFile = {
  _comment: 'River City Food Bank (Sacramento) — WEBSITE-ONLY (public food map); not seeded to Appwrite.',
  _shell: 'RCFBFood', _shellId: 'WEBSITE_ONLY', _collection: 'vendors',
  _source: 'River City Food Bank — Emergency Food Distribution, CalFresh, Diaper Distribution', vendors,
};

writeFileSync('./RCFBFoodVendors.json', JSON.stringify(vendorFile, null, 2));
writeFileSync('./RCFBFoodDistribution.json', JSON.stringify({ ...meta, _deferred: {}, items: [] }, null, 2));
writeFileSync('./rcfb-geocode-review.txt', review.join('\n') + '\n');

const evTot = vendors.reduce((a, v) => a + v.events.length, 0);
console.log(`RCFB: ${vendors.length} sites (${dropped} dropped, ${flagged} flagged) | ${evTot} events`);
console.log(`window ${WS}..${HZ}. Wrote RCFBFoodVendors.json + RCFBFoodDistribution.json + rcfb-geocode-review.txt`);
console.log(`READ rcfb-geocode-review.txt (${review.length} lines).`);
