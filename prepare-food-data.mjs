#!/usr/bin/env node
/**
 * Converts food-distribution-sd.json into the seeder's input format.
 *
 *   name          -> title
 *   address       -> address, plus geocoded lat/lng via Mapbox
 *   scheduleText  -> startTime / endTime / recurrence
 *   neighborhood, phone, type, eligibility -> folded into description
 *
 * Weekly sites become one item per weekday slot with appRecurrence 'weekly',
 * so the app repeats them and they never expire. Monthly sites are expanded,
 * because the recurrence enum cannot express "third Friday of the month".
 *
 * USAGE
 *   MAPBOX_TOKEN=pk.xxx node prepare-food-data.mjs
 *   MAPBOX_TOKEN=pk.xxx node prepare-food-data.mjs --months 3
 *
 * Writes food-distribution-seed.json plus a geocode-review.txt you should
 * actually read: geocoders return the city centroid on failure rather than
 * erroring, so a bad address looks like a valid result.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const TOKEN = process.env.MAPBOX_TOKEN;
const MONTHS = Number(process.argv[process.argv.indexOf('--months') + 1]) || 3;
const IN  = './food-distribution-sd.json';
const OUT = './food-distribution-seed.json';

// Anchor for the first occurrence. Monday of the current week.
const ANCHOR = (() => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
})();

// One week before ANCHOR — guaranteed in the past. Weekly multi-day docs anchor
// here so the app's nextVisibleOccurrence rolls FORWARD to the true soonest
// upcoming day in the set, instead of getting stuck on a future anchor day.
const PAST_ANCHOR = (() => {
  const d = new Date(ANCHOR);
  d.setDate(d.getDate() - 7);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
})();

const DAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const DAYNAME = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/* ---------------- geocoding ---------------- */

const CENTROIDS = [
  { name: 'San Diego', lat: 32.7157, lng: -117.1611 },
  { name: 'National City', lat: 32.6781, lng: -117.0992 },
  { name: 'Chula Vista', lat: 32.6401, lng: -117.0842 },
  { name: 'Lemon Grove', lat: 32.7425, lng: -117.0314 },
];

function looksLikeCentroid(lat, lng) {
  return CENTROIDS.find(c =>
    Math.abs(c.lat - lat) < 0.004 && Math.abs(c.lng - lng) < 0.004);
}

async function geocode(address) {
  const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/'
    + encodeURIComponent(address)
    + `.json?access_token=${TOKEN}&country=us&limit=1`
    + '&proximity=-117.1611,32.7157';

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

/* ---------------- schedule parsing ---------------- */

/** '13:30' -> '13:30', '09:00' -> '9:0'  (app format, not zero-padded) */
function toClock(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return `${h}:${m}`;
}

/** Expand 'Mon-Thu' or 'Mon' into an array of weekday numbers */
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
 * Nth weekday rules out of scheduleText, e.g. 'Second and fourth Tuesday'
 *
 * Phrases like "while supplies last" and "first come, first served" contain
 * ordinal words that are not day rules, so they are stripped first. Without
 * this, "First Thursday of the month at 10:00 AM, while supplies last" parses
 * as first AND last Thursday.
 */
const ORDINAL_NOISE = [
  /while supplies last/gi,
  /until supplies last/gi,
  /open until food runs out/gi,
  /first come,?\s*first served/gi,
  /last\s+call/gi,
];

function parseNthWeekdays(text) {
  const ord = { first: 1, second: 2, third: 3, fourth: 4, last: -1 };
  let lower = text.toLowerCase();
  for (const re of ORDINAL_NOISE) lower = lower.replace(re, ' ');

  const dayMatch = DAYNAME.find(d => lower.includes(d.toLowerCase()));
  if (!dayMatch) return null;
  const dayOfWeek = DAYNAME.indexOf(dayMatch);

  const ns = Object.keys(ord)
    .filter(word => new RegExp(`\\b${word}\\b`).test(lower))
    .map(word => ord[word]);

  if (!ns.length) return null;
  return [...new Set(ns)].map(n => ({ n, dayOfWeek }));
}

/** '10:00 AM to 12:00 PM' / 'from 3:00 PM' -> { open, close } in 24h */
function parseTimes(text) {
  const re = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/gi;
  const found = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    if (!m[3] && !m[2]) continue; // bare number, likely an ordinal or a date
    found.push({ h: Number(m[1]), min: Number(m[2] || 0), mer: (m[3] || '').toUpperCase() });
  }
  if (!found.length) return null;

  // Infer a missing AM/PM from the following token
  for (let i = 0; i < found.length; i++) {
    if (!found[i].mer && found[i + 1]?.mer) found[i].mer = found[i + 1].mer;
  }

  const to24 = (t) => {
    let h = t.h;
    if (t.mer === 'PM' && h !== 12) h += 12;
    if (t.mer === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2,'0')}:${String(t.min).padStart(2,'0')}`;
  };

  return { open: to24(found[0]), close: found[1] ? to24(found[1]) : null };
}

function nextDateFor(dayOfWeek) {
  const d = new Date(ANCHOR);
  d.setDate(d.getDate() + ((dayOfWeek - d.getDay() + 7) % 7));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ---------------- description ---------------- */

function buildDescription(site) {
  const parts = [];
  if (site.scheduleText) parts.push(site.scheduleText);
  if (site.locationNote) parts.push(site.locationNote);
  if (site.eligibility)  parts.push(`Eligibility: ${site.eligibility}`);
  if (site.seasonalNote) parts.push(`Note: ${site.seasonalNote}`);
  if (site.type)         parts.push(`Distribution type: ${site.type}`);
  if (site.phone)        parts.push(`Call ${site.phone} to confirm before you go. Hours change with holidays and weather.`);
  else                   parts.push('Confirm hours before you go. Schedules change with holidays and weather.');
  parts.push('Source: Feeding San Diego');
  return parts.join(' ');
}

/* ---------------- main ---------------- */

async function main() {
  if (!TOKEN) {
    console.error('Set MAPBOX_TOKEN before running.');
    process.exit(1);
  }

  const src = JSON.parse(readFileSync(IN, 'utf8'));
  const items = [];
  const review = [];
  let failed = 0;

  for (const site of src.sites) {
    let geo = null;
    // Manual coordinate override — pinpoint fixes for sites Mapbox could only
    // place at street/approximate level. When a site carries explicit lat/lng
    // we trust it and skip geocoding entirely.
    if (typeof site.lat === 'number' && typeof site.lng === 'number') {
      geo = {
        lat: site.lat,
        lng: site.lng,
        matched: `${site.address} (manual coords)`,
        relevance: 1,
        accuracy: 'provided',
      };
    } else {
      try {
        geo = await geocode(site.address);
      } catch (err) {
        review.push(`ERROR   ${site.name}: ${err.message}`);
        failed++;
        continue;
      }
    }

    if (!geo) {
      review.push(`NO MATCH ${site.name}  |  ${site.address}`);
      failed++;
      continue;
    }

    const centroid = looksLikeCentroid(geo.lat, geo.lng);
    const flag = centroid ? `SUSPECT (${centroid.name} centroid)`
               : geo.relevance < 0.8 ? `LOW RELEVANCE ${geo.relevance}`
               : 'ok';
    review.push(`${flag.padEnd(30)} ${site.name}\n    input:   ${site.address}\n    matched: ${geo.matched}\n    coords:  ${geo.lat}, ${geo.lng}  [${geo.accuracy}]`);

    const base = {
      kind: 'activity',
      title: site.name,
      description: buildDescription(site),
      locationName: site.name,
      address: site.address,
      lat: geo.lat,
      lng: geo.lng,
      category: 'food-assistance',
    };

    // Weekly standing hours -> ONE doc per time block, carrying all of that
    // block's weekdays as a recurDays set. The app rolls to whichever day is
    // next, so a Mon–Fri site is a single card instead of five.
    if (site.hours?.length) {
      // Merge blocks sharing the same open/close time, unioning their days, so
      // "Tue 9–2 and Thu 9–2" is one card (recur_days "2,4"). Different times
      // stay separate docs (one card per distinct time).
      const byTime = {};
      for (const block of site.hours) {
        const key = `${block.open}|${block.close || ''}`;
        byTime[key] ??= { open: block.open, close: block.close, dows: new Set() };
        for (const dow of parseDays(block.days)) {
          byTime[key].dows.add(dow === 0 ? 7 : dow);      // Dart Mon=1..Sun=7
        }
      }
      for (const t of Object.values(byTime)) {
        const dartDays = [...t.dows].sort((a, b) => a - b);
        items.push({
          ...base,
          slug: `${site.slug}-${t.open.replace(':','')}-${(t.close || '').replace(':','')}`,
          start: `${PAST_ANCHOR}T${t.open}`,
          end:   t.close ? `${PAST_ANCHOR}T${t.close}` : null,
          recurrence: { frequency: 'weekly' },
          recurDays: dartDays.join(','),                  // e.g. "1,2,3,4,5"
        });
      }
      continue;
    }

    // Monthly nth-weekday -> pre-expand
    const nth = parseNthWeekdays(site.scheduleText || '');
    const times = parseTimes(site.scheduleText || '');

    if (nth && times) {
      const firstDate = nextDateFor(nth[0].dayOfWeek);
      items.push({
        ...base,
        slug: site.slug,
        start: `${firstDate}T${times.open}`,
        end:   times.close ? `${firstDate}T${times.close}` : null,
        recurrence: { frequency: 'monthly', count: MONTHS, nthWeekdays: nth },
        // recur_days for the app: "n:weekday" pairs, Dart weekday (Mon=1..Sun=7).
        // "2nd & 4th Tuesday" -> "2:2,4:2" -> one rolling card.
        recurDays: nth.map(p => `${p.n}:${p.dayOfWeek === 0 ? 7 : p.dayOfWeek}`).join(','),
      });
      continue;
    }

    review.push(`UNPARSED SCHEDULE  ${site.name}  |  ${site.scheduleText}`);
    items.push({
      ...base,
      slug: site.slug,
      start: `${nextDateFor(1)}T09:00`,
      _needsManualSchedule: true,
    });
  }

  writeFileSync(OUT, JSON.stringify({
    _generated: new Date().toISOString(),
    _source: src._source,
    _note: 'Generated by prepare-food-data.mjs. Read geocode-review.txt before seeding.',
    items,
  }, null, 2));

  writeFileSync('./geocode-review.txt', review.join('\n\n') + '\n');

  const manual = items.filter(i => i._needsManualSchedule).length;
  const weekly = items.filter(i => i.recurrence?.frequency === 'weekly').length;
  const monthly = items.filter(i => i.recurrence?.frequency === 'monthly').length;

  console.log(`\nwrote ${OUT}`);
  console.log(`  ${items.length} items total`);
  console.log(`  ${weekly} weekly (native recurrence, one rolling doc each)`);
  console.log(`  ${monthly} monthly (native nth-weekday recurrence, one rolling doc per pattern)`);
  console.log(`  ${manual} need a schedule set by hand`);
  console.log(`  ${failed} geocode failures\n`);
  console.log('READ geocode-review.txt. Anything marked SUSPECT or LOW RELEVANCE');
  console.log('is a pin in the wrong place, and a wrong pin sends someone who needs');
  console.log('food to the wrong address.\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
