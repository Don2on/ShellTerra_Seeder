#!/usr/bin/env node
/**
 * expand-vendor-events.mjs — regenerate a food vendor file's `events[]` by
 * expanding the matching *Distribution.json activities' NATIVE recurrence
 * (weekly weekday-set / monthly nth-weekday) into forward-dated occurrences over
 * a rolling window (this week → end of month+3).
 *
 * CaliFood shows a site's distribution dates from the vendor's `events` field, so
 * a vendor whose events are a single past anchor date (the Long Beach bug) shows
 * no upcoming distributions. This rebuilds them looking forward.
 *
 * Matches activities → vendors by `seriesSlug` (== vendor slug). Writes the
 * vendor file in place; re-seed with seed-vendors.mjs to push to Appwrite.
 *
 * USAGE: node expand-vendor-events.mjs --dist ./LongBeachFoodDistribution.json --vendors ./LongBeachFoodVendors.json
 */
import { readFileSync, writeFileSync } from 'node:fs';

const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
const DIST = arg('--dist');
const VEN = arg('--vendors');
if (!DIST || !VEN) { console.error('Required: --dist <file> --vendors <file>'); process.exit(1); }

/* window: today → end of (this month + 3), same as the web food builds */
const now = new Date();
const WS = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const HZ = new Date(now.getFullYear(), now.getMonth() + 4, 0);
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inWin = (d) => d >= WS && d <= HZ;

// Dart Mon=1..Sun=7 -> JS Sun=0..Sat=6
const dartToJs = (n) => (n === 7 ? 0 : n);
function nthWeekdayOfMonth(y, mIdx, n, dartDow) {
  const jsDow = dartToJs(dartDow);
  if (n < 0) { // last
    const last = new Date(y, mIdx + 1, 0);
    const off = (last.getDay() - jsDow + 7) % 7;
    return new Date(y, mIdx, last.getDate() - off);
  }
  const first = new Date(y, mIdx, 1);
  const off = (jsDow - first.getDay() + 7) % 7;
  const day = 1 + off + (n - 1) * 7;
  const d = new Date(y, mIdx, day);
  return d.getMonth() === mIdx ? d : null;
}

// Expand one activity item into in-window YYYY-MM-DD[].
function expandItem(it) {
  const out = [];
  const freq = it.recurrence?.frequency;
  const time = it.start ? String(it.start).slice(11, 16) : '';
  if (freq === 'weekly') {
    const days = String(it.recurDays || '').split(',').filter(Boolean).map(Number); // Dart
    const jsDays = new Set(days.map(dartToJs));
    for (let d = new Date(WS); d <= HZ; d.setDate(d.getDate() + 1)) {
      if (jsDays.has(d.getDay())) out.push(fmt(new Date(d)));
    }
  } else if (freq === 'monthly') {
    const pats = String(it.recurDays || '').split(',').filter(Boolean).map((p) => { const [n, dow] = p.split(':').map(Number); return { n, dow }; });
    for (let k = 0; k < 6; k++) {
      const mo = new Date(WS.getFullYear(), WS.getMonth() + k, 1);
      for (const p of pats) {
        const d = nthWeekdayOfMonth(mo.getFullYear(), mo.getMonth(), p.n, p.dow);
        if (d && inWin(d)) out.push(fmt(d));
      }
    }
  } else {
    // one-off / none: keep its own date if in window
    if (it.start) { const d = new Date(String(it.start).slice(0, 10) + 'T00:00:00'); if (inWin(d)) out.push(fmt(d)); }
  }
  return out.map((date) => ({ date, time, title: it.title || '' }));
}

const dist = JSON.parse(readFileSync(DIST, 'utf8'));
const items = dist.items || [];
const byVendor = new Map(); // seriesSlug -> events[]
for (const it of items) {
  const key = it.seriesSlug || it.slug;
  if (!key) continue;
  const evs = expandItem(it);
  if (!byVendor.has(key)) byVendor.set(key, []);
  byVendor.get(key).push(...evs);
}

const vfile = JSON.parse(readFileSync(VEN, 'utf8'));
let updated = 0, totalEv = 0;
for (const v of (vfile.vendors || [])) {
  const evs = byVendor.get(v.slug);
  if (!evs || !evs.length) continue;
  // dedupe by date+time, sort
  const seen = new Set();
  const clean = evs.filter((e) => { const k = e.date + '|' + e.time; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  v.events = clean;
  v._eventCount = clean.length;
  updated++; totalEv += clean.length;
}
writeFileSync(VEN, JSON.stringify(vfile, null, 2));
console.log(`window ${fmt(WS)} → ${fmt(HZ)}`);
console.log(`updated ${updated} vendors with ${totalEv} forward-dated events. Wrote ${VEN}`);
console.log(`Re-seed: node --env-file=.env seed-vendors.mjs --file ${VEN}`);
