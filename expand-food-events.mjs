#!/usr/bin/env node
/**
 * expand-food-events.mjs — LA + OC free-food fix.
 *
 * OC and LA distribution items carry a recurrence rule (weekly / monthly
 * nth-weekday) but were never flattened into repeating dated occurrences the
 * way San Diego's were. The public food map reads literal event dates and does
 * NOT expand recurrence, so each site showed only its single (now-past) date and
 * dropped out of the date-filtered Activities list.
 *
 * This rewrites each vendor's events[] in {LA,OC}FoodVendors.json by expanding
 * its series' recurrence (looked up from {LA,OC}FoodDistribution.json by
 * seriesSlug) into every occurrence across the current window: start of this
 * week through the end of (current month + 3) — matching SD and the page's
 * "this month + next three" filter. Vendor rows, geocoding, and enrichment are
 * left untouched; only events[] is replaced. Undated / call-ahead vendors (no
 * matching dated series) keep their empty events[].
 *
 * Usage (from shellterra-seeder/):  node expand-food-events.mjs
 * Idempotent — safe to re-run. Everything is git-tracked, so it's reversible.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const REGIONS = [
  { tag: 'LA', dist: './LAFoodDistribution.json', vend: './LAFoodVendors.json' },
  { tag: 'OC', dist: './OCFoodDistribution.json', vend: './OCFoodVendors.json' },
];

// ── window: Monday of this week → last day of (current month + 3) ──
const now = new Date();
const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // back to Monday
const horizon = new Date(now.getFullYear(), now.getMonth() + 4, 0); // last day of month+3
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const WEEK_START = fmt(weekStart);
const HORIZON = fmt(horizon);

// Dart weekday (Mon=1..Sun=7) -> JS getDay() (Sun=0..Sat=6)
const dartToJs = (d) => Number(d) % 7;

// Expand ONE distribution item into an array of {date, time, title, description}.
function expandItem(it) {
  const time = it.start ? String(it.start).slice(11, 16) : '';
  const title = it.title || '';
  const description = it.description || '';
  const rec = it.recurrence;
  const out = [];
  const add = (dateStr) => {
    if (dateStr >= WEEK_START && dateStr <= HORIZON) out.push({ date: dateStr, time, title, description });
  };

  if (rec && rec.frequency === 'weekly') {
    const days = String(it.recurDays || '').split(',').map((s) => s.trim()).filter(Boolean);
    const jsDays = days.length ? days.map(dartToJs) : [new Date(String(it.start).slice(0, 10)).getDay()];
    for (const jd of jsDays) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + ((jd - d.getDay() + 7) % 7)); // first matching weekday >= weekStart
      for (; d <= horizon; d.setDate(d.getDate() + 7)) add(fmt(d));
    }
  } else if (rec && rec.frequency === 'monthly' && Array.isArray(rec.nthWeekdays)) {
    for (const { n, dayOfWeek } of rec.nthWeekdays) {
      const jd = dartToJs(dayOfWeek);
      for (let mo = 0; mo <= 4; mo++) {
        const y = now.getFullYear();
        const first = new Date(y, now.getMonth() + mo, 1);
        const day = 1 + ((jd - first.getDay() + 7) % 7) + (n - 1) * 7;
        const cand = new Date(y, now.getMonth() + mo, day);
        if (cand.getMonth() !== first.getMonth()) continue; // nth weekday doesn't exist this month
        add(fmt(cand));
      }
    }
  } else {
    // No / unknown recurrence: keep the single original date if it's in-window.
    if (it.start) add(String(it.start).slice(0, 10));
  }
  return out;
}

for (const r of REGIONS) {
  const dist = JSON.parse(readFileSync(r.dist, 'utf8'));
  const vendData = JSON.parse(readFileSync(r.vend, 'utf8'));
  const items = dist.items || [];
  const vendors = vendData.vendors || [];

  // seriesSlug -> merged, de-duped occurrences across all its items
  const bySeries = new Map();
  for (const it of items) {
    const key = it.seriesSlug || '';
    if (!key) continue;
    if (!bySeries.has(key)) bySeries.set(key, new Map());
    const seen = bySeries.get(key);
    for (const ev of expandItem(it)) {
      const k = ev.date + '|' + ev.time;
      if (!seen.has(k)) seen.set(k, ev);
    }
  }

  let touched = 0, totalEvents = 0;
  for (const v of vendors) {
    const seen = bySeries.get(v.slug);
    if (!seen) continue; // undated / call-ahead vendor — leave events as-is
    const events = [...seen.values()].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    v.events = events;
    if ('_eventCount' in v) v._eventCount = events.length;
    touched++; totalEvents += events.length;
  }

  writeFileSync(r.vend, JSON.stringify(vendData, null, 2));
  console.log(`✅ ${r.tag}: window ${WEEK_START}..${HORIZON} | vendors updated: ${touched} | total events: ${totalEvents} (avg ${(totalEvents / Math.max(1, touched)).toFixed(1)}/vendor)`);
}
