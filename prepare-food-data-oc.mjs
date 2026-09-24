#!/usr/bin/env node
/**
 * prepare-food-data-oc.mjs — geocode + expand OCFoodDistribution-raw.json into the
 * seeder input OCFoodDistribution.json.
 *
 * Unlike prepare-food-data.mjs (which parses free-text schedules from Feeding SD),
 * this reads EXPLICIT schedule fields authored in the raw file, so nothing depends
 * on fragile English parsing:
 *
 *   - site.hours[]  -> weekly recurrence. One doc per distinct open/close time,
 *                      carrying that time's weekdays as a recurDays set (Dart
 *                      Mon=1..Sun=7). A Mon-Fri site is a single rolling card.
 *   - site.scheduleText with an nth-weekday pattern ("1st and 3rd Wednesday,
 *                      10:00 AM to 11:30 AM") -> monthly recurrence. Digit ("1st")
 *                      and word ("first") ordinals both parse. One rolling doc per
 *                      pattern set.
 *   - site.deferred:true -> real site with no fixed/predictable public schedule
 *                      (CSFP rotating dates, mobile pop-ups, registration-only).
 *                      Emitted into _deferred as a call-ahead card, no dated
 *                      activity.
 *
 * Coordinates come from Mapbox. A site may carry explicit lat/lng to override.
 *
 * USAGE
 *   node --env-file=.env prepare-food-data-oc.mjs
 *   MAPBOX_TOKEN=pk.xxx node prepare-food-data-oc.mjs
 *
 * Reads MAPBOX_TOKEN from the environment (--env-file=.env works). Writes
 * OCFoodDistribution.json plus geocode-review-oc.txt — READ IT before seeding:
 * geocoders return a city centroid on failure rather than erroring, so a bad
 * address looks like a valid pin, and a wrong pin sends someone who needs food
 * to the wrong place.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const TOKEN = process.env.MAPBOX_TOKEN;
const IN  = './OCFoodDistribution-raw.json';
const OUT = './OCFoodDistribution.json';
const REVIEW = './geocode-review-oc.txt';

/* ---------------- anchors ---------------- */

// Monday of the current week.
const ANCHOR = (() => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
})();

// One week before ANCHOR — guaranteed past. Weekly multi-day docs anchor here so
// the app's nextVisibleOccurrence rolls FORWARD to the true soonest upcoming day.
const PAST_ANCHOR = (() => {
  const d = new Date(ANCHOR);
  d.setDate(d.getDate() - 7);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
})();

const DAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const DAYNAME = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/* ---------------- geocoding ---------------- */

// Rough city centroids used across OC — a Mapbox result landing on one of these
// usually means the street address failed and it fell back to the city.
const CENTROIDS = [
  { name: 'Santa Ana', lat: 33.7455, lng: -117.8677 },
  { name: 'Anaheim', lat: 33.8366, lng: -117.9143 },
  { name: 'Garden Grove', lat: 33.7739, lng: -117.9414 },
  { name: 'Irvine', lat: 33.6846, lng: -117.8265 },
  { name: 'Fullerton', lat: 33.8704, lng: -117.9243 },
  { name: 'Costa Mesa', lat: 33.6411, lng: -117.9187 },
  { name: 'Huntington Beach', lat: 33.6595, lng: -117.9988 },
  { name: 'Orange', lat: 33.7879, lng: -117.8531 },
  { name: 'Tustin', lat: 33.7458, lng: -117.8261 },
  { name: 'Westminster', lat: 33.7514, lng: -117.9940 },
];

function looksLikeCentroid(lat, lng) {
  return CENTROIDS.find(c =>
    Math.abs(c.lat - lat) < 0.004 && Math.abs(c.lng - lng) < 0.004);
}

async function geocode(address) {
  const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/'
    + encodeURIComponent(address)
    + `.json?access_token=${TOKEN}&country=us&limit=1`
    + '&proximity=-117.8677,33.7455'; // Santa Ana, OC center

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox ${res.status} for ${address}`);
  const json = await res.json();
  const f = json.features?.[0];
  if (!f) return null;

  const [lng, lat] = f.center;
  return {
    lat, lng,
    matched: f.place_name,
    relevance: f.relevance,
    accuracy: f.properties?.accuracy || f.place_type?.[0] || 'unknown',
  };
}

/* ---------------- schedule helpers ---------------- */

/** '13:30' -> '13:30', '09:00' -> '9:0'  (app format, not zero-padded) */
function toClock(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return `${h}:${m}`;
}

/** Expand 'Mon-Thu' or 'Mon' or 'Sat-Sun' into an array of JS weekday numbers */
function parseDays(spec) {
  if (spec.includes('-')) {
    const [a, b] = spec.split('-');
    const start = DAY[a], end = DAY[b];
    const out = [];
    for (let d = start; ; d = (d + 1) % 7) {
      out.push(d);
      if (d === end) break;
    }
    return out;
  }
  return [DAY[spec]];
}

/**
 * nth-weekday rules out of an explicit scheduleText, supporting BOTH digit
 * ("1st and 3rd Wednesday", "2nd/4th Saturday") and word ("first Thursday")
 * ordinals. Only the ordinals appearing immediately before the FIRST weekday
 * name count, so trailing clauses ("... (after 2nd/4th Tuesdays)") are ignored.
 */
function parseNthWeekdays(text) {
  const wordOrd = { first: 1, second: 2, third: 3, fourth: 4, last: -1 };
  const digitOrd = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4 };
  const lower = text.toLowerCase();

  // Locate the first weekday name.
  let dayIdx = -1, dayName = null;
  for (const d of DAYNAME) {
    const i = lower.indexOf(d.toLowerCase());
    if (i !== -1 && (dayIdx === -1 || i < dayIdx)) { dayIdx = i; dayName = d; }
  }
  if (!dayName) return null;
  const jsDay = DAYNAME.indexOf(dayName);
  const dayOfWeek = jsDay === 0 ? 7 : jsDay; // Dart Mon=1..Sun=7

  // Only look at the text BEFORE that weekday for ordinals.
  const before = lower.slice(0, dayIdx);
  const ns = [];
  for (const [w, n] of Object.entries(wordOrd)) {
    if (new RegExp(`\\b${w}\\b`).test(before)) ns.push(n);
  }
  for (const [w, n] of Object.entries(digitOrd)) {
    if (before.includes(w)) ns.push(n);
  }
  if (!ns.length) return null;
  return [...new Set(ns)].sort((a, b) => a - b).map(n => ({ n, dayOfWeek }));
}

/** '10:00 AM to 11:30 AM' / '9:45 AM-10:45 AM' -> { open, close } in 24h */
function parseTimes(text) {
  const re = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/gi;
  const found = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    found.push({ h: Number(m[1]), min: Number(m[2] || 0), mer: m[3].toUpperCase() });
  }
  if (!found.length) return null;

  const to24 = (t) => {
    let h = t.h;
    if (t.mer === 'PM' && h !== 12) h += 12;
    if (t.mer === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2,'0')}:${String(t.min).padStart(2,'0')}`;
  };
  return { open: to24(found[0]), close: found[1] ? to24(found[1]) : null };
}

function nextDateFor(dayOfWeek) {
  // dayOfWeek: Dart Mon=1..Sun=7 -> JS Sun=0..Sat=6
  const jsDow = dayOfWeek === 7 ? 0 : dayOfWeek;
  const d = new Date(ANCHOR);
  d.setDate(d.getDate() + ((jsDow - d.getDay() + 7) % 7));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ---------------- description ---------------- */

function buildDescription(site) {
  const parts = [`Free food distribution at ${site.name}.`];
  if (site.scheduleText) parts.push(`Schedule: ${site.scheduleText}.`);
  if (site.eligibility)  parts.push(`Eligibility: ${site.eligibility}.`);
  if (site.type && site.type !== 'pantry') parts.push(`Type: ${site.type}.`);
  if (site.phone) parts.push(`Call ${site.phone} to confirm before you go — hours change with holidays and weather.`);
  else            parts.push('Confirm hours before you go — schedules change with holidays and weather.');
  parts.push('Source: Second Harvest Food Bank of Orange County / OC Food Bank partners.');
  return parts.join(' ');
}

/* ---------------- main ---------------- */

async function main() {
  if (!TOKEN) {
    console.error('Set MAPBOX_TOKEN before running (e.g. node --env-file=.env prepare-food-data-oc.mjs).');
    process.exit(1);
  }

  const src = JSON.parse(readFileSync(IN, 'utf8'));
  const items = [];
  const deferred = {};
  const review = [];
  let failed = 0;

  for (const site of src.sites) {
    // ---- geocode (explicit lat/lng overrides) ----
    let geo = null;
    if (typeof site.lat === 'number' && typeof site.lng === 'number') {
      geo = { lat: site.lat, lng: site.lng, matched: `${site.address} (manual coords)`, relevance: 1, accuracy: 'provided' };
    } else if (site.address && !/mobile/i.test(site.address)) {
      try { geo = await geocode(site.address); }
      catch (err) { review.push(`ERROR    ${site.name}: ${err.message}`); failed++; }
    }

    if (site.address && !/mobile/i.test(site.address)) {
      if (!geo) {
        review.push(`NO MATCH ${site.name}  |  ${site.address}`);
        failed++;
      } else {
        const centroid = looksLikeCentroid(geo.lat, geo.lng);
        const flag = centroid ? `SUSPECT (${centroid.name} centroid)`
                   : geo.relevance < 0.8 ? `LOW RELEVANCE ${geo.relevance}`
                   : 'ok';
        review.push(`${flag.padEnd(30)} ${site.name}\n    input:   ${site.address}\n    matched: ${geo.matched}\n    coords:  ${geo.lat}, ${geo.lng}  [${geo.accuracy}]`);
      }
    }

    const lat = geo?.lat ?? null;
    const lng = geo?.lng ?? null;
    const description = buildDescription(site);

    // ---- deferred: call-ahead card, no dated activity ----
    if (site.deferred) {
      deferred[site.slug] = {
        title: site.name,
        status: `${site.scheduleText || 'Call ahead for current days and hours.'}${site.eligibility ? ` Eligibility: ${site.eligibility}.` : ''}${site.phone ? ` Phone: ${site.phone}.` : ''}`,
        address: site.address || '',
        lat, lng,
        phone: site.phone || '',
        eligibility: site.eligibility || '',
        sourceUrl: site.sourceUrl || '',
      };
      continue;
    }

    const base = {
      kind: 'activity',
      slug: site.slug,
      seriesSlug: site.slug,
      title: `${site.name} — Free Food Distribution`,
      description,
      locationName: site.name,
      address: site.address,
      lat, lng,
      category: 'food-assistance',
      sourceOrg: 'Second Harvest Food Bank of Orange County',
      url: site.sourceUrl || '',
      schedulePattern: site.scheduleText || '',
    };

    // ---- weekly standing hours ----
    if (site.hours?.length) {
      const byTime = {};
      for (const block of site.hours) {
        const key = `${block.open}|${block.close || ''}`;
        byTime[key] ??= { open: block.open, close: block.close, dows: new Set() };
        for (const dow of parseDays(block.days)) byTime[key].dows.add(dow === 0 ? 7 : dow);
      }
      let idx = 0;
      for (const t of Object.values(byTime)) {
        const dartDays = [...t.dows].sort((a, b) => a - b);
        items.push({
          ...base,
          slug: `${site.slug}-${t.open.replace(':','')}-${(t.close || '').replace(':','')}`,
          start: `${PAST_ANCHOR}T${t.open}`,
          end:   t.close ? `${PAST_ANCHOR}T${t.close}` : null,
          recurrence: { frequency: 'weekly' },
          recurDays: dartDays.join(','),
        });
        idx++;
      }
      continue;
    }

    // ---- monthly nth-weekday ----
    const nth = parseNthWeekdays(site.scheduleText || '');
    const times = parseTimes(site.scheduleText || '');
    if (nth && times) {
      const firstDate = nextDateFor(nth[0].dayOfWeek);
      items.push({
        ...base,
        start: `${firstDate}T${times.open}`,
        end:   times.close ? `${firstDate}T${times.close}` : null,
        recurrence: { frequency: 'monthly', nthWeekdays: nth },
        recurDays: nth.map(p => `${p.n}:${p.dayOfWeek}`).join(','),
      });
      continue;
    }

    review.push(`UNPARSED SCHEDULE  ${site.name}  |  ${site.scheduleText}`);
    console.warn(`WARN unparsed schedule, skipped: ${site.name} — "${site.scheduleText}"`);
  }

  const out = {
    _meta: {
      topic: 'Free food distributions — Orange County',
      generated: ANCHOR.toISOString().slice(0, 10),
      source: src._source,
      note: 'Generated by prepare-food-data-oc.mjs. Weekly/monthly native recurrence (one rolling doc per pattern). Read geocode-review-oc.txt before seeding.',
    },
    _deferred: deferred,
    items,
  };

  writeFileSync(OUT, JSON.stringify(out, null, 2));
  writeFileSync(REVIEW, review.join('\n\n') + '\n');

  const weekly = items.filter(i => i.recurrence?.frequency === 'weekly').length;
  const monthly = items.filter(i => i.recurrence?.frequency === 'monthly').length;
  const suspect = review.filter(r => r.startsWith('SUSPECT') || r.startsWith('LOW') || r.startsWith('NO MATCH') || r.startsWith('ERROR')).length;

  console.log(`\nwrote ${OUT}`);
  console.log(`  ${items.length} activity docs  (${weekly} weekly, ${monthly} monthly)`);
  console.log(`  ${Object.keys(deferred).length} deferred call-ahead sites (incl. CSFP senior boxes)`);
  console.log(`  ${failed} geocode failures`);
  console.log(`\nREAD ${REVIEW}. ${suspect} entr${suspect === 1 ? 'y' : 'ies'} flagged SUSPECT / LOW / NO MATCH / ERROR — a wrong pin sends someone who needs food to the wrong address.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
